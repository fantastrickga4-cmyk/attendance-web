import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.warn("DATABASE_URL is not set — DB calls will fail until configured.");
}

export const sql = url ? neon(url) : null;

let initPromise = null;

export function ensureReady() {
  if (!sql) throw new Error("DATABASE_URL not configured");
  if (!initPromise) initPromise = bootstrap();
  return initPromise;
}

async function bootstrap() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee','admin')),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS records (
      user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date      DATE NOT NULL,
      check_in  TIME,
      check_out TIME,
      PRIMARY KEY (user_id, date)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS records_date_idx ON records (date DESC)`;

  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'`;
  if (count === 0) {
    const hash = await bcrypt.hash("admin1234", 10);
    await sql`
      INSERT INTO users (id, name, password_hash, role)
      VALUES ('admin', '관리자', ${hash}, 'admin')
      ON CONFLICT (id) DO NOTHING
    `;
  }
}
