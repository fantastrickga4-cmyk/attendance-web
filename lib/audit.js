import { sql } from "./db.js";

export const ACTIONS = {
  RECORD_CREATE: "record.create",
  RECORD_UPDATE: "record.update",
  RECORD_DELETE: "record.delete",
  RECORD_TAG_CHANGE: "record.tag_change",
  USER_ROLE_CHANGE: "user.role_change",
  USER_DELETE: "user.delete",
  USER_PASSWORD_RESET: "user.password_reset",
  USER_PASSWORD_CHANGE: "user.password_change",
  REQUEST_CREATE: "request.create",
  REQUEST_APPROVE: "request.approve",
  REQUEST_REJECT: "request.reject",
  REQUEST_CANCEL: "request.cancel",
  SESSION_REVOKE: "session.revoke",
  USER_WAGE_UPDATE: "user.wage_update",
  PAYSLIP_UPSERT: "payslip.upsert",
  PAYSLIP_SEND: "payslip.send",
  PAYSLIP_DELETE: "payslip.delete",
};

export async function logAction({
  actor,
  action,
  targetUserId = null,
  targetDate = null,
  before = null,
  after = null,
}) {
  try {
    await sql`
      INSERT INTO audit_log (actor_id, actor_name, action, target_user_id, target_date, before, after)
      VALUES (
        ${actor ? actor.id : null},
        ${actor ? actor.name : null},
        ${action},
        ${targetUserId},
        ${targetDate},
        ${before ? JSON.stringify(before) : null},
        ${after ? JSON.stringify(after) : null}
      )
    `;
  } catch (err) {
    console.error("[audit] log failed:", err);
  }
}

export async function recentAuditLog(limit = 100, offset = 0) {
  return sql`
    SELECT
      a.id,
      a.actor_id,
      a.actor_name,
      a.action,
      a.target_user_id,
      a.target_date,
      a.before,
      a.after,
      a.created_at,
      u.name AS target_user_name
    FROM audit_log a
    LEFT JOIN users u ON u.id = a.target_user_id
    ORDER BY a.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
}
