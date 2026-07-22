import { autoInstall } from "../utils/auto-install.js";
import type { Redis } from "ioredis";
import type { AuthAdapter, AuthUser, Session, UserRole } from "./types.js";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export interface RedisAuthAdapterOptions {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  tokenExpiration?: number;
  refreshTokenExpiration?: number;
  tls?: boolean;
}

const DEFAULT_PREFIX = "kyro:auth:";
const DEFAULT_TOKEN_EXPIRATION = 86400;
const DEFAULT_REFRESH_EXPIRATION = 604800;

export class RedisAuthAdapter implements AuthAdapter {
  private _redis: Redis | null = null;
  private prefix: string;
  private tokenExpiration: number;
  private refreshExpiration: number;
  private options: RedisAuthAdapterOptions;

  constructor(options: RedisAuthAdapterOptions = {}) {
    this.options = options;
    this.prefix = options.keyPrefix || DEFAULT_PREFIX;
    this.tokenExpiration = options.tokenExpiration || DEFAULT_TOKEN_EXPIRATION;
    this.refreshExpiration =
      options.refreshTokenExpiration || DEFAULT_REFRESH_EXPIRATION;
  }

  private async getRedis(): Promise<Redis> {
    if (!this._redis) {
      let RedisClass;
      const modName = "ioredis";
      try {
        const redisMod = await import(/* @vite-ignore */ modName);
        RedisClass = redisMod.Redis;
      } catch (e) {
        autoInstall([modName]);
        const redisMod = await import(/* @vite-ignore */ modName);
        RedisClass = redisMod.Redis;
      }
      const url =
        this.options.url ||
        `redis://${this.options.host || "localhost"}:${this.options.port || 6379}`;
      this._redis = new RedisClass(url, {
        password: this.options.password,
        db: this.options.db,
        lazyConnect: true,
        tls: this.options.tls ? {} : undefined,
      });
    }
    return this._redis!;
  }

  async connect(): Promise<void> {
    await this.getRedis();
  }

  async disconnect(): Promise<void> {
    await (await this.getRedis()).quit();
  }

  private userKey(userId: string): string {
    return `${this.prefix}users:${userId}`;
  }

  private sessionKey(sessionId: string): string {
    return `${this.prefix}sessions:${sessionId}`;
  }

  private refreshKey(token: string): string {
    return `${this.prefix}refresh:${token}`;
  }

  private userByEmailKey(email: string): string {
    return `${this.prefix}users:email:${email.toLowerCase()}`;
  }

  private passwordHistoryKey(userId: string): string {
    return `${this.prefix}users:${userId}:password_history`;
  }

  async createUser(data: {
    email: string;
    password: string;
    role?: UserRole;
    tenantId?: string;
  }): Promise<AuthUser> {
    const userId = randomBytes(16).toString("hex");
    const now = new Date().toISOString();
    const passwordHash = await this.hashPassword(data.password);

    const user: AuthUser = {
      id: userId,
      email: data.email.toLowerCase(),
      passwordHash,
      role: (data.role || "customer") as UserRole,
      tenantId: data.tenantId,
      createdAt: now,
      updatedAt: now,
    };

    const pipeline = (await this.getRedis()).pipeline();

    pipeline.hset(this.userKey(userId), this.userToHash(user));
    pipeline.set(this.userByEmailKey(data.email), userId);

    await pipeline.exec();

    return user;
  }

  async findUserByEmail(email: string): Promise<AuthUser | null> {
    const userId = await (
      await this.getRedis()
    ).get(this.userByEmailKey(email.toLowerCase()));
    if (!userId) return null;
    return this.findUserById(userId);
  }

  async findUserById(userId: string): Promise<AuthUser | null> {
    const data = await (await this.getRedis()).hgetall(this.userKey(userId));
    if (!data || Object.keys(data).length === 0) return null;
    return this.hashToUser(data);
  }

