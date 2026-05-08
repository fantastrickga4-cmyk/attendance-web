import { sql, ensureReady } from "../../lib/db.js";
import { requireUser } from "../../lib/auth.js";

export default async function handler(req, res) {
  try {
    await ensureReady();
    const session = await requireUser(req, res);
    if (!session) return;

    if (req.method !== "GET") return res.status(405).end();

    // 직원: 다른 직원 이름만 알면 됨 (대타 대상 선택용). admin과 password_hash·근무시간 등은 제외.
    if (session.role !== "admin") {
      const peers = await sql`
        SELECT u.id, u.name, u.role
        FROM users u
        WHERE u.role = 'employee'
        ORDER BY u.name ASC
      `;
      return res.status(200).json({ users: peers });
    }

    const rows = await sql`
      SELECT
        u.id,
        u.name,
        u.role,
        u.created_at,
        to_char(u.first_check_in_date, 'YYYY-MM-DD') AS first_check_in_date,
        COALESCE(SUM(
          CASE
            WHEN r.check_in IS NOT NULL AND r.check_out IS NOT NULL
            THEN EXTRACT(EPOCH FROM (r.check_out - r.check_in))
            ELSE 0
          END
        ), 0)::int AS total_seconds
      FROM users u
      LEFT JOIN records r ON r.user_id = u.id
      GROUP BY u.id, u.name, u.role, u.created_at, u.first_check_in_date
      ORDER BY u.created_at ASC
    `;
    res.status(200).json({ users: rows });
  } catch (err) {
    console.error("users index error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
}
