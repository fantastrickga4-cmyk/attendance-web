import { ensureReady } from "../lib/db.js";
import { requireAdmin } from "../lib/auth.js";
import { recentAuditLog } from "../lib/audit.js";

export default async function handler(req, res) {
  try {
    await ensureReady();
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    if (req.method !== "GET") return res.status(405).end();

    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const rows = await recentAuditLog(limit, offset);
    res.status(200).json({ entries: rows });
  } catch (err) {
    console.error("audit error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
}