  async updateUser(
    userId: string,
    data: Partial<AuthUser>,
  ): Promise<AuthUser | null> {
    const existing = await this.findUserById(userId);
    if (!existing) return null;

    const updated: AuthUser = {
      ...existing,
      ...data,
      id: userId,
      updatedAt: new Date().toISOString(),
    };

    if (data.email && data.email !== existing.email) {
      const pipeline = (await this.getRedis()).pipeline();
      pipeline.del(this.userByEmailKey(existing.email));
      pipeline.set(this.userByEmailKey(data.email), userId);
      await pipeline.exec();
    }

    await (
      await this.getRedis()
    ).hset(this.userKey(userId), this.userToHash(updated));
    return updated;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const user = await this.findUserById(userId);
    if (!user) return false;

    const pipeline = (await this.getRedis()).pipeline();
    pipeline.del(this.userKey(userId));
    pipeline.del(this.userByEmailKey(user.email));
    pipeline.del(this.passwordHistoryKey(userId));
    await pipeline.exec();

    return true;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async verifyPassword(
    email: string,
    password: string,
  ): Promise<AuthUser | null> {
    const userId = await (
      await this.getRedis()
    ).get(this.userByEmailKey(email));
    if (!userId) return null;
    const user = await this.findUserById(userId);
    if (!user || !user.passwordHash) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  async createSession(
    userId: string,
    data: {
      ipAddress?: string;
      userAgent?: string;
    } = {},
  ): Promise<Session> {
    const sessionId = randomBytes(32).toString("hex");
    const token = randomBytes(32).toString("base64url");
    const refreshToken = randomBytes(32).toString("base64url");
    const now = new Date();

    const session: Session = {
      id: sessionId,
      userId,
      token,
      refreshToken,
      expiresAt: new Date(
        now.getTime() + this.tokenExpiration * 1000,
      ).toISOString(),
      createdAt: now.toISOString(),
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    };

    const pipeline = (await this.getRedis()).pipeline();

    pipeline.hset(this.sessionKey(sessionId), this.sessionToHash(session));
    pipeline.setex(
      this.refreshKey(refreshToken),
      this.refreshExpiration,
      sessionId,
    );

    await pipeline.exec();

    return session;
  }

  async findSessionByToken(token: string): Promise<Session | null> {
    const data = await (await this.getRedis()).hgetall(this.sessionKey(token));
    if (!data || Object.keys(data).length === 0) return null;
    return this.hashToSession(data);
  }

  async findSessionByRefreshToken(
    refreshToken: string,
  ): Promise<Session | null> {
    const sessionId = await (
      await this.getRedis()
    ).get(this.refreshKey(refreshToken));
    if (!sessionId) return null;
    const data = await (
      await this.getRedis()
    ).hgetall(this.sessionKey(sessionId));
    if (!data || Object.keys(data).length === 0) return null;
    return this.hashToSession(data);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const session = await (
      await this.getRedis()
    ).hgetall(this.sessionKey(sessionId));
    if (!session || Object.keys(session).length === 0) return false;

    const pipeline = (await this.getRedis()).pipeline();
    pipeline.del(this.sessionKey(sessionId));
    if (session.refreshToken) {
      pipeline.del(this.refreshKey(session.refreshToken));
    }
    await pipeline.exec();

    return true;
  }

  async deleteUserSessions(userId: string): Promise<number> {
    const pattern = `${this.prefix}sessions:*`;
    let cursor = "0";
    let deleted = 0;

    do {
      const [nextCursor, keys] = await (
        await this.getRedis()
      ).scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = nextCursor;

      for (const key of keys) {
        const sessionData = await (await this.getRedis()).hgetall(key);
        if (sessionData.userId === userId) {
          const sessionId = key.replace(`${this.prefix}sessions:`, "");
          await this.deleteSession(sessionId);
          deleted++;
        }
      }
    } while (cursor !== "0");

    return deleted;
  }

  async addPasswordToHistory(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await (
      await this.getRedis()
    ).lpush(this.passwordHistoryKey(userId), passwordHash);
    await (await this.getRedis()).ltrim(this.passwordHistoryKey(userId), 0, 4);
  }

  async getPasswordHistory(
    userId: string,
    count: number = 5,
  ): Promise<string[]> {
    return (await this.getRedis()).lrange(
      this.passwordHistoryKey(userId),
      0,
      count - 1,
    );
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

  private userToHash(user: AuthUser): Record<string, string> {
    const hash: Record<string, string> = {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash || "",
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    if (user.avatar) hash.avatar = user.avatar;
    if (user.tenantId) hash.tenantId = user.tenantId;
    if (user.emailVerified !== undefined)
      hash.emailVerified = String(user.emailVerified);
    if (user.locked !== undefined) hash.locked = String(user.locked);
    if (user.lastLogin) hash.lastLogin = user.lastLogin;
    if (user.failedLoginAttempts !== undefined)
      hash.failedLoginAttempts = String(user.failedLoginAttempts);

    return hash;
  }

  private hashToUser(hash: Record<string, string>): AuthUser {
    return {
      id: hash.id,
      email: hash.email,
      passwordHash: hash.passwordHash,
      role: hash.role as UserRole,
      tenantId: hash.tenantId,
      avatar: hash.avatar,
      createdAt: hash.createdAt,
      updatedAt: hash.updatedAt,
      emailVerified: hash.emailVerified === "true",
      locked: hash.locked === "true",
      lastLogin: hash.lastLogin,
      failedLoginAttempts: hash.failedLoginAttempts
        ? parseInt(hash.failedLoginAttempts, 10)
        : 0,
    };
  }

  private sessionToHash(session: Session): Record<string, string> {
    const hash: Record<string, string> = {
      id: session.id,
      userId: session.userId,
      token: session.token,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    };

    if (session.refreshToken) hash.refreshToken = session.refreshToken;
    if (session.ipAddress) hash.ipAddress = session.ipAddress;
    if (session.userAgent) hash.userAgent = session.userAgent;

    return hash;
  }

  private hashToSession(hash: Record<string, string>): Session {
    return {
      id: hash.id,
      userId: hash.userId,
      token: hash.token,
      refreshToken: hash.refreshToken,
      expiresAt: hash.expiresAt,
      createdAt: hash.createdAt,
      ipAddress: hash.ipAddress,
      userAgent: hash.userAgent,
    };
  }

  private tokenKey(tokenType: string, token: string): string {
    return `${this.prefix}tokens:${tokenType}:${token}`;
  }

  async createEmailVerificationToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const redis = await this.getRedis();
    await redis.setex(this.tokenKey("email-verify", token), 86400, userId);
    return { token, expiresAt };
  }

  async verifyEmailToken(token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
    const redis = await this.getRedis();
    const userId = await redis.get(this.tokenKey("email-verify", token));
    if (!userId) {
      return { success: false, error: "Invalid or expired token" };
    }
    await redis.del(this.tokenKey("email-verify", token));
    return { success: true, userId };
  }

  async createPasswordResetToken(email: string): Promise<{ token: string; expiresAt: Date; error?: string }> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      return { token: "", expiresAt: new Date(), error: "User not found" };
    }
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const redis = await this.getRedis();
    await redis.setex(this.tokenKey("password-reset", token), 3600, user.id);
    return { token, expiresAt };
  }

  async resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const redis = await this.getRedis();
    const userId = await redis.get(this.tokenKey("password-reset", token));
    if (!userId) {
      return { success: false, error: "Invalid or expired token" };
    }
    const passwordHash = await this.hashPassword(newPassword);
    await this.updateUser(userId, { passwordHash });
    await redis.del(this.tokenKey("password-reset", token));
    return { success: true };
  }

