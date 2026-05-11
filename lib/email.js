// Resend 발송 래퍼. RESEND_API_KEY 미설정 시 503 에러로 throw.

let resendClient = null;

async function getClient() {
  if (resendClient) return resendClient;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    const err = new Error("이메일 발송이 설정되지 않았어요. (RESEND_API_KEY 누락)");
    err.code = "EMAIL_NOT_CONFIGURED";
    throw err;
  }
  const { Resend } = await import("resend");
  resendClient = new Resend(key);
  return resendClient;
}

export function defaultFromAddress() {
  const explicit = process.env.PAYSLIP_FROM_EMAIL;
  if (explicit) return explicit;
  // 도메인 미인증 시 Resend 기본
  const company = process.env.COMPANY_NAME || "FANTASTRICK";
  return `${company} <onboarding@resend.dev>`;
}

export async function sendEmail({ to, subject, html, from }) {
  if (!to) throw new Error("받는 사람 이메일이 없어요.");
  const client = await getClient();
  const fromAddr = from || defaultFromAddress();

  const { data, error } = await client.emails.send({
    from: fromAddr,
    to: [to],
    subject,
    html,
  });

  if (error) {
    const err = new Error(error.message || "이메일 발송 실패");
    err.code = error.name || "SEND_FAILED";
    err.original = error;
    throw err;
  }
  return { id: data && data.id };
}
