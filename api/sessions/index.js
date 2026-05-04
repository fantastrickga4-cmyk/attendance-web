import { sql, ensureReady } from "../../lib/db.js";
import { requireUser } from "../../lib/auth.js";

export default async function handler(req, res) {
  try {
    await ensureReady();
    const session = await requireUser(req, res);
    if (!session) return;

    if (req.method !== "GET") return res.status(405).end();

    const isAdmin = session.role === "admin";
    const filterUser = isAdmin ? null : session.id;

    const rows = await sql`
      SELECT
        s.jti,
        s.user_id    AS "userId",
        u.name       AS "userName",
        u.role       AS "userRole",
        s.ip,
        s.user_agent AS "userAgent",
        s.created_at AS "createdAt",
        s.last_seen_at AS "lastSeenAt"
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE (${filterUser}::text IS NULL OR s.user_id = ${filterUser})
        AND s.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY s.last_seen_at DESC
      LIMIT 200
    `;

    res.status(200).json({
      sessions: rows.map((s) => ({
        ...s,
        current: s.jti === session.jti,
      })),
    });
  } catch (err) {
    console.error("sessions list error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
}