  private auditLogKey(id: string): string {
    return `${this.prefix}audit:logs:${id}`;
  }

  private auditLogIndexKey(): string {
    return `${this.prefix}audit:index`;
  }

  async findAuditLogs(filter: {
    userId?: string;
    action?: string | string[];
    resource?: string;
    success?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: any[]; total: number }> {
    const { limit = 50, offset = 0 } = filter;
    const indexKey = this.auditLogIndexKey();
    const allIds = await (await this.getRedis()).zrevrange(indexKey, 0, -1);
    const total = allIds.length;

    const pagedIds = allIds.slice(offset, offset + limit);
    const logs: any[] = [];

    for (const id of pagedIds) {
      const logData = await (await this.getRedis()).get(this.auditLogKey(id));
      if (logData) {
        const log = JSON.parse(logData);
        if (
          (!filter.userId || log.userId === filter.userId) &&
          (!filter.action ||
            (Array.isArray(filter.action)
              ? filter.action.includes(log.action)
              : log.action === filter.action)) &&
          (!filter.resource || log.resource === filter.resource) &&
          (filter.success === undefined || log.success === filter.success)
        ) {
          logs.push({ ...log, timestamp: new Date(log.timestamp) });
        }
      }
    }

    return { logs, total };
  }

  async createAuditLog(data: any): Promise<any> {
    const id = randomBytes(16).toString("hex");
    const timestamp = new Date();
    const log = { ...data, id, timestamp };
    await (
      await this.getRedis()
    ).set(this.auditLogKey(id), JSON.stringify(log));
    await (await this.getRedis()).zadd(this.auditLogIndexKey(), Date.now(), id);
    const count = await (await this.getRedis()).zcard(this.auditLogIndexKey());
    if (count > 10000) {
      const oldIds = await (
        await this.getRedis()
      ).zrange(this.auditLogIndexKey(), 0, count - 10001);
      for (const oldId of oldIds) {
        await (await this.getRedis()).del(this.auditLogKey(oldId));
        await (await this.getRedis()).zrem(this.auditLogIndexKey(), oldId);
      }
    }
    return log;
  }
}
