import { sql, ensureReady } from "../../lib/db.js";
import { requireAdmin, readBody } from "../../lib/auth.js";
import { logAction, ACTIONS } from "../../lib/audit.js";
import {
  buildMonthlySummary,
  computeNet,
  renderPayslipEmail,
} from "../../lib/payslip.js";
import { sendEmail } from "../../lib/email.js";

export default async function handler(req, res) {
  const action = req.query.action;
  try {
    await ensureReady();
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    if (action === "preview") return await preview(req, res);
    if (action === "list") return await list(req, res);
    if (action === "get") return await getOne(req, res);
    if (action === "upsert") return await upsert(req, res, admin);
    if (action === "delete") return await deleteOne(req, res, admin);
    if (action === "send") return await sendOne(req, res, admin);
    if (action === "send-batch") return await sendBatch(req, res, admin);

    res.status(404).json({ error: "Unknown action" });
  } catch (err) {
    console.error("payslips handler error:", err);
    res.status(500).json({ error: err.message || "서버 오류" });
  }
}

function parsePeriod(req) {
  const year = parseInt(req.query.year, 10);
  const month = parseInt(req.query.month, 10);
  if (!year || !month || month < 1 || month > 12) return null;
  return { year, month };
}

// 자동 계산 + 저장된 명세서 머지 (저장된 게 있으면 그걸 우선)
async function preview(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const period = parsePeriod(req);
  if (!period) return res.status(400).json({ error: "year, month가 필요해요." });

  const calculated = await buildMonthlySummary(period.year, period.month);
  const saved = await sql`
    SELECT *
    FROM payslips
    WHERE period_year = ${period.year} AND period_month = ${period.month}
  `;
  const savedByUser = new Map(saved.map((s) => [s.user_id, s]));

  const items = calculated.map((calc) => {
    const s = savedByUser.get(calc.user_id);
    if (!s) {
      return { ...calc, status: "draft", saved: false };
    }
    return {
      user_id: calc.user_id,
      name: calc.name,
      email: calc.email,
      wage_type: s.wage_type,
      wage_amount: Number(s.wage_amount),
      work_days: s.work_days,
      work_hours: Number(s.work_hours),
      breakdown: s.breakdown || calc.breakdown,
      gross_pay: Number(s.gross_pay),
      deductions: s.deductions || [],
      net_pay: Number(s.net_pay),
      note: s.note || "",
      status: s.status,
      sent_at: s.sent_at,
      sent_to: s.sent_to,
      error_message: s.error_message,
      saved: true,
      // 자동 계산값을 비교용으로 함께 노출 (변동 감지)
      calculated: {
        work_days: calc.work_days,
        work_hours: calc.work_hours,
        gross_pay: calc.gross_pay,
      },
    };
  });

  res.status(200).json({ year: period.year, month: period.month, items });
}

async function list(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const period = parsePeriod(req);
  let rows;
  if (period) {
    rows = await sql`
      SELECT p.*, u.name AS user_name, u.email AS user_email
      FROM payslips p JOIN users u ON u.id = p.user_id
      WHERE p.period_year = ${period.year} AND p.period_month = ${period.month}
      ORDER BY u.name ASC
    `;
  } else {
    rows = await sql`
      SELECT p.*, u.name AS user_name, u.email AS user_email
      FROM payslips p JOIN users u ON u.id = p.user_id
      ORDER BY p.period_year DESC, p.period_month DESC, u.name ASC
    `;
  }
  res.status(200).json({ items: rows });
}

async function getOne(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const id = parseInt(req.query.id, 10);
  if (!id) return res.status(400).json({ error: "id가 필요해요." });
  const rows = await sql`
    SELECT p.*, u.name AS user_name, u.email AS user_email
    FROM payslips p JOIN users u ON u.id = p.user_id
    WHERE p.id = ${id}
  `;
  if (rows.length === 0) return res.status(404).json({ error: "명세서를 찾을 수 없어요." });
  res.status(200).json({ item: rows[0] });
}

