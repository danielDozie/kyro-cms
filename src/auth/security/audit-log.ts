import type {
  AuditAction,
  AuditLog,
  AuditLogFilter,
  AuditRetentionConfig,
} from "./audit-log-types.js";
import type { Redis } from "ioredis";
import { randomBytes } from "crypto";

export {
  type AuditAction,
  type AuditLog,
  type AuditLogFilter,
  type AuditRetentionConfig,
  DEFAULT_RETENTION_CONFIG,
} from "./audit-log-types.js";

export class AuditLogger {
  private redis: Redis;
  private prefix: string;
  private retentionDays: number;

  constructor(
    redis: Redis,
    retentionDays: number = 30,
    prefix: string = "kyro:audit:",
  ) {
    this.redis = redis;
    this.prefix = prefix;
    this.retentionDays = retentionDays;
  }

  async log(data: Omit<AuditLog, "id" | "timestamp">): Promise<string> {
    const id = randomBytes(16).toString("hex");
    const timestamp = new Date();

    const log: AuditLog = {
      ...data,
      id,
      timestamp,
    };

    const key = this.getKeyForDate(timestamp);
    const hashKey = `${this.prefix}log:${id}`;

    await this.redis.hset(hashKey, this.serializeLog(log));
    await this.redis.expire(hashKey, this.retentionDays * 24 * 60 * 60 + 3600);

    await this.redis.zadd(key, timestamp.getTime(), id);
    await this.redis.expire(key, this.retentionDays * 24 * 60 * 60 + 3600);

    const userIndex = data.userId ? `${this.prefix}user:${data.userId}` : null;
    if (userIndex) {
      await this.redis.zadd(userIndex, timestamp.getTime(), id);
      await this.redis.expire(
        userIndex,
        this.retentionDays * 24 * 60 * 60 + 3600,
      );
    }

    return id;
  }

  async get(id: string): Promise<AuditLog | null> {
    const hashKey = `${this.prefix}log:${id}`;
    const data = await this.redis.hgetall(hashKey);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return this.deserializeLog(data);
  }

  async query(filter: AuditLogFilter = {}): Promise<{
    logs: AuditLog[];
    total: number;
  }> {
    const { limit = 50, offset = 0 } = filter;

    let keys: string[] = [];

    if (filter.userId) {
      keys.push(`${this.prefix}user:${filter.userId}`);
    } else if (filter.startDate || filter.endDate) {
      keys = this.getKeysForDateRange(filter.startDate, filter.endDate);
    } else {
      const now = new Date();
      keys = this.getKeysForDateRange(
        new Date(now.getTime() - this.retentionDays * 24 * 60 * 60 * 1000),
        now,
      );
    }

    let idScores: [string, number][] = [];

    for (const key of keys) {
      const items = await this.redis.zrange(key, 0, -1, "WITHSCORES");
      for (let i = 0; i < items.length; i += 2) {
        idScores.push([items[i], parseInt(items[i + 1], 10)]);
      }
    }

    idScores.sort((a, b) => b[1] - a[1]);

    const total = idScores.length;
    idScores = idScores.slice(offset, offset + limit);

    const logs: AuditLog[] = [];
    for (const [id] of idScores) {
      const log = await this.get(id);
      if (log) {
        if (this.matchesFilter(log, filter)) {
          logs.push(log);
        }
      }
    }

    return { logs, total };
  }

  async getRecent(limit: number = 50): Promise<AuditLog[]> {
    const logs: AuditLog[] = [];
    const now = new Date();
    const keys = this.getKeysForDateRange(
      new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      now,
    );

    let allIds: [string, number][] = [];

    for (const key of keys) {
      const items = await this.redis.zrange(key, 0, -1, "WITHSCORES");
      for (let i = 0; i < items.length; i += 2) {
        allIds.push([items[i], parseInt(items[i + 1], 10)]);
      }
    }

    allIds.sort((a, b) => b[1] - a[1]);

    for (const [id] of allIds.slice(0, limit)) {
      const log = await this.get(id);
      if (log) logs.push(log);
    }

    return logs;
  }

