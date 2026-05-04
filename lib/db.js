import bcrypt from "bcryptjs";

let dbReadyPromise = null;
let sqlImpl = null;

async function initDb() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    sqlImpl = neon(url);
    console.log("[db] using Neon Postgres");
  } else {
    console.warn("[db] DATABASE_URL not set — falling back to local PGlite at ./.pglite");
    const { PGlite } = await import("@electric-sql/pglite");
    const db = new PGlite(".pglite");
    sqlImpl = async (strings, ...values) => {
      let query = "";
      const params = [];
      strings.forEach((s, i) => {
        query += s;
        if (i < values.length) {
          params.push(values[i]);
          query += `$${params.length}`;
        }
      });
      const result = await db.query(query, params);
      return result.rows;
    };
  }
  await bootstrap();
}

async function bootstrap() {
  await sqlImpl`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee','admin')),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sqlImpl`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_check_in_date DATE`;
  await sqlImpl`
    CREATE TABLE IF NOT EXISTS records (
      user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date      DATE NOT NULL,
      check_in  TIME,
      check_out TIME,
      PRIMARY KEY (user_id, date)
    )
  `;
  await sqlImpl`CREATE INDEX IF NOT EXISTS records_date_idx ON records (date DESC)`;
  await sqlImpl`ALTER TABLE records ADD COLUMN IF NOT EXISTS round_count INTEGER`;

  await sqlImpl`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id         BIGSERIAL PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint   TEXT NOT NULL UNIQUE,
      p256dh     TEXT NOT NULL,
      auth       TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sqlImpl`CREATE INDEX IF NOT EXISTS push_subs_user_idx ON push_subscriptions (user_id)`;

  await sqlImpl`
    CREATE TABLE IF NOT EXISTS audit_log (
      id             BIGSERIAL PRIMARY KEY,
      actor_id       TEXT,
      actor_name     TEXT,
      action         TEXT NOT NULL,
      target_user_id TEXT,
      target_date    DATE,
      before         JSONB,
      after          JSONB,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sqlImpl`CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at DESC)`;

  await sqlImpl`
    CREATE TABLE IF NOT EXISTS record_requests (
      id                  BIGSERIAL PRIMARY KEY,
      user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_date         DATE NOT NULL,
      requested_check_in  TIME,
      requested_check_out TIME,
      reason              TEXT NOT NULL,
      status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
      reviewer_id         TEXT,
      reviewer_name       TEXT,
      reviewer_comment    TEXT,
      reviewed_at         TIMESTAMPTZ,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sqlImpl`CREATE INDEX IF NOT EXISTS record_requests_status_idx ON record_requests (status, created_at DESC)`;
  await sqlImpl`CREATE INDEX IF NOT EXISTS record_requests_user_idx ON record_requests (user_id, created_at DESC)`;

  await sqlImpl`
    CREATE TABLE IF NOT EXISTS sessions (
      jti          TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ip           TEXT,
      user_agent   TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sqlImpl`CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id, created_at DESC)`;

  // 기존 직원의 first_check_in_date 백필 (NULL인 경우만)
  await sqlImpl`
    UPDATE users u
    SET first_check_in_date = sub.first_date
    FROM (
      SELECT user_id, MIN(date) AS first_date
      FROM records
      WHERE check_in IS NOT NULL
      GROUP BY user_id
    ) sub
    WHERE u.id = sub.user_id AND u.first_check_in_date IS NULL
  `;

  const rows = await sqlImpl`SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'`;
  if (rows[0].count === 0) {
    const hash = await bcrypt.hash("admin1234", 10);
    await sqlImpl`
      INSERT INTO users (id, name, password_hash, role)
      VALUES ('admin', '관리자', ${hash}, 'admin')
      ON CONFLICT (id) DO NOTHING
    `;
    console.log("[db] seeded default admin (admin / admin1234)");
  }
}

export function ensureReady() {
  if (!dbReadyPromise) dbReadyPromise = initDb();
  return dbReadyPromise;
}

export async function sql(strings, ...values) {
  await ensureReady();
  return sqlImpl(strings, ...values);
}
