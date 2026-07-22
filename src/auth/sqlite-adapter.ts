import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { mkdirSync } from "fs";
import { dirname } from "path";
import { createRequire } from "module";
const _require = createRequire(import.meta.url);
const modPath = "node:" + "sqlite";
const { DatabaseSync } = _require(modPath) as typeof import("node:sqlite");
import type { AuthAdapter, AuthUser, Session, UserRole } from "./types.js";
import type { AuditLog, AuditLogFilter } from "./security/audit-log.js";

export interface SQLiteAuthAdapterOptions {
  path?: string;
  db?: any;
  saltRounds?: number;
  busyTimeout?: number;
  walAutoCheckpoint?: number;
  cacheSize?: number;
  mmapSize?: number;
}

const DEFAULT_BUSY_TIMEOUT = 5000;
const DEFAULT_WAL_CHECKPOINT = 1000;
const DEFAULT_CACHE_SIZE = -64000;
const DEFAULT_MMAP_SIZE = 268435456;

export class SQLiteAuthAdapter implements AuthAdapter {
  private db: any = null;
  private path: string;
  private saltRounds: number;
  private externalDb: boolean;
  private busyTimeout: number;
  private walAutoCheckpoint: number;
  private cacheSize: number;
  private mmapSize: number;

  private preparedStatements: Map<string, any> = new Map();

  constructor(options: SQLiteAuthAdapterOptions = {}) {
    this.path = options.path || "./data/auth.db";
    this.saltRounds = options.saltRounds || 12;
    this.externalDb = !!options.db;
    this.busyTimeout = options.busyTimeout ?? DEFAULT_BUSY_TIMEOUT;
    this.walAutoCheckpoint =
      options.walAutoCheckpoint ?? DEFAULT_WAL_CHECKPOINT;
    this.cacheSize = options.cacheSize ?? DEFAULT_CACHE_SIZE;
    this.mmapSize = options.mmapSize ?? DEFAULT_MMAP_SIZE;

    if (options.db) {
      this.db = options.db;
    }
  }

