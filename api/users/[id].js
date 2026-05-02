import { sql, ensureReady } from "../../lib/db.js";
import { requireAdmin, readBody, clearSession } from "../../lib/auth.js";

export default async function handler(req, res) {
  try {
    await ensureReady();
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id가 필요해요." });

    const rows = await sql`SELECT id, role FROM users WHERE id = ${id}`;
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
      if (demotedSelf) clearSession(res);
      return res.status(200).json({ ok: true, demotedSelf });
    }

    res.status(405).end();
  } catch (err) {
    console.error("users [id] error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
}
