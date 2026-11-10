-- One row per Shadow install (a "device"). The token itself is never stored, only its hash.
CREATE TABLE devices (
  id TEXT PRIMARY KEY,               -- short, readable "Shadow ID" like K7Q2-9MPX
  token_hash TEXT NOT NULL UNIQUE,
  machine TEXT UNIQUE,               -- hashed Windows MachineGuid: a reinstall gets the same device back
  balance INTEGER NOT NULL DEFAULT 0,
  email TEXT,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER
);

-- Every change to a balance, so purchases and grants can always be traced.
CREATE TABLE ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,              -- free | answer | listen | grant | purchase | refund
  note TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX ledger_device ON ledger (device_id, created_at);

-- One user action (a solve, a follow-up, a live answer). The main model, the backup and the
-- screenshot reader may all be called for it, but it is charged once.
CREATE TABLE actions (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0,
  charged INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- What every upstream call really cost: the numbers that decide pricing.
CREATE TABLE usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  action_id TEXT,
  kind TEXT NOT NULL,                -- solve | debug | followup | live | classify | listen
  provider TEXT NOT NULL,
  model TEXT,
  status INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  minutes INTEGER,
  cost_micro_usd INTEGER NOT NULL DEFAULT 0,
  ms INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX usage_device ON usage (device_id, created_at);
CREATE INDEX usage_created ON usage (created_at);

CREATE TABLE listen_sessions (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  last_tick_at INTEGER NOT NULL,
  minutes INTEGER NOT NULL DEFAULT 0,
  ended INTEGER NOT NULL DEFAULT 0
);

-- Spend per UTC day, for the daily safety cap.
CREATE TABLE daily (
  day TEXT PRIMARY KEY,
  cost_micro_usd INTEGER NOT NULL DEFAULT 0,
  registrations INTEGER NOT NULL DEFAULT 0
);

-- New free devices per IP per day, so reinstall-farming is slow.
CREATE TABLE ip_days (
  ip TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip, day)
);