  async getUserActivity(
    userId: string,
    limit: number = 50,
  ): Promise<AuditLog[]> {
    const key = `${this.prefix}user:${userId}`;
    const ids = await this.redis.zrange(key, 0, limit - 1);

    const logs: AuditLog[] = [];
    for (const id of ids) {
      const log = await this.get(id);
      if (log) logs.push(log);
    }

    return logs;
  }

  async getStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalEvents: number;
    byAction: Record<string, number>;
    successRate: number;
    failedLogins: number;
    uniqueUsers: Set<string>;
  }> {
    const keys = this.getKeysForDateRange(
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate || new Date(),
    );

    const byAction: Record<string, number> = {};
    let totalEvents = 0;
    let failedLogins = 0;
    let successCount = 0;
    const uniqueUsers = new Set<string>();

    for (const key of keys) {
      const ids = await this.redis.zrange(key, 0, -1);

      for (const id of ids) {
        const log = await this.get(id);
        if (log) {
          totalEvents++;

          byAction[log.action] = (byAction[log.action] || 0) + 1;

          if (log.success) {
            successCount++;
          }

          if (log.action === "login_failed") {
            failedLogins++;
          }

          if (log.userId) {
            uniqueUsers.add(log.userId);
          }
        }
      }
    }

    return {
      totalEvents,
      byAction,
      successRate: totalEvents > 0 ? successCount / totalEvents : 1,
      failedLogins,
      uniqueUsers,
    };
  }

  async cleanup(): Promise<number> {
    const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;

    const keys = await this.redis.keys(`${this.prefix}date:*`);
    let deleted = 0;

    for (const key of keys) {
      const timestamp = await this.redis.zrangebyscore(key, 0, cutoff);

      for (const id of timestamp) {
        await this.redis.del(`${this.prefix}log:${id}`);
        deleted++;
      }

      await this.redis.zremrangebyscore(key, 0, cutoff);
    }

    return deleted;
  }

  private getKeyForDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${this.prefix}date:${year}-${month}-${day}`;
  }

  private getKeysForDateRange(start?: Date, end?: Date): string[] {
    const keys: string[] = [];
    const startDate =
      start || new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);
    const endDate = end || new Date();

    const current = new Date(startDate);
    while (current <= endDate) {
      keys.push(this.getKeyForDate(current));
      current.setDate(current.getDate() + 1);
    }

    return keys;
  }

  private matchesFilter(log: AuditLog, filter: AuditLogFilter): boolean {
    if (filter.action) {
      const actions = Array.isArray(filter.action)
        ? filter.action
        : [filter.action];
      if (!actions.includes(log.action)) return false;
    }

    if (filter.resource && log.resource !== filter.resource) return false;

    if (filter.resourceId && log.resourceId !== filter.resourceId) return false;

    if (filter.success !== undefined && log.success !== filter.success)
      return false;

    return true;
  }

  private serializeLog(log: AuditLog): Record<string, string> {
    const result: Record<string, string> = {
      id: log.id,
      timestamp: new Date(log.timestamp).toISOString(),
      action: log.action,
      resource: log.resource,
      success: log.success ? "1" : "0",
    };

    if (log.userId) result.userId = log.userId;
    if (log.userEmail) result.userEmail = log.userEmail;
    if (log.role) result.role = log.role;
    if (log.resourceId) result.resourceId = log.resourceId;
    if (log.ipAddress) result.ipAddress = log.ipAddress;
    if (log.userAgent) result.userAgent = log.userAgent;
    if (log.error) result.error = log.error;
    if (log.changes) result.changes = JSON.stringify(log.changes);
    if (log.metadata) result.metadata = JSON.stringify(log.metadata);

    return result;
  }

  private deserializeLog(data: Record<string, string>): AuditLog {
    return {
      id: data.id,
      timestamp: new Date(data.timestamp),
      action: data.action as AuditAction,
      userId: data.userId,
      userEmail: data.userEmail,
      role: data.role,
      resource: data.resource,
      resourceId: data.resourceId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      success: data.success === "1",
      error: data.error,
      changes: data.changes ? JSON.parse(data.changes) : undefined,
      metadata: data.metadata ? JSON.parse(data.metadata) : undefined,
    };
  }
}

export function createAuditContext(req: Request): {
  ipAddress: string;
  userAgent: string;
} {
  return {
    ipAddress:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown",
    userAgent: req.headers.get("user-agent") || "unknown",
  };
}
