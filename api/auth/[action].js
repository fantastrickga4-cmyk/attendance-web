import { sql, ensureReady } from "../../lib/db.js";
import {
  hashPassword,
  verifyPassword,
  issueSession,
  clearSession,
  readSession,
  readBody,
} from "../../lib/auth.js";
import { sendToAdmins } from "../../lib/push.js";
import { isMobileUA } from "../../lib/device.js";

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
    if (action === "round-count") return await saveRoundCount(req, res);

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
  if (id === "me") {
    return res.status(400).json({ error: "사용할 수 없는 아이디예요." });
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
  if (user.role !== "admin" && isMobileUA(req)) {
    return res.status(403).json({
      error: "직원은 모바일에서 로그인할 수 없습니다. PC에서 접속해주세요.",
    });
  }
  await issueSession(req, res, user);
  res.status(200).json({ user: { id: user.id, name: user.name, role: user.role } });
}

async function logout(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  await clearSession(req, res);
  res.status(200).json({ ok: true });
}

async function checkAction(req, res, kind) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await readSession(req);
  if (!session) return res.status(401).json({ error: "로그인이 필요해요." });

  if (session.role !== "admin" && isMobileUA(req)) {
    return res.status(403).json({
      error: "직원은 모바일에서 출/퇴근을 찍을 수 없습니다. PC에서 진행해주세요.",
    });
  }

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
    await sql`
      UPDATE users
      SET first_check_in_date = LEAST(COALESCE(first_check_in_date, ${today}::date), ${today}::date)
      WHERE id = ${session.id}
    `;
    notifyAdmins(session, today, now, "in");
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
  notifyAdmins(session, today, now, "out");
  res.status(200).json({ ok: true, time: now });
}

async function saveRoundCount(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await readSession(req);
  if (!session) return res.status(401).json({ error: "로그인이 필요해요." });

  const { count } = await readBody(req);
  let normalized;
  if (count === null || count === undefined || count === "") {
    normalized = null;
  } else {
    const n = Number(count);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      return res.status(400).json({ error: "회차는 0 이상의 정수만 입력할 수 있어요." });
    }
    normalized = n;
  }

  const today = todayInTZ();
  const existing = await sql`
    SELECT 1 FROM records WHERE user_id = ${session.id} AND date = ${today}
  `;
  if (existing.length === 0) {
    return res.status(404).json({ error: "오늘 출퇴근 기록이 없어요." });
  }
  await sql`
    UPDATE records SET round_count = ${normalized}
    WHERE user_id = ${session.id} AND date = ${today}
  `;
  res.status(200).json({ ok: true });
}

function notifyAdmins(session, date, time, kind) {
  const isIn = kind === "in";
  const payload = {
    title: isIn ? "🟢 출근" : "🔴 퇴근",
    body: `${session.name}(${session.id}) — ${time}`,
    tag: `att-${session.id}-${date}-${kind}`,
    url: "/",
  };
  Promise.resolve(sendToAdmins(payload)).catch((err) =>
    console.error("[push] notify failed:", err)
  );
}

// KST(Asia/Seoul, UTC+9) 기준 — Vercel 함수는 UTC로 동작하므로 직접 변환.
function nowKST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}
function todayInTZ() {
  const k = nowKST();
  return `${k.getUTCFullYear()}-${pad(k.getUTCMonth() + 1)}-${pad(k.getUTCDate())}`;
}
function nowTimeInTZ() {
  const k = nowKST();
  return `${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())}:${pad(k.getUTCSeconds())}`;
}
function pad(n) { return String(n).padStart(2, "0"); }
