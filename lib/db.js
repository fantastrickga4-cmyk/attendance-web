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
  // 급여명세서용 컬럼
  await sqlImpl`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`;
  await sqlImpl`ALTER TABLE users ADD COLUMN IF NOT EXISTS wage_type TEXT NOT NULL DEFAULT 'hourly'`;
  await sqlImpl`ALTER TABLE users ADD COLUMN IF NOT EXISTS wage_amount NUMERIC NOT NULL DEFAULT 0`;
  try {
    await sqlImpl`
      ALTER TABLE users
      ADD CONSTRAINT users_wage_type_check
      CHECK (wage_type IN ('hourly','daily','monthly'))
    `;
  } catch (err) {
    if (!String(err.message || "").includes("already exists")) throw err;
  }
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
  await sqlImpl`ALTER TABLE records ADD COLUMN IF NOT EXISTS work_type TEXT NOT NULL DEFAULT 'normal'`;
  await sqlImpl`ALTER TABLE records ADD COLUMN IF NOT EXISTS cover_for_user_id TEXT`;
  // cover FK: 대타 대상 직원이 삭제되면 NULL로 (대타 친 사람의 기록은 보존)
  try {
    await sqlImpl`
      ALTER TABLE records
      ADD CONSTRAINT records_cover_for_fk
      FOREIGN KEY (cover_for_user_id) REFERENCES users(id) ON DELETE SET NULL
    `;
  } catch (err) {
    if (!String(err.message || "").includes("already exists")) throw err;
  }

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

  await sqlImpl`
    CREATE TABLE IF NOT EXISTS payslips (
      id              BIGSERIAL PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      period_year     INTEGER NOT NULL,
      period_month    INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
      wage_type       TEXT NOT NULL,
      wage_amount     NUMERIC NOT NULL,
      work_days       INTEGER NOT NULL DEFAULT 0,
      work_hours      NUMERIC NOT NULL DEFAULT 0,
      breakdown       JSONB NOT NULL DEFAULT '{}'::jsonb,
      gross_pay       NUMERIC NOT NULL DEFAULT 0,
      deductions      JSONB NOT NULL DEFAULT '[]'::jsonb,
      net_pay         NUMERIC NOT NULL DEFAULT 0,
      note            TEXT,
      status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','failed')),
      sent_at         TIMESTAMPTZ,
      sent_to         TEXT,
      error_message   TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (user_id, period_year, period_month)
    )
  `;
  await sqlImpl`CREATE INDEX IF NOT EXISTS payslips_period_idx ON payslips (period_year DESC, period_month DESC)`;
  await sqlImpl`CREATE INDEX IF NOT EXISTS payslips_user_idx ON payslips (user_id, period_year DESC, period_month DESC)`;

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
