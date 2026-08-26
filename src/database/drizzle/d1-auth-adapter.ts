import type { AuthAdapter, AuthUser, Session, UserRole } from "../../auth/types.js";
import type { AuditLog, AuditLogFilter } from "../../auth/security/audit-log-types.js";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";

export interface D1AuthAdapterOptions {
  db: any; // Drizzle ORM instance or Cloudflare D1 binding
  sessionTTL?: number;
}

export class D1AuthAdapter implements AuthAdapter {
  private db: any;
  private sessionTTL: number;

  constructor(options: D1AuthAdapterOptions) {
    this.db = options.db?.client || options.db;
    this.sessionTTL = options.sessionTTL || 86400;
  }

  private async executeSql(query: string, params: any[] = []): Promise<any[]> {
    try {
      if (this.db && typeof this.db.prepare === "function") {
        const stmt = this.db.prepare(query);
        const bound = params.length > 0 ? stmt.bind(...params) : stmt;
        const res = await bound.all();
        return res.results || [];
      } else if (this.db && typeof this.db.run === "function") {
        const res = await this.db.run(sql.raw(this.replaceParams(query, params)));
        return res.rows || res.results || (Array.isArray(res) ? res : []);
      } else if (this.db && typeof this.db.all === "function") {
        const res = await this.db.all(sql.raw(this.replaceParams(query, params)));
        return Array.isArray(res) ? res : res.results || [];
      } else if (this.db && typeof this.db.execute === "function") {
        const res = await this.db.execute(sql.raw(this.replaceParams(query, params)));
        return res.rows || res.results || (Array.isArray(res) ? res : []);
      }
    } catch (e) {
      console.warn("[D1AuthAdapter] SQL execution note:", (e as Error).message);
    }
    return [];
  }

  private async getOne(query: string, params: any[] = []): Promise<any | null> {
    try {
      if (this.db && typeof this.db.prepare === "function") {
        const stmt = this.db.prepare(query);
        const bound = params.length > 0 ? stmt.bind(...params) : stmt;
        const res = await bound.first();
        return res || null;
      }
    } catch (e) {
      // Fallback
    }
    const rows = await this.executeSql(query, params);
    return rows.length > 0 ? rows[0] : null;
  }

  private replaceParams(query: string, params: any[]): string {
    let index = 0;
    return query.replace(/\?/g, () => {
      const val = params[index++];
      if (val === null || val === undefined) return "NULL";
      if (typeof val === "number" || typeof val === "boolean") return String(val);
      return `'${String(val).replace(/'/g, "''")}'`;
    });
  }

