-- attendance-web DB schema
-- Run this once in the Neon SQL editor (or psql) after provisioning.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee','admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS records (
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date      DATE NOT NULL,
  check_in  TIME,
  check_out TIME,
  PRIMARY KEY (user_id, date)
);

CREATE INDEX IF NOT EXISTS records_date_idx ON records (date DESC);
