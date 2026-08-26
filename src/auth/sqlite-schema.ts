export const SQLITE_AUTH_DDL = `
  CREATE TABLE IF NOT EXISTS kyro_users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    tenant_id TEXT,
    email_verified INTEGER DEFAULT 0,
    locked INTEGER DEFAULT 0,
    last_login TEXT,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TEXT,
    avatar TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS kyro_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES kyro_users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS kyro_password_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES kyro_users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS kyro_rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL,
    window_start INTEGER NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    UNIQUE(key, window_start)
  );

  CREATE TABLE IF NOT EXISTS kyro_lockouts (
    user_id TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt INTEGER,
    locked_at INTEGER,
    locked_until INTEGER
  );

  CREATE TABLE IF NOT EXISTS kyro_audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    action TEXT NOT NULL,
    user_id TEXT,
    user_email TEXT,
    role TEXT,
    resource TEXT NOT NULL,
    resource_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    success INTEGER NOT NULL,
    error TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_kyro_users_email ON kyro_users(email);
  CREATE INDEX IF NOT EXISTS idx_kyro_sessions_user_id ON kyro_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_kyro_sessions_token ON kyro_sessions(token);
  CREATE INDEX IF NOT EXISTS idx_kyro_sessions_refresh_token ON kyro_sessions(refresh_token);
  CREATE INDEX IF NOT EXISTS idx_kyro_sessions_expires ON kyro_sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_kyro_password_history_user_id ON kyro_password_history(user_id);
  CREATE INDEX IF NOT EXISTS idx_kyro_rate_limits_key ON kyro_rate_limits(key);
  CREATE INDEX IF NOT EXISTS idx_kyro_rate_limits_window ON kyro_rate_limits(window_start);
  CREATE INDEX IF NOT EXISTS idx_kyro_lockouts_locked_until ON kyro_lockouts(locked_until);
  CREATE INDEX IF NOT EXISTS idx_kyro_audit_logs_timestamp ON kyro_audit_logs(timestamp);
  CREATE INDEX IF NOT EXISTS idx_kyro_audit_logs_action ON kyro_audit_logs(action);
  CREATE INDEX IF NOT EXISTS idx_kyro_audit_logs_user_id ON kyro_audit_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_kyro_audit_logs_resource ON kyro_audit_logs(resource);

  CREATE TABLE IF NOT EXISTS kyro_email_verifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES kyro_users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS kyro_password_resets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES kyro_users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_kyro_email_verifications_token ON kyro_email_verifications(token);
  CREATE INDEX IF NOT EXISTS idx_kyro_password_resets_token ON kyro_password_resets(token);
`;
