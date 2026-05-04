import { ensureReady } from "../../lib/db.js";
import { readSession, requireUser, readBody } from "../../lib/auth.js";
import {
  getPublicKey,
  saveSubscription,
  removeSubscription,
  hasSubscription,
} from "../../lib/push.js";

export default async function handler(req, res) {
  const action = req.query.action;
  try {
    await ensureReady();

    if (action === "vapid-key") return await vapidKey(req, res);
    if (action === "subscribe") return await subscribe(req, res);
    if (action === "unsubscribe") return await unsubscribe(req, res);
    if (action === "status") return await status(req, res);

    res.status(404).json({ error: "Unknown action" });
  } catch (err) {
    console.error("push handler error:", err);
    res.status(500).json({ error: "서버 오류가 발생했어요." });
  }
}

async function vapidKey(req, res) {
  const key = getPublicKey();
  if (!key) return res.status(503).json({ error: "푸시 알림이 설정되지 않았어요." });
  res.status(200).json({ publicKey: key });
}

async function subscribe(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await requireUser(req, res);
  if (!session) return;
  const body = await readBody(req);
  try {
    await saveSubscription(session.id, body && body.subscription);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  res.status(200).json({ ok: true });
}

async function unsubscribe(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await readSession(req);
  if (!session) return res.status(401).json({ error: "로그인이 필요해요." });
  const body = await readBody(req);
  const endpoint = body && body.endpoint;
  if (!endpoint) return res.status(400).json({ error: "endpoint가 필요해요." });
  await removeSubscription(endpoint);
  res.status(200).json({ ok: true });
}

async function status(req, res) {
  const session = await readSession(req);
  if (!session) return res.status(200).json({ subscribed: false });
  const endpoint = req.query.endpoint;
  if (!endpoint) return res.status(200).json({ subscribed: false });
  const subscribed = await hasSubscription(session.id, endpoint);
  res.status(200).json({ subscribed });
}
