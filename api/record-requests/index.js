import { sql, ensureReady } from "../../lib/db.js";
import { requireUser, readBody } from "../../lib/auth.js";
import { logAction, ACTIONS } from "../../lib/audit.js";
import { sendToAdmins } from "../../lib/push.js";

export default async function handler(req, res) {
  try {
    await ensureReady();
    const session = await requireUser(req, res);
    if (!session) return;

    if (req.method === "GET") return list(req, res, session);
    if (req.method === "POST") return create(req, res, session);
    res.status(405).end();
  } catch (err) {
    console.error("record-requests error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
}

async function list(req, res, session) {
  const isAdmin = session.role === "admin";
  const status = req.query.status || null;
  const filterUser = isAdmin ? (req.query.userId || null) : session.id;

  const rows = await sql`
    SELECT
      rr.id,
      rr.user_id          AS "userId",
      u.name              AS "userName",
      to_char(rr.target_date, 'YYYY-MM-DD') AS "targetDate",
      rr.requested_check_in::text  AS "requestedCheckIn",
      rr.requested_check_out::text AS "requestedCheckOut",
      rr.reason,
      rr.status,
      rr.reviewer_id      AS "reviewerId",
      rr.reviewer_name    AS "reviewerName",
      rr.reviewer_comment AS "reviewerComment",
      rr.reviewed_at      AS "reviewedAt",
      rr.created_at       AS "createdAt",
      r.check_in::text    AS "currentCheckIn",
      r.check_out::text   AS "currentCheckOut"
    FROM record_requests rr
    JOIN users u ON u.id = rr.user_id
    LEFT JOIN records r ON r.user_id = rr.user_id AND r.date = rr.target_date
    WHERE
      (${filterUser}::text IS NULL OR rr.user_id = ${filterUser})
      AND (${status}::text IS NULL OR rr.status = ${status})
    ORDER BY rr.created_at DESC
    LIMIT 200
  `;
  res.status(200).json({ requests: rows });
}

async function create(req, res, session) {
  const { targetDate, requestedCheckIn, requestedCheckOut, reason } = await readBody(req);
  if (!targetDate || !reason) {
    return res.status(400).json({ error: "날짜와 사유는 필수입니다." });
  }
  if (reason.trim().length < 2) {
    return res.status(400).json({ error: "사유를 좀 더 구체적으로 입력해주세요." });
  }
  if (!requestedCheckIn && !requestedCheckOut) {
    return res.status(400).json({ error: "출근 또는 퇴근 시간 중 최소 하나는 입력해주세요." });
  }
  if (
    requestedCheckIn &&
    requestedCheckOut &&
    requestedCheckOut <= requestedCheckIn
  ) {
    return res.status(400).json({ error: "퇴근 시간은 출근 시간보다 뒤여야 합니다." });
  }

  const dup = await sql`
    SELECT 1 FROM record_requests
    WHERE user_id = ${session.id}
      AND target_date = ${targetDate}
      AND status = 'pending'
    LIMIT 1
  `;
  if (dup.length > 0) {
    return res.status(409).json({ error: "해당 날짜에 이미 검토 중인 신청이 있습니다." });
  }

  const inserted = await sql`
    INSERT INTO record_requests (user_id, target_date, requested_check_in, requested_check_out, reason)
    VALUES (
      ${session.id},
      ${targetDate},
      ${requestedCheckIn || null},
      ${requestedCheckOut || null},
      ${reason.trim()}
    )
    RETURNING id
  `;
  const id = inserted[0]?.id;

  await logAction({
    actor: session,
    action: ACTIONS.REQUEST_CREATE,
    targetUserId: session.id,
    targetDate,
    after: {
      requestedCheckIn: requestedCheckIn || null,
      requestedCheckOut: requestedCheckOut || null,
      reason: reason.trim(),
    },
  });

  sendToAdmins({
    title: "📝 기록 수정 신청",
    body: `${session.name}(${session.id}) — ${targetDate}: ${reason.trim().slice(0, 60)}`,
    tag: `req-${id}`,
    url: "/",
  }).catch((err) => console.error("[push] request notify failed:", err));

  res.status(201).json({ ok: true, id });
}