  async connect(): Promise<void> {
    if (this.db) return;

    const dir = dirname(this.path);
    if (dir && dir !== ".") {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new DatabaseSync(this.path);
    this.db.exec(`PRAGMA busy_timeout = ${this.busyTimeout}`);

    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA synchronous = NORMAL");
    this.db.exec("PRAGMA cache_size = " + this.cacheSize);
    this.db.exec("PRAGMA mmap_size = " + this.mmapSize);
    this.db.exec("PRAGMA wal_autocheckpoint = " + this.walAutoCheckpoint);
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec("PRAGMA temp_store = MEMORY");

    this.ensureTables();
    this.prepareStatements();
  }

  async disconnect(): Promise<void> {
    if (this.db && !this.externalDb) {
      this.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
      this.db.close();
      this.db = null;
      this.preparedStatements.clear();
    }
  }

  private async ensureConnected(): Promise<any> {
    if (!this.db) {
      await this.connect();
    }
    if (!this.db) {
      throw new Error("Failed to connect to SQLite database");
    }
    return this.db;
  }

  private ensureTables(): void {
    if (!this.db) return;

    this.db.exec(`
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
    `);

    try {
      this.db.exec(`ALTER TABLE kyro_users ADD COLUMN name TEXT`);
    } catch {
      // Column already exists, ignore
    }

    try {
      this.db.exec(`ALTER TABLE kyro_users ADD COLUMN avatar TEXT`);
    } catch {
      // Column already exists, ignore
    }
  }

  private prepareStatements(): void {
    if (!this.db) return;

    this.preparedStatements.set(
      "findUserByEmail",
      this.db.prepare("SELECT * FROM kyro_users WHERE email = ?"),
    );
    this.preparedStatements.set(
      "findUserById",
      this.db.prepare("SELECT * FROM kyro_users WHERE id = ?"),
    );
    this.preparedStatements.set(
      "findSessionByToken",
      this.db.prepare("SELECT * FROM kyro_sessions WHERE token = ?"),
    );
    this.preparedStatements.set(
      "findSessionByRefreshToken",
      this.db.prepare("SELECT * FROM kyro_sessions WHERE refresh_token = ?"),
    );
    this.preparedStatements.set(
      "deleteSession",
      this.db.prepare("DELETE FROM kyro_sessions WHERE id = ? OR token = ?"),
    );
    this.preparedStatements.set(
      "deleteUserSessions",
      this.db.prepare("DELETE FROM kyro_sessions WHERE user_id = ?"),
    );
    this.preparedStatements.set(
      "countUsers",
      this.db.prepare("SELECT COUNT(*) as count FROM kyro_users"),
    );
    this.preparedStatements.set(
      "deleteUser",
      this.db.prepare("DELETE FROM kyro_users WHERE id = ?"),
    );
    this.preparedStatements.set(
      "findUsersPaginated",
      this.db.prepare(
        "SELECT * FROM kyro_users ORDER BY created_at DESC LIMIT ? OFFSET ?",
      ),
    );
    this.preparedStatements.set(
      "findUsersWithSearch",
      this.db.prepare(
        "SELECT * FROM kyro_users WHERE email LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
      ),
    );
    this.preparedStatements.set(
      "countUsersWithSearch",
      this.db.prepare(
        "SELECT COUNT(*) as count FROM kyro_users WHERE email LIKE ?",
      ),
    );
    this.preparedStatements.set(
      "getPasswordHistory",
      this.db.prepare(
        "SELECT password_hash FROM kyro_password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
      ),
    );
    this.preparedStatements.set(
      "addPasswordHistory",
      this.db.prepare(
        "INSERT INTO kyro_password_history (user_id, password_hash, created_at) VALUES (?, ?, ?)",
      ),
    );
    this.preparedStatements.set(
      "trimPasswordHistory",
      this.db.prepare(
        `DELETE FROM kyro_password_history WHERE id IN (
          SELECT id FROM kyro_password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT -1 OFFSET 5
        )`,
      ),
    );
    this.preparedStatements.set(
      "deleteExpiredSessions",
      this.db.prepare("DELETE FROM kyro_sessions WHERE expires_at < ?"),
    );
    this.preparedStatements.set(
      "cleanupOldAuditLogs",
      this.db.prepare("DELETE FROM kyro_audit_logs WHERE timestamp < ?"),
    );
    this.preparedStatements.set(
      "cleanupExpiredLockouts",
      this.db.prepare(
        "UPDATE kyro_lockouts SET attempts = 0, locked_at = NULL, locked_until = NULL WHERE locked_until < ?",
      ),
    );
    this.preparedStatements.set(
      "getLockout",
      this.db.prepare("SELECT * FROM kyro_lockouts WHERE user_id = ?"),
    );
    this.preparedStatements.set(
      "upsertLockout",
      this.db.prepare(`
        INSERT INTO kyro_lockouts (user_id, attempts, last_attempt, locked_at, locked_until)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          attempts = excluded.attempts,
          last_attempt = excluded.last_attempt,
          locked_at = excluded.locked_at,
          locked_until = excluded.locked_until
      `),
    );
    this.preparedStatements.set(
      "resetLockout",
      this.db.prepare(
        "UPDATE kyro_lockouts SET attempts = 0, locked_at = NULL, locked_until = NULL WHERE user_id = ?",
      ),
    );
  }

  private stmt(name: string): any {
    const stmt = this.preparedStatements.get(name);
    if (!stmt) throw new Error(`Prepared statement not found: ${name}`);
    return stmt;
  }

  async cleanupExpiredSessions(): Promise<number> {
    await this.ensureConnected();
    const result = this.stmt("deleteExpiredSessions").run(
      new Date().toISOString(),
    );
    return result.changes;
  }

  async cleanupOldAuditLogs(retentionDays: number = 30): Promise<number> {
    await this.ensureConnected();
    const cutoff = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    const result = this.stmt("cleanupOldAuditLogs").run(cutoff);
    return result.changes;
  }

  async getStats(): Promise<{
    userCount: number;
    activeSessionCount: number;
    auditLogCount: number;
  }> {
    await this.ensureConnected();

    const userCount = (this.stmt("countUsers").get() as { count: number })
      .count;

    const activeSessionCount = (
      this.db!.prepare(
        "SELECT COUNT(*) as count FROM kyro_sessions WHERE expires_at > ?",
      ).get(new Date().toISOString()) as { count: number }
    ).count;

    const auditLogCount = (
      this.db!.prepare(
        "SELECT COUNT(*) as count FROM kyro_audit_logs",
      ).get() as { count: number }
    ).count;

    return { userCount, activeSessionCount, auditLogCount };
  }

  async createUser(data: {
    email: string;
    password: string;
    name?: string;
    role?: UserRole;
    avatar?: string;
    tenantId?: string;
  }): Promise<AuthUser> {
    await this.ensureConnected();

    const id = randomBytes(16).toString("hex");
    const now = new Date().toISOString();
    const passwordHash = await this.hashPassword(data.password);

    const user: AuthUser = {
      id,
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      role: (data.role || "customer") as UserRole,
      avatar: data.avatar,
      tenantId: data.tenantId,
      createdAt: now,
      updatedAt: now,
    };

    this.db!.prepare(
      `INSERT INTO kyro_users (id, name, email, password_hash, role, avatar, tenant_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      user.name || null,
      user.email,
      user.passwordHash,
      user.role,
      user.avatar || null,
      user.tenantId || null,
      now,
      now,
    );

    return user;
  }

  async findUserByEmail(email: string): Promise<AuthUser | null> {
    await this.ensureConnected();

    const row = this.stmt("findUserByEmail").get(email.toLowerCase()) as
      | Record<string, unknown>
      | undefined;

    if (!row) return null;
    return this.rowToUser(row);
  }

  async findUserById(userId: string): Promise<AuthUser | null> {
    await this.ensureConnected();

    const row = this.stmt("findUserById").get(userId) as
      | Record<string, unknown>
      | undefined;

    if (!row) return null;
    return this.rowToUser(row);
  }

  async updateUser(
    userId: string,
    data: Partial<AuthUser>,
  ): Promise<AuthUser | null> {
    await this.ensureConnected();

    const existing = await this.findUserById(userId);
    if (!existing) return null;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.email !== undefined) {
      updates.push("email = ?");
      values.push(data.email.toLowerCase());
    }
    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }
    if (data.passwordHash !== undefined) {
      updates.push("password_hash = ?");
      values.push(data.passwordHash);
    }
    if (data.role !== undefined) {
      updates.push("role = ?");
      values.push(data.role);
    }
    if (data.avatar !== undefined) {
      updates.push("avatar = ?");
      values.push(data.avatar);
    }
    if (data.tenantId !== undefined) {
      updates.push("tenant_id = ?");
      values.push(data.tenantId);
    }
    if (data.emailVerified !== undefined) {
      updates.push("email_verified = ?");
      values.push(data.emailVerified ? 1 : 0);
    }
    if (data.locked !== undefined) {
      updates.push("locked = ?");
      values.push(data.locked ? 1 : 0);
    }
    if (data.lastLogin !== undefined) {
      updates.push("last_login = ?");
      values.push(data.lastLogin);
    }
    if (data.failedLoginAttempts !== undefined) {
      updates.push("failed_login_attempts = ?");
      values.push(data.failedLoginAttempts);
    }

    updates.push("updated_at = ?");
    values.push(new Date().toISOString());

    values.push(userId);

    this.db!.prepare(
      `UPDATE kyro_users SET ${updates.join(", ")} WHERE id = ?`,
    ).run(...values);

    return this.findUserById(userId);
  }

  async deleteUser(userId: string): Promise<boolean> {
    await this.ensureConnected();

    const result = this.stmt("deleteUser").run(userId);
    return result.changes > 0;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async verifyPassword(
    email: string,
    password: string,
  ): Promise<AuthUser | null> {
    await this.ensureConnected();
    const user = await this.findUserByEmail(email);
    if (!user) return null;
    const stored = this.db!.prepare(
      "SELECT password_hash FROM kyro_users WHERE id = ?",
    ).get(user.id) as { password_hash: string } | undefined;
    if (!stored?.password_hash) return null;
    const valid = await bcrypt.compare(password, stored.password_hash);
    return valid ? user : null;
  }

  async createSession(
    userId: string,
    data: {
      ipAddress?: string;
      userAgent?: string;
    } = {},
  ): Promise<Session> {
    await this.ensureConnected();

    const id = randomBytes(32).toString("hex");
    const token = randomBytes(32).toString("base64url");
    const refreshToken = randomBytes(32).toString("base64url");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 86400000).toISOString();

    const session: Session = {
      id,
      userId,
      token,
      refreshToken,
      expiresAt,
      createdAt: now.toISOString(),
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    };

    this.db!.prepare(
      `INSERT INTO kyro_sessions (id, user_id, token, refresh_token, expires_at, created_at, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      session.id,
      session.userId,
      session.token,
      session.refreshToken ?? null,
      session.expiresAt,
      session.createdAt,
      session.ipAddress ?? null,
      session.userAgent ?? null,
    );

    return session;
  }

  async findSessionByToken(token: string): Promise<Session | null> {
    await this.ensureConnected();

    const row = this.stmt("findSessionByToken").get(token) as
      | Record<string, unknown>
      | undefined;

    if (!row) return null;
    return this.rowToSession(row);
  }

  async findSessionByRefreshToken(
    refreshToken: string,
  ): Promise<Session | null> {
    await this.ensureConnected();

    const row = this.stmt("findSessionByRefreshToken").get(refreshToken) as
      | Record<string, unknown>
      | undefined;

    if (!row) return null;
    return this.rowToSession(row);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    await this.ensureConnected();

    const result = this.stmt("deleteSession").run(sessionId, sessionId);
    return result.changes > 0;
  }

  async deleteUserSessions(userId: string): Promise<number> {
    await this.ensureConnected();

    const result = this.stmt("deleteUserSessions").run(userId);
    return result.changes;
  }

  async hasAnyUsers(): Promise<boolean> {
    await this.ensureConnected();

    const row = this.stmt("countUsers").get() as { count: number };
    return row.count > 0;
  }

  async findUsers(
    options: {
      page?: number;
      limit?: number;
      search?: string;
    } = {},
  ): Promise<{ users: AuthUser[]; total: number }> {
    await this.ensureConnected();

    const page = options.page ?? 1;
    const limit = options.limit ?? 10;
    const offset = (page - 1) * limit;
    const search = options.search;

    let total: number;
    let rows: Record<string, unknown>[];

    if (search) {
      const searchPattern = `%${search}%`;
      total = (
        this.stmt("countUsersWithSearch").get(searchPattern) as {
          count: number;
        }
      ).count;
      rows = this.stmt("findUsersWithSearch").all(
        searchPattern,
        limit,
        offset,
      ) as Record<string, unknown>[];
    } else {
      total = (this.stmt("countUsers").get() as { count: number }).count;
      rows = this.stmt("findUsersPaginated").all(limit, offset) as Record<
        string,
        unknown
      >[];
    }

    return {
      users: rows.map((row) => this.rowToUser(row)),
      total,
    };
  }

  async addPasswordToHistory(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await this.ensureConnected();

    this.stmt("addPasswordHistory").run(
      userId,
      passwordHash,
      new Date().toISOString(),
    );
    this.stmt("trimPasswordHistory").run(userId);
  }

  async getPasswordHistory(
    userId: string,
    count: number = 5,
  ): Promise<string[]> {
    await this.ensureConnected();

    const rows = this.stmt("getPasswordHistory").all(userId, count) as Array<{
      password_hash: string;
    }>;

    return rows.map((r) => r.password_hash);
  }

  async isPasswordInHistory(
    password: string,
    userId: string,
    historyCount: number = 5,
  ): Promise<boolean> {
    const history = await this.getPasswordHistory(userId, historyCount);
    for (const hash of history) {
      if (await bcrypt.compare(password, hash)) {
        return true;
      }
    }
    return false;
  }

  async recordFailedAttempt(userId: string): Promise<void> {
    await this.ensureConnected();

    const now = Date.now();
    const lockout = this.stmt("getLockout").get(userId) as
      | { attempts: number; locked_until: number | null }
      | undefined;

    const attempts = (lockout?.attempts || 0) + 1;
    const lockedUntil =
      attempts >= 5 ? now + 15 * 60 * 1000 : lockout?.locked_until || null;

    this.stmt("upsertLockout").run(
      userId,
      attempts,
      now,
      lockedUntil !== null ? now : null,
      lockedUntil,
    );
  }

  async resetAttempts(userId: string): Promise<void> {
    await this.ensureConnected();
    this.stmt("resetLockout").run(userId);
  }

  async checkLockout(userId: string): Promise<{
    locked: boolean;
    attemptsRemaining: number;
    lockedUntil?: Date;
    totalAttempts: number;
  }> {
    await this.ensureConnected();

    this.stmt("cleanupExpiredLockouts").run(Date.now());

    const lockout = this.stmt("getLockout").get(userId) as
      | { attempts: number; locked_until: number | null }
      | undefined;

    if (!lockout) {
      return {
        locked: false,
        attemptsRemaining: 5,
        totalAttempts: 0,
      };
    }

    if (lockout.locked_until !== null && lockout.locked_until > Date.now()) {
      return {
        locked: true,
        attemptsRemaining: 0,
        lockedUntil: new Date(lockout.locked_until),
        totalAttempts: lockout.attempts,
      };
    }

    return {
      locked: false,
      attemptsRemaining: Math.max(0, 5 - lockout.attempts),
      totalAttempts: lockout.attempts,
    };
  }

  async logAudit(data: {
    action: string;
    userId?: string;
    userEmail?: string;
    role?: string;
    resource: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    error?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    await this.ensureConnected();

    const id = randomBytes(16).toString("hex");
    const timestamp = new Date().toISOString();

    this.db!.prepare(
      `INSERT INTO kyro_audit_logs (
          id, timestamp, action, user_id, user_email, role, resource, resource_id,
          ip_address, user_agent, success, error, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      timestamp,
      data.action,
      data.userId || null,
      data.userEmail || null,
      data.role || null,
      data.resource,
      data.resourceId || null,
      data.ipAddress || null,
      data.userAgent || null,
      data.success ? 1 : 0,
      data.error || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
      new Date().toISOString(),
    );

    return id;
  }

  async queryAuditLogs(
    options: {
      action?: string;
      userId?: string;
      resource?: string;
      success?: boolean;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{
    logs: Array<{
      id: string;
      timestamp: Date;
      action: string;
      userId?: string;
      userEmail?: string;
      resource: string;
      resourceId?: string;
      ipAddress?: string;
      userAgent?: string;
      success: boolean;
      error?: string;
      metadata?: Record<string, unknown>;
    }>;
    total: number;
  }> {
    await this.ensureConnected();

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (options.action) {
      conditions.push("action = ?");
      params.push(options.action);
    }
    if (options.userId) {
      conditions.push("user_id = ?");
      params.push(options.userId);
    }
    if (options.resource) {
      conditions.push("resource = ?");
      params.push(options.resource);
    }
    if (options.success !== undefined) {
      conditions.push("success = ?");
      params.push(options.success ? 1 : 0);
    }
    if (options.startDate) {
      conditions.push("timestamp >= ?");
      params.push(options.startDate.toISOString());
    }
    if (options.endDate) {
      conditions.push("timestamp <= ?");
      params.push(options.endDate.toISOString());
    }

    const where =
      conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const totalResult = this.db!.prepare(
      `SELECT COUNT(*) as count FROM kyro_audit_logs ${where}`,
    ).get(...params) as { count: number };

    const rows = this.db!.prepare(
      `SELECT * FROM kyro_audit_logs ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
    ).all(...params, limit, offset) as Array<Record<string, unknown>>;

    return {
      total: totalResult.count,
      logs: rows.map((row) => ({
        id: row.id as string,
        timestamp: new Date(row.timestamp as string),
        action: row.action as string,
        userId: (row.user_id as string) || undefined,
        userEmail: (row.user_email as string) || undefined,
        resource: row.resource as string,
        resourceId: (row.resource_id as string) || undefined,
        ipAddress: (row.ip_address as string) || undefined,
        userAgent: (row.user_agent as string) || undefined,
        success: (row.success as number) === 1,
        error: (row.error as string) || undefined,
        metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      })),
    };
  }

  private rowToUser(row: Record<string, unknown>): AuthUser {
    return {
      id: row.id as string,
      name: (row.name as string) || undefined,
      email: row.email as string,
      passwordHash: row.password_hash as string,
      role: row.role as UserRole,
      tenantId: row.tenant_id as string | undefined,
      avatar: row.avatar as string | undefined,
      emailVerified: (row.email_verified as number) === 1,
      locked: (row.locked as number) === 1,
      lastLogin: row.last_login as string | undefined,
      failedLoginAttempts: (row.failed_login_attempts as number) || 0,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private rowToSession(row: Record<string, unknown>): Session {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      token: row.token as string,
      refreshToken: row.refresh_token as string | undefined,
      expiresAt: row.expires_at as string,
      createdAt: row.created_at as string,
      ipAddress: row.ip_address as string | undefined,
      userAgent: row.user_agent as string | undefined,
    };
  }

  async findAuditLogs(
    filter: AuditLogFilter,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const result = await this.queryAuditLogs({
      action: filter.action as string | undefined,
      userId: filter.userId,
      resource: filter.resource,
      success: filter.success,
      startDate: filter.startDate,
      endDate: filter.endDate,
      limit: filter.limit,
      offset: filter.offset,
    });
    return {
      logs: result.logs.map((log) => ({
        ...log,
        action: log.action as AuditLog["action"],
      })),
      total: result.total,
    };
  }

  async createAuditLog(
    data: Omit<AuditLog, "id" | "timestamp">,
  ): Promise<AuditLog> {
    const id = await this.logAudit({
      action: data.action,
      userId: data.userId,
      userEmail: data.userEmail,
      role: data.role,
      resource: data.resource,
      resourceId: data.resourceId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      success: data.success,
      error: data.error,
      metadata: data.metadata,
    });
    const row = this.db
      ?.prepare("SELECT * FROM kyro_audit_logs WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;
    return {
      ...data,
      id,
      timestamp: row ? new Date(row.timestamp as string) : new Date(),
    };
  }

  async createEmailVerificationToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
    await this.ensureConnected();
    const id = randomBytes(16).toString("hex");
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    this.db!.prepare(
      "INSERT INTO kyro_email_verifications (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(id, userId, token, expiresAt.toISOString(), new Date().toISOString());

    return { token, expiresAt };
  }

  async verifyEmailToken(token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
    await this.ensureConnected();

    const row = this.db!.prepare(
      "SELECT * FROM kyro_email_verifications WHERE token = ?"
    ).get(token) as { id: string; user_id: string; expires_at: string } | undefined;

    if (!row) {
      return { success: false, error: "Invalid verification token" };
    }

    if (new Date(row.expires_at) < new Date()) {
      return { success: false, error: "Verification token has expired" };
    }

    this.db!.prepare(
      "UPDATE kyro_users SET email_verified = 1 WHERE id = ?"
    ).run(row.user_id);

    this.db!.prepare(
      "DELETE FROM kyro_email_verifications WHERE id = ?"
    ).run(row.id);

    return { success: true, userId: row.user_id };
  }

  async createPasswordResetToken(email: string): Promise<{ token: string; expiresAt: Date; error?: string }> {
    await this.ensureConnected();

    const user = await this.findUserByEmail(email);
    if (!user) {
      return { token: "", expiresAt: new Date(), error: "User not found" };
    }

    const id = randomBytes(16).toString("hex");
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    this.db!.prepare(
      "INSERT INTO kyro_password_resets (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(id, user.id, token, expiresAt.toISOString(), new Date().toISOString());

    return { token, expiresAt };
  }

  async resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    await this.ensureConnected();

    const row = this.db!.prepare(
      "SELECT * FROM kyro_password_resets WHERE token = ?"
    ).get(token) as { id: string; user_id: string; expires_at: string; used_at: string | null } | undefined;

    if (!row) {
      return { success: false, error: "Invalid reset token" };
    }

    if (new Date(row.expires_at) < new Date()) {
      return { success: false, error: "Reset token has expired" };
    }

    if (row.used_at) {
      return { success: false, error: "Reset token has already been used" };
    }

    const passwordHash = await this.hashPassword(newPassword);

    this.db!.prepare(
      "UPDATE kyro_users SET password_hash = ?, updated_at = ? WHERE id = ?"
    ).run(passwordHash, new Date().toISOString(), row.user_id);

    this.db!.prepare(
      "UPDATE kyro_password_resets SET used_at = ? WHERE id = ?"
    ).run(new Date().toISOString(), row.id);

    this.db!.prepare(
      "DELETE FROM kyro_sessions WHERE user_id = ?"
    ).run(row.user_id);

    return { success: true };
  }
}
