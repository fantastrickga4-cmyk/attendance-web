import { sql, ensureReady } from "../../lib/db.js";
import { sendToAdmins } from "../../lib/push.js";

export default async function handler(req, res) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers["authorization"];
    if (auth !== `Bearer ${expected}`) {
      return res.status(401).json({ error: "unauthorized" });
    }
  }

  try {
    await ensureReady();

    const today = todayInKST();
    const rows = await sql`
      SELECT r.user_id, u.name, r.check_in::text AS check_in
      FROM records r
      JOIN users u ON u.id = r.user_id
      WHERE r.date = ${today}
        AND r.check_in IS NOT NULL
        AND r.check_out IS NULL
      ORDER BY u.name ASC
    `;

    if (rows.length > 0) {
      const names = rows.map((r) => `${r.name}(${r.check_in.slice(0, 5)})`).join(", ");
      await sendToAdmins({
        title: "⚠️ 미퇴근 알림",
        body: `오늘 퇴근을 안 찍은 직원 ${rows.length}명: ${names}`,
        tag: `auto-checkout-${today}`,
        url: "/",
      });
    }

    res.status(200).json({
      ok: true,
      date: today,
      pendingCount: rows.length,
      pending: rows.map((r) => ({ id: r.user_id, name: r.name, checkIn: r.check_in })),
    });
  } catch (err) {
    console.error("cron auto-checkout error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
}

function todayInKST() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}`;
}
function pad(n) { return String(n).padStart(2, "0"); }
