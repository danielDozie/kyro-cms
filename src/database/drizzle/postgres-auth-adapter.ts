import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, gt, desc, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "crypto";
import type {
  AuthAdapter,
  AuthUser,
  Session,
  UserRole,
} from "../../auth/types.js";
import {
  users,
  sessions,
  passwordHistory,
  auditLogs,
  lockouts,
  roles,
  permissions,
  tenants,
  apiKeys,
  emailVerifications,
  passwordResets,
  type AuthUser as AuthUserRow,
} from "./schema/auth.js";
import type {
  AuditLog,
  AuditLogFilter,
} from "../../auth/security/audit-log.js";

export interface PostgresAuthAdapterOptions {
  db: PostgresJsDatabase;
  prefix?: string;
  sessionTTL?: number;
  refreshTokenTTL?: number;
}

let _tablesEnsured = false;

export class PostgresAuthAdapter implements AuthAdapter {
  private db: PostgresJsDatabase;
  private prefix: string;
  private sessionTTL: number;
  private refreshTokenTTL: number;

  constructor(options: PostgresAuthAdapterOptions) {
    this.db = options.db;
    this.prefix = options.prefix || "kyro:";
    this.sessionTTL = options.sessionTTL || 86400;
    this.refreshTokenTTL = options.refreshTokenTTL || 604800;
  }

