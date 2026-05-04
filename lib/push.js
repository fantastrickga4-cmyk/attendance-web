import webpush from "web-push";
import { sql } from "./db.js";

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:noreply@example.com";
  if (!pub || !priv) {
    console.warn("[push] VAPID keys not set — push disabled");
    return false;
  }
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export function getPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export async function saveSubscription(userId, sub) {
  if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
    throw new Error("invalid subscription");
  }
  await sql`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (${userId}, ${sub.endpoint}, ${sub.keys.p256dh}, ${sub.keys.auth})
    ON CONFLICT (endpoint) DO UPDATE
      SET user_id = EXCLUDED.user_id,
          p256dh  = EXCLUDED.p256dh,
          auth    = EXCLUDED.auth
  `;
}

export async function removeSubscription(endpoint) {
  if (!endpoint) return;
  await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
}

export async function hasSubscription(userId, endpoint) {
  const rows = await sql`
    SELECT 1 FROM push_subscriptions
    WHERE user_id = ${userId} AND endpoint = ${endpoint}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function sendToAdmins(payload) {
  if (!ensureConfigured()) return;
  const subs = await sql`
    SELECT ps.endpoint, ps.p256dh, ps.auth
    FROM push_subscriptions ps
    JOIN users u ON u.id = ps.user_id
    WHERE u.role = 'admin'
  `;
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);
  const dead = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body
        );
      } catch (err) {
        const code = err && err.statusCode;
        if (code === 404 || code === 410) {
          dead.push(s.endpoint);
        } else {
          console.error("[push] send failed:", code, err && err.body);
        }
      }
    })
  );
  if (dead.length > 0) {
    await sql`DELETE FROM push_subscriptions WHERE endpoint = ANY(${dead})`;
  }
}
