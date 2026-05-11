import { sql } from "./db.js";

// KST 기준 해당 월의 첫날·마지막날 (YYYY-MM-DD)
export function monthRange(year, month) {
  const m = String(month).padStart(2, "0");
  const first = `${year}-${m}-01`;
  const lastDay = new Date(year, month, 0).getUTCDate();
  const last = `${year}-${m}-${String(lastDay).padStart(2, "0")}`;
  return { first, last };
}

// 직원별 해당 월 근무 집계 + 급여 계산
// users.wage_type 에 따라 hourly / daily / monthly 로 분기.
// monthly 는 records 와 무관하게 wage_amount 고정.
// hourly / daily 는 work_type=normal/training/cover 모두 합산 (1차 정책).
export async function buildMonthlySummary(year, month) {
  const { first, last } = monthRange(year, month);

  const rows = await sql`
    SELECT
      u.id,
      u.name,
      u.email,
      u.wage_type,
      u.wage_amount::float                                                              AS wage_amount,
      COUNT(r.date) FILTER (WHERE r.check_in IS NOT NULL)::int                          AS work_days,
      COUNT(r.date) FILTER (WHERE r.work_type = 'normal'   AND r.check_in IS NOT NULL)::int AS normal_days,
      COUNT(r.date) FILTER (WHERE r.work_type = 'training' AND r.check_in IS NOT NULL)::int AS training_days,
      COUNT(r.date) FILTER (WHERE r.work_type = 'cover'    AND r.check_in IS NOT NULL)::int AS cover_days,
      COALESCE(SUM(
        CASE WHEN r.check_in IS NOT NULL AND r.check_out IS NOT NULL
          THEN EXTRACT(EPOCH FROM (r.check_out - r.check_in))
          ELSE 0
        END
      ), 0)::float AS total_seconds
    FROM users u
    LEFT JOIN records r
      ON r.user_id = u.id
     AND r.date >= ${first}::date
     AND r.date <= ${last}::date
    WHERE u.role = 'employee'
    GROUP BY u.id, u.name, u.email, u.wage_type, u.wage_amount
    ORDER BY u.name ASC
  `;

  return rows.map((r) => {
    const workHours = Number(r.total_seconds || 0) / 3600;
    const gross = computeGross({
      wage_type: r.wage_type,
      wage_amount: Number(r.wage_amount || 0),
      work_days: r.work_days,
      work_hours: workHours,
    });
    return {
      user_id: r.id,
      name: r.name,
      email: r.email || null,
      wage_type: r.wage_type,
      wage_amount: Number(r.wage_amount || 0),
      work_days: r.work_days,
      work_hours: Math.round(workHours * 100) / 100,
      breakdown: {
        normal_days: r.normal_days,
        training_days: r.training_days,
        cover_days: r.cover_days,
      },
      gross_pay: Math.round(gross),
      deductions: [],
      net_pay: Math.round(gross),
    };
  });
}

export function computeGross({ wage_type, wage_amount, work_days, work_hours }) {
  const amt = Number(wage_amount || 0);
  if (wage_type === "hourly") return Number(work_hours || 0) * amt;
  if (wage_type === "daily") return Number(work_days || 0) * amt;
  if (wage_type === "monthly") return amt;
  return 0;
}

export function computeNet(gross, deductions) {
  const total = (deductions || []).reduce((s, d) => s + Number(d.amount || 0), 0);
  return Math.max(0, Math.round(Number(gross || 0) - total));
}

// HTML 이메일 본문 — Resend 발송용
export function renderPayslipEmail({ companyName, employeeName, year, month, payslip }) {
  const fmt = (n) => Number(n || 0).toLocaleString("ko-KR");
  const wageLabel = WAGE_TYPE_LABELS[payslip.wage_type] || payslip.wage_type;
  const breakdown = payslip.breakdown || {};

  const deductionRows = (payslip.deductions || [])
    .map(
      (d) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;">${escape(d.label)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;color:#c00;">- ${fmt(d.amount)}원</td>
        </tr>`
    )
    .join("");

  const breakdownLine =
    payslip.wage_type === "monthly"
      ? `<p style="margin:6px 0;color:#666;">월급제</p>`
      : `<p style="margin:6px 0;color:#666;">
          정상 ${breakdown.normal_days || 0}일 · 교육 ${breakdown.training_days || 0}일 · 대타 ${breakdown.cover_days || 0}일
          ${payslip.wage_type === "hourly" ? ` · 총 ${payslip.work_hours}시간` : ""}
        </p>`;

  const noteBlock = payslip.note
    ? `<div style="margin-top:24px;padding:12px 16px;background:#f8f8f8;border-left:3px solid #999;color:#444;font-size:13px;">
        <strong>메모</strong><br/>${escape(payslip.note).replace(/\n/g, "<br/>")}
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${escape(companyName)} 급여명세서</title>
</head>
<body style="margin:0;padding:24px;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#222;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
    <div style="padding:24px 24px 16px;border-bottom:1px solid #eee;">
      <div style="color:#999;font-size:12px;letter-spacing:1px;text-transform:uppercase;">${escape(companyName)}</div>
      <h1 style="margin:8px 0 0;font-size:22px;font-weight:600;">${year}년 ${month}월 급여명세서</h1>
    </div>

    <div style="padding:20px 24px 8px;">
      <p style="margin:0 0 4px;color:#888;font-size:13px;">받는 분</p>
      <p style="margin:0;font-size:16px;font-weight:500;">${escape(employeeName)}</p>
    </div>

    <div style="padding:16px 24px;">
      <p style="margin:8px 0 4px;color:#888;font-size:13px;">근무 내역</p>
      ${breakdownLine}
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:8px;">
      <thead>
        <tr>
          <th style="padding:10px 12px;background:#fafafa;color:#888;font-weight:500;font-size:12px;text-align:left;border-bottom:1px solid #eee;">항목</th>
          <th style="padding:10px 12px;background:#fafafa;color:#888;font-weight:500;font-size:12px;text-align:right;border-bottom:1px solid #eee;">금액</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;">
            기본급 <span style="color:#999;font-size:12px;">(${wageLabel})</span>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;">${fmt(payslip.gross_pay)}원</td>
        </tr>
        ${deductionRows}
        <tr>
          <td style="padding:14px 12px;background:#f8f9fb;font-weight:600;">실지급액</td>
          <td style="padding:14px 12px;background:#f8f9fb;font-weight:700;text-align:right;font-size:18px;color:#0066cc;">${fmt(payslip.net_pay)}원</td>
        </tr>
      </tbody>
    </table>

    <div style="padding:0 24px 24px;">
      ${noteBlock}
      <p style="margin:24px 0 0;color:#aaa;font-size:12px;line-height:1.6;">
        이 메일은 자동 발송되었습니다. 문의는 관리자에게 연락 주세요.
      </p>
    </div>
  </div>
</body>
</html>`;
}

const WAGE_TYPE_LABELS = {
  hourly: "시급",
  daily: "일당",
  monthly: "월급",
};

function escape(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
