-- attendance-web DB schema
-- Run this once in the Neon SQL editor (or psql) after provisioning.

CREATE TABLE IF NOT EXISTS users (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  password_hash       TEXT NOT NULL,
  role                TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee','admin')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_check_in_date DATE,
  email               TEXT,
  wage_type           TEXT NOT NULL DEFAULT 'hourly' CHECK (wage_type IN ('hourly','daily','monthly')),
  wage_amount         NUMERIC NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS records (
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  check_in          TIME,
  check_out         TIME,
  round_count       INTEGER,
  work_type         TEXT NOT NULL DEFAULT 'normal',
  cover_for_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, date)
);

CREATE INDEX IF NOT EXISTS records_date_idx ON records (date DESC);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         BIGSERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subs_user_idx ON push_subscriptions (user_id);

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
);

CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at DESC);

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
);

CREATE INDEX IF NOT EXISTS record_requests_status_idx ON record_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS record_requests_user_idx ON record_requests (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
  jti          TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip           TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id, created_at DESC);

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
);

CREATE INDEX IF NOT EXISTS payslips_period_idx ON payslips (period_year DESC, period_month DESC);
CREATE INDEX IF NOT EXISTS payslips_user_idx ON payslips (user_id, period_year DESC, period_month DESC);