  async connect(): Promise<void> {
    if (_tablesEnsured) return;
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(255),
        "email" VARCHAR(255) NOT NULL,
        "password_hash" VARCHAR(255),
        "role" VARCHAR(50) NOT NULL DEFAULT 'customer',
        "tenant_id" UUID,
        "email_verified" BOOLEAN DEFAULT false,
        "locked" BOOLEAN DEFAULT false,
        "last_login" TIMESTAMP,
        "failed_login_attempts" INTEGER DEFAULT 0,
        "metadata" JSONB,
        "avatar" VARCHAR(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await this.db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar" VARCHAR(255)`);
    await this.db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "metadata" JSONB`);
    await this.db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tenant_id" UUID`);
    await this.db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN DEFAULT false`);
    await this.db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locked" BOOLEAN DEFAULT false`);
    await this.db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login" TIMESTAMP`);
    await this.db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER DEFAULT 0`);
    await this.db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email")`);
    await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "users_tenant_idx" ON "users" ("tenant_id")`);
    await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" ("role")`);

    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token" VARCHAR(512) NOT NULL UNIQUE,
        "refresh_token" VARCHAR(512),
        "ip_address" VARCHAR(45),
        "user_agent" TEXT,
        "expires_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "sessions_user_idx" ON "sessions" ("user_id")`);
    await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "sessions_token_idx" ON "sessions" ("token")`);
    await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "sessions_expires_idx" ON "sessions" ("expires_at")`);

    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "action" VARCHAR(100) NOT NULL,
        "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "user_email" VARCHAR(255),
        "role" VARCHAR(50),
        "resource" VARCHAR(100) NOT NULL,
        "resource_id" VARCHAR(255),
        "changes" JSONB,
        "ip_address" VARCHAR(45),
        "user_agent" TEXT,
        "success" BOOLEAN NOT NULL DEFAULT true,
        "error" TEXT,
        "metadata" JSONB,
        "timestamp" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await this.db.execute(sql`ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "resource_id" VARCHAR(255)`);
    await this.db.execute(sql`ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "changes" JSONB`);
    await this.db.execute(sql`ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "user_agent" TEXT`);
    await this.db.execute(sql`ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "error" TEXT`);
    await this.db.execute(sql`ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "metadata" JSONB`);
    try {
      await this.db.execute(sql`ALTER TABLE "audit_logs" ALTER COLUMN "resource_id" TYPE VARCHAR(255)`);
    } catch {
      // Ignore if column type is already compatible
    }
    await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "audit_logs_user_idx" ON "audit_logs" ("user_id")`);
    await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" ("action")`);
    await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "audit_logs_resource_idx" ON "audit_logs" ("resource")`);
    await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "audit_logs_timestamp_idx" ON "audit_logs" ("timestamp")`);

    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "password_history" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "password_hash" VARCHAR(255) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "password_history_user_idx" ON "password_history" ("user_id")`);

    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "lockouts" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "ip_address" VARCHAR(45),
        "reason" VARCHAR(255),
        "locked_until" TIMESTAMP NOT NULL,
        "released_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "lockouts_user_idx" ON "lockouts" ("user_id")`);
    await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "lockouts_locked_until_idx" ON "lockouts" ("locked_until")`);

    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(100) NOT NULL UNIQUE,
        "level" INTEGER NOT NULL DEFAULT 0,
        "inherits" TEXT[],
        "description" TEXT,
        "permissions" JSONB DEFAULT '[]',
        "is_system" BOOLEAN DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "roles_level_idx" ON "roles" ("level")`);

    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "tenants" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(255) NOT NULL,
        "slug" VARCHAR(100) NOT NULL UNIQUE,
        "settings" JSONB DEFAULT '{}',
        "is_active" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "api_keys" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "name" VARCHAR(255) NOT NULL,
        "key" VARCHAR(64) NOT NULL UNIQUE,
        "key_prefix" VARCHAR(8) NOT NULL,
        "permissions" JSONB DEFAULT '[]',
        "last_used_at" TIMESTAMP,
        "expires_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "email_verifications" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token" VARCHAR(64) NOT NULL UNIQUE,
        "expires_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "password_resets" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token" VARCHAR(64) NOT NULL UNIQUE,
        "expires_at" TIMESTAMP NOT NULL,
        "used_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    _tablesEnsured = true;
  }

  async disconnect(): Promise<void> {
  }

  async createUser(data: {
    email: string;
    password: string;
    name?: string;
    role?: UserRole;
    avatar?: string;
    tenantId?: string;
    emailVerified?: boolean;
  }): Promise<AuthUser> {
    const passwordHash = await this.hashPassword(data.password);
    const [user] = await this.db
      .insert(users)
      .values({
        email: data.email.toLowerCase(),
        name: data.name,
        passwordHash,
        role: (data.role || "customer") as string,
        avatar: data.avatar,
        tenantId: data.tenantId,
        emailVerified: data.emailVerified ?? true,
      })
      .returning();

    return this.userToAuthUser(user);
  }

  async findUserByEmail(email: string): Promise<AuthUser | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    return user ? this.userToAuthUser(user) : null;
  }

  async findUserById(id: string): Promise<AuthUser | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user ? this.userToAuthUser(user) : null;
  }

  async updateUser(
    id: string,
    data: Partial<AuthUser>,
  ): Promise<AuthUser | null> {
    const dbData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) dbData.name = data.name;
    if (data.email !== undefined) dbData.email = data.email;
    if (data.passwordHash !== undefined)
      dbData.passwordHash = data.passwordHash;
    if (data.role !== undefined) dbData.role = data.role;
    if (data.tenantId !== undefined) dbData.tenantId = data.tenantId;
    if (data.avatar !== undefined) dbData.avatar = data.avatar;
    if (data.emailVerified !== undefined)
      dbData.emailVerified = data.emailVerified;
    if (data.locked !== undefined) dbData.locked = data.locked;
    if (data.lastLogin !== undefined)
      dbData.lastLogin = data.lastLogin ? new Date(data.lastLogin) : null;
    if (data.failedLoginAttempts !== undefined)
      dbData.failedLoginAttempts = data.failedLoginAttempts;

    const [user] = await this.db
      .update(users)
      .set(dbData)
      .where(eq(users.id, id))
      .returning();

    return user ? this.userToAuthUser(user) : null;
  }

  async deleteUser(id: string): Promise<boolean> {
    await this.db.delete(users).where(eq(users.id, id));
    return true;
  }

  async findUsers(
    options: {
      page?: number;
      limit?: number;
      search?: string;
    } = {},
  ): Promise<{ users: AuthUser[]; total: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 10;
    const offset = (page - 1) * limit;
    const search = options.search;

    if (search) {
      const pattern = `%${search}%`;
      const [rows, [{ count }]] = await Promise.all([
        this.db
          .select()
          .from(users)
          .where(sql`${users.email} ILIKE ${pattern}`)
          .orderBy(desc(users.createdAt))
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(sql`${users.email} ILIKE ${pattern}`),
      ]);
      return {
        users: rows.map((r) => this.userToAuthUser(r)),
        total: Number(count),
      };
    }

    const [rows, [{ count }]] = await Promise.all([
      this.db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ count: sql<number>`count(*)` }).from(users),
    ]);
    return {
      users: rows.map((r) => this.userToAuthUser(r)),
      total: Number(count),
    };
  }

  async verifyPassword(
    email: string,
    password: string,
  ): Promise<AuthUser | null> {
    const user = await this.findUserByEmail(email);
    if (!user) return null;
    const [stored] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    if (!stored?.passwordHash) return null;
    const valid = await bcrypt.compare(password, stored.passwordHash);
    return valid ? user : null;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async createSession(
    userId: string,
    data?: { ipAddress?: string; userAgent?: string },
  ): Promise<Session> {
    const token = randomBytes(32).toString("base64url");
    const refreshToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + this.sessionTTL * 1000);
    const refreshExpiresAt = new Date(Date.now() + this.refreshTokenTTL * 1000);

    const [session] = await this.db
      .insert(sessions)
      .values({
        userId,
        token,
        refreshToken,
        ipAddress: data?.ipAddress,
        userAgent: data?.userAgent,
        expiresAt,
      })
      .returning();

    return this.sessionToSession(session);
  }

  async findSessionByToken(token: string): Promise<Session | null> {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1);

    return session ? this.sessionToSession(session) : null;
  }

  async findSessionByRefreshToken(
    refreshToken: string,
  ): Promise<Session | null> {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.refreshToken, refreshToken),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return session ? this.sessionToSession(session) : null;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    await this.db.delete(sessions).where(eq(sessions.id, sessionId));
    return true;
  }

  async deleteUserSessions(userId: string): Promise<number> {
    await this.db.delete(sessions).where(eq(sessions.userId, userId));
    return 1;
  }

  async addPasswordToHistory(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await this.db.insert(passwordHistory).values({
      userId,
      passwordHash,
    });
  }

  async getPasswordHistory(
    userId: string,
    count: number = 5,
  ): Promise<string[]> {
    const history = await this.db
      .select({ passwordHash: passwordHistory.passwordHash })
      .from(passwordHistory)
      .where(eq(passwordHistory.userId, userId))
      .orderBy(desc(passwordHistory.createdAt))
      .limit(count);

    return history.map((h) => h.passwordHash);
  }

  async isPasswordInHistory(
    password: string,
    userId: string,
    historyCount: number = 5,
  ): Promise<boolean> {
    const history = await this.getPasswordHistory(userId, historyCount);

    for (const hash of history) {
      if (await this.verifyPassword(password, hash)) {
        return true;
      }
    }

    return false;
  }

  async isLocked(userId: string): Promise<boolean> {
    const [lockout] = await this.db
      .select()
      .from(lockouts)
      .where(
        and(eq(lockouts.userId, userId), gt(lockouts.lockedUntil, new Date())),
      )
      .limit(1);

    return !!lockout;
  }

  async getLockout(userId: string): Promise<{ lockedUntil: Date } | null> {
    const [lockout] = await this.db
      .select()
      .from(lockouts)
      .where(
        and(eq(lockouts.userId, userId), gt(lockouts.lockedUntil, new Date())),
      )
      .limit(1);

    return lockout ? { lockedUntil: lockout.lockedUntil } : null;
  }

  async recordFailedAttempt(
    userId: string,
    ipAddress?: string,
  ): Promise<{ attempts: number; locked: boolean }> {
    const user = await this.findUserById(userId);
    const attempts = (user?.failedLoginAttempts || 0) + 1;

    await this.updateUser(userId, { failedLoginAttempts: attempts });

    const maxAttempts = 5;
    const locked = attempts >= maxAttempts;

    if (locked) {
      const lockoutDuration = 15 * 60 * 1000;
      await this.db.insert(lockouts).values({
        userId,
        ipAddress,
        reason: "Too many failed login attempts",
        lockedUntil: new Date(Date.now() + lockoutDuration),
      });
    }

    return { attempts, locked };
  }

  async resetAttempts(userId: string): Promise<void> {
    await this.updateUser(userId, { failedLoginAttempts: 0 });
  }

  async findAuditLogs(
    filter: AuditLogFilter,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const {
      limit = 50,
      offset = 0,
      userId,
      action,
      resource,
      resourceId,
      success,
      startDate,
      endDate,
    } = filter;

    const conditions = [];
    if (userId) conditions.push(eq(auditLogs.userId, userId));
    if (action) {
      if (Array.isArray(action)) {
        conditions.push(sql`${auditLogs.action} = ANY(${action})`);
      } else {
        conditions.push(eq(auditLogs.action, action));
      }
    }
    if (resource) conditions.push(eq(auditLogs.resource, resource));
    if (resourceId) conditions.push(eq(auditLogs.resourceId, resourceId));
    if (success !== undefined) conditions.push(eq(auditLogs.success, success));
    if (startDate) conditions.push(sql`${auditLogs.timestamp} >= ${startDate}`);
    if (endDate) conditions.push(sql`${auditLogs.timestamp} <= ${endDate}`);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(whereClause);

    const logs = await this.db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset(offset);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        timestamp: log.timestamp,
        action: log.action as AuditLog["action"],
        userId: log.userId || undefined,
        userEmail: log.userEmail || undefined,
        role: log.role || undefined,
        resource: log.resource,
        resourceId: log.resourceId || undefined,
        changes: log.changes || undefined,
        ipAddress: log.ipAddress || undefined,
        userAgent: log.userAgent || undefined,
        success: log.success,
        error: log.error || undefined,
        metadata: log.metadata || undefined,
      })),
      total: Number(countResult[0]?.count || 0),
    };
  }

  async createAuditLog(
    data: Omit<AuditLog, "id" | "timestamp">,
  ): Promise<AuditLog> {
    const id = crypto.randomUUID();
    const timestamp = new Date();

    await this.db.insert(auditLogs).values({
      id,
      action: data.action,
      userId: data.userId ?? null,
      userEmail: data.userEmail ?? null,
      role: data.role ?? null,
      resource: data.resource,
      resourceId: data.resourceId ?? null,
      changes: data.changes ?? null,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      success: data.success,
      error: data.error ?? null,
      metadata: data.metadata ?? null,
      timestamp,
    });

    return {
      ...data,
      id,
      timestamp,
    };
  }

  private userToAuthUser(user: AuthUserRow): AuthUser {
    return {
      id: user.id,
      name: user.name || undefined,
      email: user.email,
      passwordHash: user.passwordHash || undefined,
      role: user.role as UserRole,
      avatar: user.avatar && typeof user.avatar === "object"
        ? (user.avatar as any).id || undefined
        : (user.avatar || undefined),
      tenantId: user.tenantId || undefined,
      emailVerified: user.emailVerified || false,
      locked: user.locked || false,
      lastLogin: user.lastLogin ? new Date(user.lastLogin).toISOString() : undefined,
      failedLoginAttempts: user.failedLoginAttempts || 0,
      createdAt: new Date(user.createdAt).toISOString(),
      updatedAt: new Date(user.updatedAt).toISOString(),
    };
  }

  private sessionToSession(session: typeof sessions.$inferSelect): Session {
    return {
      id: session.id,
      userId: session.userId,
      token: session.token,
      refreshToken: session.refreshToken || undefined,
      expiresAt: new Date(session.expiresAt).toISOString(),
      createdAt: new Date(session.createdAt).toISOString(),
      ipAddress: session.ipAddress || undefined,
      userAgent: session.userAgent || undefined,
    };
  }

  async createEmailVerificationToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.db.insert(emailVerifications).values({
      userId,
      token,
      expiresAt,
    });

    return { token, expiresAt };
  }

  async verifyEmailToken(token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
    const [verification] = await this.db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.token, token))
      .limit(1);

    if (!verification) {
      return { success: false, error: "Invalid verification token" };
    }

    if (verification.expiresAt < new Date()) {
      return { success: false, error: "Verification token has expired" };
    }

    await this.db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, verification.userId));

    await this.db
      .delete(emailVerifications)
      .where(eq(emailVerifications.id, verification.id));

    return { success: true, userId: verification.userId };
  }

  async createPasswordResetToken(email: string): Promise<{ token: string; expiresAt: Date; error?: string }> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      return { token: "", expiresAt: new Date(), error: "User not found" };
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.db.insert(passwordResets).values({
      userId: user.id,
      token,
      expiresAt,
    });

    return { token, expiresAt };
  }

  async resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const [reset] = await this.db
      .select()
      .from(passwordResets)
      .where(eq(passwordResets.token, token))
      .limit(1);

    if (!reset) {
      return { success: false, error: "Invalid reset token" };
    }

    if (reset.expiresAt < new Date()) {
      return { success: false, error: "Reset token has expired" };
    }

    if (reset.usedAt) {
      return { success: false, error: "Reset token has already been used" };
    }

    const passwordHash = await this.hashPassword(newPassword);

    await this.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, reset.userId));

    await this.db
      .update(passwordResets)
      .set({ usedAt: new Date() })
      .where(eq(passwordResets.id, reset.id));

    await this.db.delete(sessions).where(eq(sessions.userId, reset.userId));

    return { success: true };
  }
}
