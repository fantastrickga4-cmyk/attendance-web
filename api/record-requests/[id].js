import { sql, ensureReady } from "../../lib/db.js";
import { requireUser, readBody } from "../../lib/auth.js";
import { logAction, ACTIONS } from "../../lib/audit.js";

export default async function handler(req, res) {
  try {
    await ensureReady();
    const session = await requireUser(req, res);
    if (!session) return;

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id가 필요해요." });

    const rows = await sql`SELECT * FROM record_requests WHERE id = ${id}`;
    const reqRow = rows[0];
    if (!reqRow) return res.status(404).json({ error: "신청을 찾을 수 없어요." });

    if (req.method === "PATCH") return decide(req, res, session, reqRow);
    if (req.method === "DELETE") return cancel(req, res, session, reqRow);
    res.status(405).end();
  } catch (err) {
    console.error("record-requests [id] error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
}

async function decide(req, res, session, reqRow) {
  if (session.role !== "admin") {
    return res.status(403).json({ error: "관리자만 처리할 수 있어요." });
  }
  if (reqRow.status !== "pending") {
    return res.status(409).json({ error: "이미 처리된 신청입니다." });
  }

  const { decision, comment } = await readBody(req);
  if (decision !== "approve" && decision !== "reject") {
    return res.status(400).json({ error: "decision 값은 approve 또는 reject 여야 합니다." });
  }

  const targetUserId = reqRow.user_id;
  const targetDate = formatDate(reqRow.target_date);
  const reqIn = reqRow.requested_check_in ? String(reqRow.requested_check_in) : null;
  const reqOut = reqRow.requested_check_out ? String(reqRow.requested_check_out) : null;

  if (decision === "approve") {
    const existing = await sql`
      SELECT check_in::text AS "checkIn", check_out::text AS "checkOut"
      FROM records WHERE user_id = ${targetUserId} AND date = ${targetDate}
    `;
    const before = existing[0] || null;

    const newIn = reqIn || (before && before.checkIn) || null;
    const newOut = reqOut || (before && before.checkOut) || null;

    if (existing.length > 0) {
      await sql`
        UPDATE records
        SET check_in = ${newIn}, check_out = ${newOut}
        WHERE user_id = ${targetUserId} AND date = ${targetDate}
      `;
    } else {
      await sql`
        INSERT INTO records (user_id, date, check_in, check_out)
        VALUES (${targetUserId}, ${targetDate}, ${newIn}, ${newOut})
      `;
    }

    if (newIn) {
      await sql`
        UPDATE users
        SET first_check_in_date = LEAST(COALESCE(first_check_in_date, ${targetDate}::date), ${targetDate}::date)
        WHERE id = ${targetUserId}
      `;
    }

    await sql`
      UPDATE record_requests
      SET status = 'approved',
          reviewer_id = ${session.id},
          reviewer_name = ${session.name},
          reviewer_comment = ${(comment || "").trim() || null},
          reviewed_at = now()
      WHERE id = ${reqRow.id}
    `;

    await logAction({
      actor: session,
      action: ACTIONS.REQUEST_APPROVE,
      targetUserId,
      targetDate,
      before: before || null,
      after: { checkIn: newIn, checkOut: newOut },
    });

    return res.status(200).json({ ok: true });
  }

  // reject
  await sql`
    UPDATE record_requests
    SET status = 'rejected',
        reviewer_id = ${session.id},
        reviewer_name = ${session.name},
        reviewer_comment = ${(comment || "").trim() || null},
        reviewed_at = now()
    WHERE id = ${reqRow.id}
  `;

  await logAction({
    actor: session,
    action: ACTIONS.REQUEST_REJECT,
    targetUserId,
    targetDate,
    after: { reason: (comment || "").trim() || null },
  });

  res.status(200).json({ ok: true });
}

async function cancel(req, res, session, reqRow) {
  if (reqRow.user_id !== session.id) {
    return res.status(403).json({ error: "본인 신청만 취소할 수 있어요." });
  }
  if (reqRow.status !== "pending") {
    return res.status(409).json({ error: "이미 처리된 신청입니다." });
  }
  await sql`UPDATE record_requests SET status = 'cancelled' WHERE id = ${reqRow.id}`;

  await logAction({
    actor: session,
    action: ACTIONS.REQUEST_CANCEL,
    targetUserId: session.id,
    targetDate: formatDate(reqRow.target_date),
  });

  res.status(200).json({ ok: true });
}

function formatDate(d) {
  if (!d) return null;
  if (typeof d === "string") return d.slice(0, 10);
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
