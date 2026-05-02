import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

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

export async function issueSession(res, user) {
  const token = await new SignJWT({ id: user.id, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  const cookie = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    `Max-Age=${SEVEN_DAYS_SEC}`,
    "HttpOnly",
    "SameSite=Lax",
    "Secure",
  ].join("; ");
  res.setHeader("Set-Cookie", cookie);
}

export function clearSession(res) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure`
  );
}

export async function readSession(req) {
  const raw = req.headers.cookie || "";
  const match = raw.split(";").map((p) => p.trim()).find((p) => p.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const token = match.slice(COOKIE_NAME.length + 1);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { id: payload.id, name: payload.name, role: payload.role };
  } catch {
    return null;
  }
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
