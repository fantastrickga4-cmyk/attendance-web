import { sql, ensureReady } from "../../lib/db.js";
import { requireUser, requireAdmin, readBody } from "../../lib/auth.js";

export default async function handler(req, res) {
  try {
    await ensureReady();

    if (req.method === "GET") return await list(req, res);
    if (req.method === "POST") return await create(req, res);
    if (req.method === "PATCH") return await update(req, res);
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
      r.check_out::text AS "checkOut"
    FROM records r
    JOIN users u ON u.id = r.user_id
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
  const { userId, date, checkIn, checkOut } = await readBody(req);
  if (!userId || !date) return res.status(400).json({ error: "직원과 날짜는 필수예요." });
  if (checkIn && checkOut && checkOut <= checkIn) {
    return res.status(400).json({ error: "퇴근 시간은 출근 시간보다 뒤여야 해요." });
  }
  const dup = await sql`SELECT 1 FROM records WHERE user_id = ${userId} AND date = ${date}`;
  if (dup.length > 0) {
    return res.status(409).json({ error: "같은 직원의 같은 날짜 기록이 이미 있어요." });
  }
  await sql`
    INSERT INTO records (user_id, date, check_in, check_out)
    VALUES (${userId}, ${date}, ${checkIn || null}, ${checkOut || null})
  `;
  res.status(201).json({ ok: true });
}

async function update(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { userId, date } = req.query;
  const { checkIn, checkOut } = await readBody(req);
  if (!userId || !date) return res.status(400).json({ error: "userId와 date가 필요해요." });
  if (checkIn && checkOut && checkOut <= checkIn) {
    return res.status(400).json({ error: "퇴근 시간은 출근 시간보다 뒤여야 해요." });
  }
  const result = await sql`
    UPDATE records SET check_in = ${checkIn || null}, check_out = ${checkOut || null}
    WHERE user_id = ${userId} AND date = ${date}
  `;
  res.status(200).json({ ok: true });
}

async function remove(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { userId, date } = req.query;
  if (!userId || !date) return res.status(400).json({ error: "userId와 date가 필요해요." });
  await sql`DELETE FROM records WHERE user_id = ${userId} AND date = ${date}`;
  res.status(200).json({ ok: true });
}
