import { sql, ensureReady } from "../../lib/db.js";
import { requireUser } from "../../lib/auth.js";
import { logAction, ACTIONS } from "../../lib/audit.js";

export default async function handler(req, res) {
  try {
    await ensureReady();
    const session = await requireUser(req, res);
    if (!session) return;

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id가 필요해요." });

    if (req.method !== "DELETE") return res.status(405).end();

    const rows = await sql`SELECT jti, user_id FROM sessions WHERE jti = ${id}`;
    const target = rows[0];
    if (!target) return res.status(404).json({ error: "세션을 찾을 수 없어요." });

    const isAdmin = session.role === "admin";
    const isOwn = target.user_id === session.id;
    if (!isAdmin && !isOwn) {
      return res.status(403).json({ error: "본인 세션 또는 관리자만 종료할 수 있어요." });
    }

    await sql`DELETE FROM sessions WHERE jti = ${id}`;

    if (isAdmin && !isOwn) {
      await logAction({
        actor: session,
        action: ACTIONS.SESSION_REVOKE,
        targetUserId: target.user_id,
      });
    }

    res.status(200).json({ ok: true, revokedSelf: target.jti === session.jti });
  } catch (err) {
    console.error("sessions revoke error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
}
