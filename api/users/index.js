import { sql, ensureReady } from "../../lib/db.js";
import { requireAdmin } from "../../lib/auth.js";

export default async function handler(req, res) {
  try {
    await ensureReady();
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    if (req.method !== "GET") return res.status(405).end();

    const rows = await sql`
      SELECT
        u.id,
        u.name,
        u.role,
        u.created_at,
        COALESCE(SUM(
          CASE
            WHEN r.check_in IS NOT NULL AND r.check_out IS NOT NULL
            THEN EXTRACT(EPOCH FROM (r.check_out - r.check_in))
            ELSE 0
          END
        ), 0)::int AS total_seconds
      FROM users u
      LEFT JOIN records r ON r.user_id = u.id
      GROUP BY u.id, u.name, u.role, u.created_at
      ORDER BY u.created_at ASC
    `;
    res.status(200).json({ users: rows });
  } catch (err) {
    console.error("users index error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
}
