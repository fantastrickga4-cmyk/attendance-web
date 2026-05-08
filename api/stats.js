import { sql, ensureReady } from "../lib/db.js";
import { requireAdmin } from "../lib/auth.js";

export default async function handler(req, res) {
  try {
    await ensureReady();
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (req.method !== "GET") return res.status(405).end();

    const today = todayStr();
    const monthPrefix = today.slice(0, 7);
    const monthStart = `${monthPrefix}-01`;

    const [{ count: totalEmployees }] = await sql`
      SELECT COUNT(*)::int AS count FROM users WHERE role = 'employee'
    `;
    const [{ count: todayCheckin }] = await sql`
      SELECT COUNT(*)::int AS count FROM records WHERE date = ${today} AND check_in IS NOT NULL
    `;
    const [{ count: todayCheckout }] = await sql`
      SELECT COUNT(*)::int AS count FROM records WHERE date = ${today} AND check_out IS NOT NULL
    `;
    const [{ seconds: monthSeconds }] = await sql`
      SELECT COALESCE(SUM(
        CASE WHEN check_in IS NOT NULL AND check_out IS NOT NULL
          THEN EXTRACT(EPOCH FROM (check_out - check_in))
          ELSE 0 END
      ), 0)::int AS seconds
      FROM records
      WHERE date >= ${monthStart}::date
    `;

    const byUser = await sql`
      SELECT
        u.id,
        u.name,
        COUNT(*) FILTER (WHERE r.check_in IS NOT NULL)::int AS days,
        COUNT(*) FILTER (WHERE r.check_in IS NOT NULL AND r.work_type = 'normal')::int   AS normal_days,
        COUNT(*) FILTER (WHERE r.check_in IS NOT NULL AND r.work_type = 'training')::int AS training_days,
        COUNT(*) FILTER (WHERE r.check_in IS NOT NULL AND r.work_type = 'cover')::int    AS cover_days,
        COALESCE(SUM(
          CASE WHEN r.check_in IS NOT NULL AND r.check_out IS NOT NULL
            THEN EXTRACT(EPOCH FROM (r.check_out - r.check_in))
            ELSE 0 END
        ), 0)::int AS total_seconds
      FROM users u
      LEFT JOIN records r ON r.user_id = u.id AND r.date >= ${monthStart}::date
      WHERE u.role = 'employee'
      GROUP BY u.id, u.name
      ORDER BY u.name ASC
    `;

    // 이번 달 대타 현황: 누가(cover_by) 누구의(cover_for) 대타를 며칠 했는지
    const coverPairs = await sql`
      SELECT
        r.user_id              AS "coverById",
        cb.name                AS "coverByName",
        r.cover_for_user_id    AS "coverForId",
        cf.name                AS "coverForName",
        COUNT(*)::int          AS days
      FROM records r
      JOIN users cb ON cb.id = r.user_id
      LEFT JOIN users cf ON cf.id = r.cover_for_user_id
      WHERE r.work_type = 'cover'
        AND r.date >= ${monthStart}::date
      GROUP BY r.user_id, cb.name, r.cover_for_user_id, cf.name
      ORDER BY days DESC, cb.name ASC
    `;

    // 현재 근무중인 직원 (오늘 출근 ✓, 퇴근 ✗) — 출근 시각 빠른 순
    const workingNow = await sql`
      SELECT
        u.id,
        u.name,
        r.check_in::text AS check_in
      FROM records r
      JOIN users u ON u.id = r.user_id
      WHERE r.date = ${today}
        AND r.check_in IS NOT NULL
        AND r.check_out IS NULL
      ORDER BY r.check_in ASC, u.name ASC
    `;

    res.status(200).json({
      totalEmployees,
      todayCheckin,
      todayCheckout,
      monthSeconds,
      byUser,
      coverPairs,
      workingNow,
      today,
    });
  } catch (err) {
    console.error("stats error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
}

// KST(Asia/Seoul, UTC+9) 기준 — Vercel 함수가 UTC라 직접 변환
function todayStr() {
  const k = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const p = (n) => String(n).padStart(2, "0");
  return `${k.getUTCFullYear()}-${p(k.getUTCMonth() + 1)}-${p(k.getUTCDate())}`;
}