async function upsert(req, res, admin) {
  if (req.method !== "POST") return res.status(405).end();
  const body = await readBody(req);
  const {
    user_id,
    period_year,
    period_month,
    wage_type,
    wage_amount,
    work_days,
    work_hours,
    breakdown,
    gross_pay,
    deductions,
    note,
  } = body || {};

  if (!user_id || !period_year || !period_month) {
    return res.status(400).json({ error: "user_id, period_year, period_month가 필요해요." });
  }
  if (!["hourly", "daily", "monthly"].includes(wage_type)) {
    return res.status(400).json({ error: "wage_type이 올바르지 않아요." });
  }

  const userRows = await sql`SELECT id, name FROM users WHERE id = ${user_id}`;
  if (userRows.length === 0) return res.status(404).json({ error: "직원을 찾을 수 없어요." });

  const dedu = Array.isArray(deductions) ? deductions : [];
  const net = computeNet(gross_pay, dedu);

  // 기존 sent 상태는 보존 — admin이 의도적으로 status를 reset 하려면 별도 액션 필요
  const existing = await sql`
    SELECT id, status FROM payslips
    WHERE user_id = ${user_id}
      AND period_year = ${period_year}
      AND period_month = ${period_month}
  `;

  let row;
  if (existing.length === 0) {
    const inserted = await sql`
      INSERT INTO payslips (
        user_id, period_year, period_month,
        wage_type, wage_amount,
        work_days, work_hours, breakdown,
        gross_pay, deductions, net_pay,
        note, status
      ) VALUES (
        ${user_id}, ${period_year}, ${period_month},
        ${wage_type}, ${wage_amount},
        ${work_days || 0}, ${work_hours || 0}, ${JSON.stringify(breakdown || {})},
        ${gross_pay || 0}, ${JSON.stringify(dedu)}, ${net},
        ${note || null}, 'draft'
      )
      RETURNING *
    `;
    row = inserted[0];
  } else {
    const id = existing[0].id;
    // sent 상태에서 편집 시: status는 그대로 두되 내용만 수정 (재발송 가능)
    const updated = await sql`
      UPDATE payslips SET
        wage_type    = ${wage_type},
        wage_amount  = ${wage_amount},
        work_days    = ${work_days || 0},
        work_hours   = ${work_hours || 0},
        breakdown    = ${JSON.stringify(breakdown || {})},
        gross_pay    = ${gross_pay || 0},
        deductions   = ${JSON.stringify(dedu)},
        net_pay      = ${net},
        note         = ${note || null},
        updated_at   = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    row = updated[0];
  }

  await logAction({
    actor: admin,
    action: ACTIONS.PAYSLIP_UPSERT,
    targetUserId: user_id,
    after: { id: row.id, year: period_year, month: period_month, gross: row.gross_pay, net: row.net_pay },
  });

  res.status(200).json({ item: row });
}

async function deleteOne(req, res, admin) {
  if (req.method !== "POST" && req.method !== "DELETE") return res.status(405).end();
  const id = parseInt(req.query.id, 10);
  if (!id) return res.status(400).json({ error: "id가 필요해요." });

  const rows = await sql`SELECT * FROM payslips WHERE id = ${id}`;
  if (rows.length === 0) return res.status(404).json({ error: "명세서를 찾을 수 없어요." });
  const target = rows[0];

  await sql`DELETE FROM payslips WHERE id = ${id}`;
  await logAction({
    actor: admin,
    action: ACTIONS.PAYSLIP_DELETE,
    targetUserId: target.user_id,
    before: { id: target.id, year: target.period_year, month: target.period_month, status: target.status },
  });
  res.status(200).json({ ok: true });
}

async function sendOne(req, res, admin) {
  if (req.method !== "POST") return res.status(405).end();
  const body = await readBody(req);
  const id = parseInt(body.id, 10);
  if (!id) return res.status(400).json({ error: "id가 필요해요." });

  const result = await sendPayslipById(id, admin, { force: !!body.force });
  if (!result.ok) return res.status(400).json({ error: result.error, item: result.item });
  res.status(200).json({ item: result.item });
}

// 해당 월의 draft + failed 일괄 발송 (sent 는 force=true 일 때만)
async function sendBatch(req, res, admin) {
  if (req.method !== "POST") return res.status(405).end();
  const body = await readBody(req);
  const period_year = parseInt(body.period_year, 10);
  const period_month = parseInt(body.period_month, 10);
  if (!period_year || !period_month) {
    return res.status(400).json({ error: "period_year, period_month가 필요해요." });
  }
  const force = !!body.force;
  const ids = Array.isArray(body.ids) ? body.ids.map((x) => parseInt(x, 10)).filter(Boolean) : null;

  let rows;
  if (ids && ids.length) {
    rows = await sql`SELECT id FROM payslips WHERE id = ANY(${ids}) ORDER BY id ASC`;
  } else if (force) {
    rows = await sql`
      SELECT id FROM payslips
      WHERE period_year = ${period_year} AND period_month = ${period_month}
      ORDER BY id ASC
    `;
  } else {
    rows = await sql`
      SELECT id FROM payslips
      WHERE period_year = ${period_year} AND period_month = ${period_month}
        AND status IN ('draft','failed')
      ORDER BY id ASC
    `;
  }

  const results = [];
  for (const r of rows) {
    const result = await sendPayslipById(r.id, admin, { force });
    results.push({
      id: r.id,
      ok: result.ok,
      error: result.ok ? null : result.error,
    });
  }
  const summary = {
    total: results.length,
    success: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
  };
  res.status(200).json({ summary, results });
}

async function sendPayslipById(id, admin, { force }) {
  const rows = await sql`
    SELECT p.*, u.name AS user_name, u.email AS user_email
    FROM payslips p JOIN users u ON u.id = p.user_id
    WHERE p.id = ${id}
  `;
  if (rows.length === 0) return { ok: false, error: "명세서를 찾을 수 없어요." };
  const ps = rows[0];

  if (ps.status === "sent" && !force) {
    return { ok: false, error: "이미 발송된 명세서예요. (재발송하려면 force=true)", item: ps };
  }
  if (!ps.user_email) {
    return { ok: false, error: "직원 이메일이 설정되지 않았어요.", item: ps };
  }

  const html = renderPayslipEmail({
    companyName: process.env.COMPANY_NAME || "FANTASTRICK",
    employeeName: ps.user_name,
    year: ps.period_year,
    month: ps.period_month,
    payslip: {
      wage_type: ps.wage_type,
      work_hours: Number(ps.work_hours),
      gross_pay: Number(ps.gross_pay),
      net_pay: Number(ps.net_pay),
      deductions: ps.deductions || [],
      breakdown: ps.breakdown || {},
      note: ps.note || "",
    },
  });
  const subject = `[${process.env.COMPANY_NAME || "FANTASTRICK"}] ${ps.period_year}년 ${ps.period_month}월 급여명세서`;

  try {
    await sendEmail({ to: ps.user_email, subject, html });
    const updated = await sql`
      UPDATE payslips SET
        status = 'sent',
        sent_at = NOW(),
        sent_to = ${ps.user_email},
        error_message = NULL,
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    await logAction({
      actor: admin,
      action: ACTIONS.PAYSLIP_SEND,
      targetUserId: ps.user_id,
      after: { id, year: ps.period_year, month: ps.period_month, sent_to: ps.user_email },
    });
    return { ok: true, item: updated[0] };
  } catch (err) {
    const errMsg = err.message || "발송 실패";
    await sql`
      UPDATE payslips SET
        status = 'failed',
        error_message = ${errMsg.slice(0, 500)},
        updated_at = NOW()
      WHERE id = ${id}
    `;
    return { ok: false, error: errMsg };
  }
}
