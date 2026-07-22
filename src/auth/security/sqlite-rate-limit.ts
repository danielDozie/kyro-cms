import { createRequire } from "module";
const _require = createRequire(import.meta.url);
const modPath = "node:" + "sqlite";
const { DatabaseSync } = _require(modPath) as typeof import("node:sqlite");
import { randomBytes } from "crypto";
import { RateLimitConfig, RateLimitResult } from "./rate-limit.js";

export class SQLiteRateLimiter {
  private db: any = null;
  private prefix: string;
  private limits: Record<string, RateLimitConfig>;
  private userLimits: Record<string, RateLimitConfig>;
  private externalDb: boolean;
  private options: { db?: any; path?: string };

  constructor(
    options: { db?: any; path?: string } = {},
    limits?: Record<string, RateLimitConfig>,
    userLimits?: Record<string, RateLimitConfig>,
    prefix: string = "kyro:ratelimit:",
  ) {
    this.options = options;
    this.prefix = prefix;
    this.limits = { ...DEFAULT_RATE_LIMITS, ...limits };
    this.userLimits = userLimits || {
      "user:api": { window: 60000, max: 500 },
      "user:write": { window: 3600000, max: 100 },
    };
    this.externalDb = !!options.db;

    if (options.db) {
      this.db = options.db;
    }
  }

  async connect(): Promise<void> {
    if (this.db) return;

    const path = (this.options as { path?: string }).path || "./data.db";
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA foreign_keys = ON");

    this.ensureTables();
  }

  async disconnect(): Promise<void> {
    if (this.db && !this.externalDb) {
      this.db.close();
      this.db = null;
    }
  }

  private ensureTables(): void {
    if (!this.db) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kyro_ratelimit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        UNIQUE(key, timestamp)
      );
      
      CREATE INDEX IF NOT EXISTS idx_kyro_ratelimit_key ON kyro_ratelimit(key);
      CREATE INDEX IF NOT EXISTS idx_kyro_ratelimit_expires ON kyro_ratelimit(expires_at);
    `);
  }

  private getKey(type: string, identifier: string): string {
    return `${this.prefix}${type}:${identifier}`;
  }

  private async cleanupExpired(): Promise<void> {
    if (!this.db) return;
    const now = Date.now();
    this.db.prepare("DELETE FROM kyro_ratelimit WHERE expires_at < ?").run(now);
  }

  async check(type: string, identifier: string): Promise<RateLimitResult> {
    if (!this.db) throw new Error("Not connected");

    await this.cleanupExpired();

    const config = this.limits[type] || this.limits["api:general"];
    const key = this.getKey(type, identifier);

    const now = Date.now();
    const windowStart = now - config.window;

    // Remove expired entries for this key
    this.db
      .prepare("DELETE FROM kyro_ratelimit WHERE key = ? AND timestamp < ?")
      .run(key, windowStart);

    // Count current requests in window
    const countResult = this.db
      .prepare("SELECT COUNT(*) as count FROM kyro_ratelimit WHERE key = ?")
      .get(key) as { count: number };
    const count = countResult.count;

    // Add current request
    this.db
      .prepare(
        "INSERT INTO kyro_ratelimit (key, timestamp, expires_at) VALUES (?, ?, ?)",
      )
      .run(key, now, now + config.window + 3600000); // Expire 1 hour after window end

    if (count >= config.max) {
      // Get oldest timestamp in window
      const oldestResult = this.db
        .prepare(
          "SELECT timestamp FROM kyro_ratelimit WHERE key = ? ORDER BY timestamp ASC LIMIT 1",
        )
        .get(key) as { timestamp: number } | undefined;

      const resetAt =
        oldestResult && oldestResult.timestamp
          ? oldestResult.timestamp + config.window
          : now + config.window;

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt - now) / 1000),
      };
    }

    return {
      allowed: true,
      remaining: config.max - count - 1,
      resetAt: now + config.window,
    };
  }

  async checkUser(
    type: string,
    userId: string,
    identifier: string,
  ): Promise<RateLimitResult> {
    if (!this.db) throw new Error("Not connected");

    const config = this.userLimits[type] || this.userLimits["user:api"];
    const key = this.getKey(`user:${type}:${userId}`, identifier);

    // Same logic as check() but with user-specific key
    await this.cleanupExpired();

    const now = Date.now();
    const windowStart = now - config.window;

    this.db
      .prepare("DELETE FROM kyro_ratelimit WHERE key = ? AND timestamp < ?")
      .run(key, windowStart);

    const countResult = this.db
      .prepare("SELECT COUNT(*) as count FROM kyro_ratelimit WHERE key = ?")
      .get(key) as { count: number };
    const count = countResult.count;

    this.db
      .prepare(
        "INSERT INTO kyro_ratelimit (key, timestamp, expires_at) VALUES (?, ?, ?)",
      )
      .run(key, now, now + config.window + 3600000);

    if (count >= config.max) {
      const oldestResult = this.db
        .prepare(
          "SELECT timestamp FROM kyro_ratelimit WHERE key = ? ORDER BY timestamp ASC LIMIT 1",
        )
        .get(key) as { timestamp: number } | undefined;

      const resetAt =
        oldestResult && oldestResult.timestamp
          ? oldestResult.timestamp + config.window
          : now + config.window;

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt - now) / 1000),
      };
    }

    return {
      allowed: true,
      remaining: config.max - count - 1,
      resetAt: now + config.window,
    };
  }

  async reset(type: string, identifier: string): Promise<void> {
    if (!this.db) throw new Error("Not connected");
    const key = this.getKey(type, identifier);
    this.db.prepare("DELETE FROM kyro_ratelimit WHERE key = ?").run(key);
  }

  async resetUser(
    type: string,
    userId: string,
    identifier: string,
  ): Promise<void> {
    if (!this.db) throw new Error("Not connected");
    const key = this.getKey(`user:${type}:${userId}`, identifier);
    this.db.prepare("DELETE FROM kyro_ratelimit WHERE key = ?").run(key);
  }

  async getStatus(
    type: string,
    identifier: string,
  ): Promise<{
    count: number;
    limit: number;
    remaining: number;
    resetAt: number;
  }> {
    if (!this.db) throw new Error("Not connected");

    await this.cleanupExpired();

    const config = this.limits[type] || this.limits["api:general"];
    const key = this.getKey(type, identifier);

    const now = Date.now();
    const windowStart = now - config.window;

    this.db
      .prepare("DELETE FROM kyro_ratelimit WHERE key = ? AND timestamp < ?")
      .run(key, windowStart);

    const countResult = this.db
      .prepare("SELECT COUNT(*) as count FROM kyro_ratelimit WHERE key = ?")
      .get(key) as { count: number };
    const count = countResult.count;

    return {
      count,
      limit: config.max,
      remaining: Math.max(0, config.max - count),
      resetAt: now + config.window,
    };
  }

  setLimit(type: string, config: RateLimitConfig): void {
    this.limits[type] = config;
  }

  setUserLimit(type: string, config: RateLimitConfig): void {
    this.userLimits[type] = config;
  }
}



const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  "auth:login": { window: 900000, max: 5 },
  "auth:register": { window: 3600000, max: 3 },
  "auth:forgot": { window: 3600000, max: 3 },
  "auth:reset": { window: 3600000, max: 5 },
  "auth:verify": { window: 3600000, max: 5 },
  "api:general": { window: 60000, max: 100 },
  "api:authenticated": { window: 60000, max: 200 },
};