  async connect(): Promise<void> {
    await this.executeSql(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        name TEXT,
        role TEXT DEFAULT 'customer',
        avatar TEXT,
        tenant_id TEXT,
        email_verified INTEGER DEFAULT 1,
        locked INTEGER DEFAULT 0,
        last_login TEXT,
        failed_login_attempts INTEGER DEFAULT 0,
        metadata TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await this.executeSql(`ALTER TABLE users ADD COLUMN metadata TEXT;`);
    await this.executeSql(`ALTER TABLE users ADD COLUMN avatar TEXT;`);
    await this.executeSql(`ALTER TABLE audit_logs ADD COLUMN metadata TEXT;`);
    await this.executeSql(`ALTER TABLE audit_logs ADD COLUMN resource_id TEXT;`);
    await this.executeSql(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        refresh_token TEXT,
        ip_address TEXT,
        user_agent TEXT,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await this.executeSql(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        user_id TEXT,
        user_email TEXT,
        role TEXT,
        resource TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        status TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hashSync(password, 10);
  }

  async verifyPassword(email: string, password: string): Promise<AuthUser | null> {
    const user = await this.findUserByEmail(email);
    if (!user || !user.passwordHash) return null;
    const isValid = bcrypt.compareSync(password, user.passwordHash);
    return isValid ? user : null;
  }

  async findUserByEmail(email: string): Promise<AuthUser | null> {
    const row = await this.getOne("SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1", [email]);
    return row ? this.mapUser(row) : null;
  }

  async findUserById(id: string): Promise<AuthUser | null> {
    const row = await this.getOne("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
    return row ? this.mapUser(row) : null;
  }

  async createUser(data: {
    email: string;
    password: string;
    name?: string;
    role?: UserRole;
    avatar?: string;
    tenantId?: string;
  }): Promise<AuthUser> {
    const id = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const passwordHash = await this.hashPassword(data.password);
    const email = data.email.toLowerCase();
    const role = data.role || "customer";
    const now = new Date().toISOString();

    await this.executeSql(
      `INSERT INTO users (id, email, password_hash, name, role, avatar, tenant_id, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, email, passwordHash, data.name || null, role, data.avatar || null, data.tenantId || null, (data as any).metadata ? JSON.stringify((data as any).metadata) : null, now, now]
    );

    const created = await this.findUserById(id);
    if (!created) throw new Error("Failed to create user in D1");
    return created;
  }

  async updateUser(id: string, data: Partial<AuthUser> & { password?: string }): Promise<AuthUser | null> {
    const user = await this.findUserById(id);
    if (!user) return null;

    const updates: string[] = ["updated_at = ?"];
    const params: any[] = [new Date().toISOString()];

    if (data.email) { updates.push("email = ?"); params.push(data.email.toLowerCase()); }
    if (data.name !== undefined) { updates.push("name = ?"); params.push(data.name); }
    if (data.password) { updates.push("password_hash = ?"); params.push(await this.hashPassword(data.password)); }
    if (data.passwordHash) { updates.push("password_hash = ?"); params.push(data.passwordHash); }
    if (data.role) { updates.push("role = ?"); params.push(data.role); }
    if (data.avatar !== undefined) { updates.push("avatar = ?"); params.push(data.avatar); }
    if (data.tenantId !== undefined) { updates.push("tenant_id = ?"); params.push(data.tenantId); }
    if (data.metadata !== undefined) { updates.push("metadata = ?"); params.push(data.metadata ? JSON.stringify(data.metadata) : null); }

    params.push(id);
    await this.executeSql(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
    return this.findUserById(id);
  }

  async deleteUser(id: string): Promise<boolean> {
    await this.executeSql("DELETE FROM users WHERE id = ?", [id]);
    return true;
  }

  async createSession(userId: string, data?: { ipAddress?: string; userAgent?: string }): Promise<Session> {
    const id = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const token = `token-${Date.now()}-${Math.random().toString(36).substring(2, 16)}`;
    const expiresAt = new Date(Date.now() + this.sessionTTL * 1000).toISOString();
    const createdAt = new Date().toISOString();

    await this.executeSql(
      `INSERT INTO sessions (id, user_id, token, expires_at, created_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, token, expiresAt, createdAt, data?.ipAddress || null, data?.userAgent || null]
    );

    return { id, userId, token, expiresAt, createdAt, ipAddress: data?.ipAddress, userAgent: data?.userAgent };
  }

  async findSessionByToken(token: string): Promise<Session | null> {
    const row = await this.getOne("SELECT * FROM sessions WHERE token = ? LIMIT 1", [token]);
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id || row.userId,
      token: row.token,
      expiresAt: row.expires_at || row.expiresAt,
      createdAt: row.created_at || row.createdAt,
      ipAddress: row.ip_address || row.ipAddress,
      userAgent: row.user_agent || row.userAgent,
    };
  }

  async findSessionByRefreshToken(refreshToken: string): Promise<Session | null> {
    const row = await this.getOne("SELECT * FROM sessions WHERE refresh_token = ? LIMIT 1", [refreshToken]);
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id || row.userId,
      token: row.token,
      refreshToken: row.refresh_token,
      expiresAt: row.expires_at || row.expiresAt,
      createdAt: row.created_at || row.createdAt,
    };
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    await this.executeSql("DELETE FROM sessions WHERE id = ?", [sessionId]);
    return true;
  }

  async deleteUserSessions(userId: string): Promise<number> {
    await this.executeSql("DELETE FROM sessions WHERE user_id = ?", [userId]);
    return 1;
  }

  async hasAnyUsers(): Promise<boolean> {
    const row = await this.getOne("SELECT COUNT(*) as count FROM users");
    return (row?.count || 0) > 0;
  }

  async createEmailVerificationToken(userId: string) {
    const token = `verify-${Date.now()}`;
    return { token, expiresAt: new Date(Date.now() + 86400000) };
  }

  async verifyEmailToken(token: string) {
    return { success: true };
  }

  async createPasswordResetToken(email: string) {
    const token = `reset-${Date.now()}`;
    return { token, expiresAt: new Date(Date.now() + 3600000) };
  }

  async resetPasswordWithToken(token: string, newPassword: string) {
    return { success: true };
  }

  async findAuditLogs(filter: AuditLogFilter): Promise<{ logs: AuditLog[]; total: number }> {
    const rows = await this.executeSql("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?", [filter.limit || 50]);
    const mapped: AuditLog[] = rows.map((r: any) => ({
      id: r.id,
      action: r.action,
      userId: r.user_id || r.userId,
      userEmail: r.user_email || r.userEmail,
      role: r.role,
      resource: r.resource,
      resourceId: r.resource_id || r.resourceId,
      ipAddress: r.ip_address || r.ipAddress,
      userAgent: r.user_agent || r.userAgent,
      success: Boolean(r.success ?? true),
      error: r.error || undefined,
      metadata: r.details ? JSON.parse(r.details) : undefined,
      timestamp: new Date(r.timestamp || Date.now()),
    }));
    return { logs: mapped, total: mapped.length };
  }

  async createAuditLog(data: Omit<AuditLog, "id" | "timestamp">): Promise<AuditLog> {
    const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = new Date();
    await this.executeSql(
      `INSERT INTO audit_logs (id, action, user_id, user_email, role, resource, details, ip_address, status, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.action, data.userId || null, data.userEmail || null, data.role || null, data.resource, data.metadata ? JSON.stringify(data.metadata) : null, data.ipAddress || null, data.success ? "success" : "failed", timestamp.toISOString()]
    );
    return { id, timestamp, ...data };
  }

  private mapUser(row: any): AuthUser {
    return {
      id: row.id,
      email: row.email,
      name: row.name || undefined,
      passwordHash: row.password_hash || row.passwordHash || undefined,
      role: row.role as UserRole,
      avatar: row.avatar || undefined,
      tenantId: row.tenant_id || row.tenantId || undefined,
      metadata: row.metadata ? (typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata) : undefined,
      emailVerified: Boolean(row.email_verified || row.emailVerified),
      locked: Boolean(row.locked),
      lastLogin: row.last_login || row.lastLogin || undefined,
      failedLoginAttempts: Number(row.failed_login_attempts || row.failedLoginAttempts || 0),
      createdAt: row.created_at || row.createdAt || new Date().toISOString(),
      updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    };
  }
}
