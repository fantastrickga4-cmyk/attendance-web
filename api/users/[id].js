import crypto from "node:crypto";
import { sql, ensureReady } from "../../lib/db.js";
import {
  requireAdmin,
  requireUser,
  readBody,
  clearSession,
  hashPassword,
  verifyPassword,
} from "../../lib/auth.js";
import { logAction, ACTIONS } from "../../lib/audit.js";

const TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generateTempPassword(length = 8) {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += TEMP_PASSWORD_ALPHABET[bytes[i] % TEMP_PASSWORD_ALPHABET.length];
  }
  return out;
}

export default async function handler(req, res) {
  try {
    await ensureReady();
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id가 필요해요." });

    if (id === "me") return await handleSelf(req, res);
    return await handleAdmin(req, res, id);
  } catch (err) {
    console.error("users [id] error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
}

async function handleSelf(req, res) {
  const session = await requireUser(req, res);
  if (!session) return;

  if (req.method !== "PATCH") return res.status(405).end();

  const { currentPassword, newPassword } = await readBody(req);
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "현재 비밀번호와 새 비밀번호를 모두 입력해주세요." });
  }
  if (newPassword.length < 4) {
    return res.status(400).json({ error: "새 비밀번호는 4자 이상이어야 해요." });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: "새 비밀번호는 현재 비밀번호와 달라야 해요." });
  }

  const rows = await sql`SELECT password_hash FROM users WHERE id = ${session.id}`;
  if (rows.length === 0) return res.status(404).json({ error: "사용자를 찾을 수 없어요." });

  const ok = await verifyPassword(currentPassword, rows[0].password_hash);
  if (!ok) return res.status(401).json({ error: "현재 비밀번호가 일치하지 않아요." });

  const hash = await hashPassword(newPassword);
  await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${session.id}`;

  await logAction({
    actor: session,
    action: ACTIONS.USER_PASSWORD_CHANGE,
    targetUserId: session.id,
  });

  res.status(200).json({ ok: true });
}

async function handleAdmin(req, res, id) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const rows = await sql`SELECT id, name, role FROM users WHERE id = ${id}`;
  const target = rows[0];
  if (!target) return res.status(404).json({ error: "사용자를 찾을 수 없어요." });

  if (req.method === "DELETE") {
    if (admin.id === id) {
      return res.status(400).json({ error: "자기 자신은 삭제할 수 없어요." });
    }
    if (target.role === "admin") {
      const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'`;
      if (count <= 1) {
        return res.status(400).json({ error: "마지막 관리자는 삭제할 수 없어요." });
      }
    }
    await sql`DELETE FROM users WHERE id = ${id}`;
    await logAction({
      actor: admin,
      action: ACTIONS.USER_DELETE,
      targetUserId: id,
      before: { id: target.id, name: target.name, role: target.role },
    });
    return res.status(200).json({ ok: true });
  }

  if (req.method === "PATCH") {
    const { role } = await readBody(req);
    if (role !== "admin" && role !== "employee") {
      return res.status(400).json({ error: "role 값이 올바르지 않아요." });
    }
    if (target.role === "admin" && role === "employee") {
      const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'`;
      if (count <= 1) {
        return res.status(400).json({ error: "마지막 관리자는 강등할 수 없어요." });
      }
    }
    await sql`UPDATE users SET role = ${role} WHERE id = ${id}`;
    const demotedSelf = admin.id === id && role === "employee";
    if (demotedSelf) await clearSession(req, res);
    if (target.role !== role) {
      await logAction({
        actor: admin,
        action: ACTIONS.USER_ROLE_CHANGE,
        targetUserId: id,
        before: { role: target.role },
        after: { role },
      });
    }
    return res.status(200).json({ ok: true, demotedSelf });
  }

  if (req.method === "POST") {
    const action = (req.query.action || "").toLowerCase();
    if (action !== "reset-password") {
      return res.status(400).json({ error: "지원하지 않는 액션이에요." });
    }
    const tempPassword = generateTempPassword(8);
    const hash = await hashPassword(tempPassword);
    await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${id}`;
    await logAction({
      actor: admin,
      action: ACTIONS.USER_PASSWORD_RESET,
      targetUserId: id,
    });
    return res.status(200).json({ ok: true, tempPassword });
  }

  res.status(405).end();
}
