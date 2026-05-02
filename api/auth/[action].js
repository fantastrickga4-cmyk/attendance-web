import { sql, ensureReady } from "../../lib/db.js";
import {
  hashPassword,
  verifyPassword,
  issueSession,
  clearSession,
  readSession,
  readBody,
} from "../../lib/auth.js";

export default async function handler(req, res) {
  const action = req.query.action;
  try {
    await ensureReady();

    if (action === "me") return await me(req, res);
    if (action === "login") return await login(req, res);
    if (action === "logout") return await logout(req, res);
    if (action === "signup") return await signup(req, res);
    if (action === "checkin") return await checkAction(req, res, "in");
    if (action === "checkout") return await checkAction(req, res, "out");

    res.status(404).json({ error: "Unknown action" });
  } catch (err) {
    console.error("auth handler error:", err);
    res.status(500).json({ error: "서버 오류가 발생했어요." });
  }
}

async function me(req, res) {
  const session = await readSession(req);
  if (!session) return res.status(401).json({ error: "Not signed in" });
  const rows = await sql`SELECT id, name, role FROM users WHERE id = ${session.id}`;
  if (rows.length === 0) return res.status(401).json({ error: "Not signed in" });
  res.status(200).json({ user: rows[0] });
}

async function signup(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { id, name, password } = await readBody(req);
  if (!id || !name || !password || password.length < 4) {
    return res.status(400).json({ error: "모든 칸을 채워주세요. 비밀번호는 4자 이상이에요." });
  }
  const existing = await sql`SELECT id FROM users WHERE id = ${id}`;
  if (existing.length > 0) {
    return res.status(409).json({ error: "이미 사용 중인 아이디예요." });
  }
  const hash = await hashPassword(password);
  await sql`
    INSERT INTO users (id, name, password_hash, role)
    VALUES (${id}, ${name}, ${hash}, 'employee')
  `;
  res.status(201).json({ ok: true });
}

async function login(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { id, password } = await readBody(req);
  if (!id || !password) {
    return res.status(400).json({ error: "아이디와 비밀번호를 입력해주세요." });
  }
  const rows = await sql`SELECT id, name, role, password_hash FROM users WHERE id = ${id}`;
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: "아이디 또는 비밀번호가 틀렸어요." });
  }
  await issueSession(res, user);
  res.status(200).json({ user: { id: user.id, name: user.name, role: user.role } });
}

async function logout(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  clearSession(res);
  res.status(200).json({ ok: true });
}

async function checkAction(req, res, kind) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await readSession(req);
  if (!session) return res.status(401).json({ error: "로그인이 필요해요." });

  const today = todayInTZ();
  const now = nowTimeInTZ();

  if (kind === "in") {
    const existing = await sql`
      SELECT check_in FROM records WHERE user_id = ${session.id} AND date = ${today}
    `;
    if (existing[0]?.check_in) {
      return res.status(409).json({ error: `이미 ${existing[0].check_in}에 출근을 찍었어요.` });
    }
    await sql`
      INSERT INTO records (user_id, date, check_in)
      VALUES (${session.id}, ${today}, ${now})
      ON CONFLICT (user_id, date) DO UPDATE SET check_in = EXCLUDED.check_in
    `;
    return res.status(200).json({ ok: true, time: now });
  }

  // checkout
  const existing = await sql`
    SELECT check_in, check_out FROM records WHERE user_id = ${session.id} AND date = ${today}
  `;
  const row = existing[0];
  if (!row || !row.check_in) {
    return res.status(400).json({ error: "오늘 출근 기록이 없어요. 먼저 출근을 찍어주세요." });
  }
  if (row.check_out) {
    return res.status(409).json({ error: `이미 ${row.check_out}에 퇴근을 찍었어요.` });
  }
  await sql`
    UPDATE records SET check_out = ${now}
    WHERE user_id = ${session.id} AND date = ${today}
  `;
  res.status(200).json({ ok: true, time: now });
}

function todayInTZ() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function nowTimeInTZ() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function pad(n) { return String(n).padStart(2, "0"); }
