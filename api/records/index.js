import { sql, ensureReady } from "../../lib/db.js";
import { requireUser, requireAdmin, readBody } from "../../lib/auth.js";
import { logAction, ACTIONS } from "../../lib/audit.js";

const WORK_TYPES = ["normal", "training", "cover"];

export default async function handler(req, res) {
  try {
    await ensureReady();

    if (req.method === "GET") return await list(req, res);
    if (req.method === "POST") return await create(req, res);
    if (req.method === "PATCH") {
      if (req.query.action === "self-tag") return await selfTag(req, res);
      return await update(req, res);
    }
    if (req.method === "DELETE") return await remove(req, res);
    res.status(405).end();
  } catch (err) {
    console.error("records error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
}

async function list(req, res) {
  const session = await requireUser(req, res);
  if (!session) return;

  const { userId, from, to } = req.query;
  const isAdmin = session.role === "admin";
  const filterUser = isAdmin ? (userId || null) : session.id;

  const rows = await sql`
    SELECT
      r.user_id  AS "userId",
      u.name     AS name,
      to_char(r.date, 'YYYY-MM-DD') AS date,
      r.check_in::text  AS "checkIn",
      r.check_out::text AS "checkOut",
      r.round_count     AS "roundCount",
      r.work_type       AS "workType",
      r.cover_for_user_id AS "coverForUserId",
      cu.name             AS "coverForUserName"
    FROM records r
    JOIN users u ON u.id = r.user_id
    LEFT JOIN users cu ON cu.id = r.cover_for_user_id
    WHERE
      (${filterUser}::text IS NULL OR r.user_id = ${filterUser})
      AND (${from || null}::date IS NULL OR r.date >= ${from || null}::date)
      AND (${to || null}::date IS NULL OR r.date <= ${to || null}::date)
    ORDER BY r.date DESC, r.user_id ASC
  `;
  res.status(200).json({ records: rows });
}

async function create(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const body = await readBody(req);
  const { userId, date, checkIn, checkOut, roundCount } = body;
  if (!userId || !date) return res.status(400).json({ error: "직원과 날짜는 필수예요." });
  if (checkIn && checkOut && checkOut <= checkIn) {
    return res.status(400).json({ error: "퇴근 시간은 출근 시간보다 뒤여야 해요." });
  }
  const round = normalizeRoundCount(roundCount);
  if (round === false) {
    return res.status(400).json({ error: "회차는 0 이상의 정수만 입력할 수 있어요." });
  }
  const tag = await normalizeWorkType(body, userId);
  if (tag.error) return res.status(400).json({ error: tag.error });

  const dup = await sql`SELECT 1 FROM records WHERE user_id = ${userId} AND date = ${date}`;
  if (dup.length > 0) {
    return res.status(409).json({ error: "같은 직원의 같은 날짜 기록이 이미 있어요." });
  }
  await sql`
    INSERT INTO records (user_id, date, check_in, check_out, round_count, work_type, cover_for_user_id)
    VALUES (${userId}, ${date}, ${checkIn || null}, ${checkOut || null}, ${round}, ${tag.workType}, ${tag.coverForUserId})
  `;
  if (checkIn) {
    await sql`
      UPDATE users
      SET first_check_in_date = LEAST(COALESCE(first_check_in_date, ${date}::date), ${date}::date)
      WHERE id = ${userId}
    `;
  }
  await logAction({
    actor: admin,
    action: ACTIONS.RECORD_CREATE,
    targetUserId: userId,
    targetDate: date,
    after: {
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      roundCount: round,
      workType: tag.workType,
      coverForUserId: tag.coverForUserId,
    },
  });
  res.status(201).json({ ok: true });
}

async function update(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { userId, date } = req.query;
  const body = await readBody(req);
  const { checkIn, checkOut, roundCount } = body;
  if (!userId || !date) return res.status(400).json({ error: "userId와 date가 필요해요." });
  if (checkIn && checkOut && checkOut <= checkIn) {
    return res.status(400).json({ error: "퇴근 시간은 출근 시간보다 뒤여야 해요." });
  }
  const round = normalizeRoundCount(roundCount);
  if (round === false) {
    return res.status(400).json({ error: "회차는 0 이상의 정수만 입력할 수 있어요." });
  }
  const tag = await normalizeWorkType(body, userId);
  if (tag.error) return res.status(400).json({ error: tag.error });

  const prev = await sql`
    SELECT
      check_in::text AS "checkIn",
      check_out::text AS "checkOut",
      round_count AS "roundCount",
      work_type AS "workType",
      cover_for_user_id AS "coverForUserId"
    FROM records WHERE user_id = ${userId} AND date = ${date}
  `;
  await sql`
    UPDATE records SET
      check_in = ${checkIn || null},
      check_out = ${checkOut || null},
      round_count = ${round},
      work_type = ${tag.workType},
      cover_for_user_id = ${tag.coverForUserId}
    WHERE user_id = ${userId} AND date = ${date}
  `;
  if (checkIn) {
    await sql`
      UPDATE users
      SET first_check_in_date = LEAST(COALESCE(first_check_in_date, ${date}::date), ${date}::date)
      WHERE id = ${userId}
    `;
  }
  await logAction({
    actor: admin,
    action: ACTIONS.RECORD_UPDATE,
    targetUserId: userId,
    targetDate: date,
    before: prev[0] || null,
    after: {
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      roundCount: round,
      workType: tag.workType,
      coverForUserId: tag.coverForUserId,
    },
  });
  res.status(200).json({ ok: true });
}

async function selfTag(req, res) {
  const session = await requireUser(req, res);
  if (!session) return;
  const { userId, date } = req.query;
  if (!userId || !date) return res.status(400).json({ error: "userId와 date가 필요해요." });
  if (userId !== session.id) {
    return res.status(403).json({ error: "본인 기록만 변경할 수 있어요." });
  }
  if (!isThisMonthKST(date)) {
    return res.status(403).json({ error: "이번 달 이전 기록은 '수정 신청'을 통해 변경해주세요." });
  }
  const body = await readBody(req);
  const tag = await normalizeWorkType(body, session.id);
  if (tag.error) return res.status(400).json({ error: tag.error });

  const prev = await sql`
    SELECT work_type AS "workType", cover_for_user_id AS "coverForUserId"
    FROM records WHERE user_id = ${session.id} AND date = ${date}
  `;
  if (prev.length === 0) {
    return res.status(404).json({ error: "해당 날짜의 출퇴근 기록이 없어요." });
  }
  await sql`
    UPDATE records
    SET work_type = ${tag.workType}, cover_for_user_id = ${tag.coverForUserId}
    WHERE user_id = ${session.id} AND date = ${date}
  `;
  await logAction({
    actor: session,
    action: ACTIONS.RECORD_TAG_CHANGE,
    targetUserId: session.id,
    targetDate: date,
    before: prev[0],
    after: { workType: tag.workType, coverForUserId: tag.coverForUserId },
  });
  res.status(200).json({ ok: true });
}

function normalizeRoundCount(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return false;
  return n;
}

async function normalizeWorkType(body, ownerUserId) {
  const raw = body.workType;
  // 호출 측이 workType 자체를 보내지 않으면 변경 의도 없음 → 'normal' 기본값 처리
  const workType = raw == null || raw === "" ? "normal" : String(raw);
  if (!WORK_TYPES.includes(workType)) {
    return { error: "잘못된 근무 유형입니다." };
  }
  if (workType !== "cover") return { workType, coverForUserId: null };

  const coverForUserId = body.coverForUserId ? String(body.coverForUserId) : "";
  if (!coverForUserId) return { error: "대타 대상 직원을 선택해주세요." };
  if (ownerUserId && coverForUserId === ownerUserId) {
    return { error: "본인의 대타로 지정할 수 없어요." };
  }
  const exists = await sql`SELECT 1 FROM users WHERE id = ${coverForUserId}`;
  if (exists.length === 0) return { error: "선택한 직원을 찾을 수 없어요." };
  return { workType, coverForUserId };
}

function isThisMonthKST(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const k = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const ym = `${k.getUTCFullYear()}-${String(k.getUTCMonth() + 1).padStart(2, "0")}`;
  return dateStr.startsWith(ym);
}

async function remove(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { userId, date } = req.query;
  if (!userId || !date) return res.status(400).json({ error: "userId와 date가 필요해요." });
  const prev = await sql`
    SELECT check_in::text AS "checkIn", check_out::text AS "checkOut"
    FROM records WHERE user_id = ${userId} AND date = ${date}
  `;
  await sql`DELETE FROM records WHERE user_id = ${userId} AND date = ${date}`;
  await logAction({
    actor: admin,
    action: ACTIONS.RECORD_DELETE,
    targetUserId: userId,
    targetDate: date,
    before: prev[0] || null,
  });
  res.status(200).json({ ok: true });
}
