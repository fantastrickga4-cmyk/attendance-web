import crypto from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { sql } from "./db.js";

const COOKIE_NAME = "session";
const SEVEN_DAYS_SEC = 60 * 60 * 24 * 7;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set (32+ chars)");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function isSecureContext() {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) return xff.split(",")[0].trim();
  return req.headers["x-real-ip"] || (req.socket && req.socket.remoteAddress) || "";
}

function clientUA(req) {
  return (req.headers["user-agent"] || "").slice(0, 500);
}

function newJti() {
  return crypto.randomBytes(16).toString("hex");
}

function setSessionCookie(res, token) {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    `Max-Age=${SEVEN_DAYS_SEC}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (isSecureContext()) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export async function issueSession(req, res, user) {
  const jti = newJti();
  const token = await new SignJWT({ id: user.id, name: user.name, role: user.role, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  await sql`
    INSERT INTO sessions (jti, user_id, ip, user_agent)
    VALUES (${jti}, ${user.id}, ${clientIp(req)}, ${clientUA(req)})
  `;

  await sql`
    DELETE FROM sessions
    WHERE user_id = ${user.id} AND created_at < NOW() - INTERVAL '7 days'
  `;

  setSessionCookie(res, token);
}

export async function clearSession(req, res) {
  const session = await readSession(req, { skipTouch: true });
  if (session && session.jti) {
    await sql`DELETE FROM sessions WHERE jti = ${session.jti}`;
  }
  const parts = [`${COOKIE_NAME}=`, "Path=/", "Max-Age=0", "HttpOnly", "SameSite=Lax"];
  if (isSecureContext()) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export async function readSession(req, opts = {}) {
  const raw = req.headers.cookie || "";
  const match = raw.split(";").map((p) => p.trim()).find((p) => p.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const token = match.slice(COOKIE_NAME.length + 1);
  if (!token) return null;
  let payload;
  try {
    const verified = await jwtVerify(token, getSecret());
    payload = verified.payload;
  } catch {
    return null;
  }
  if (!payload.jti) return null;

  const rows = await sql`SELECT user_id FROM sessions WHERE jti = ${payload.jti}`;
  if (rows.length === 0) return null;

  if (!opts.skipTouch) {
    sql`UPDATE sessions SET last_seen_at = NOW() WHERE jti = ${payload.jti}`.catch(() => {});
  }

  return { id: payload.id, name: payload.name, role: payload.role, jti: payload.jti };
}

export async function requireUser(req, res) {
  const session = await readSession(req);
  if (!session) {
    res.status(401).json({ error: "로그인이 필요해요." });
    return null;
  }
  return session;
}

export async function requireAdmin(req, res) {
  const session = await requireUser(req, res);
  if (!session) return null;
  if (session.role !== "admin") {
    res.status(403).json({ error: "관리자만 접근할 수 있어요." });
    return null;
  }
  return session;
}

export async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return await new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); }
    });
  });
}
