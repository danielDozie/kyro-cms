import type { Redis } from "ioredis";

export interface RateLimitConfig {
  window: number;
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  "auth:login": { window: 900000, max: 5 },
  "auth:register": { window: 3600000, max: 3 },
  "auth:forgot": { window: 3600000, max: 3 },
  "auth:reset": { window: 3600000, max: 5 },
  "auth:verify": { window: 3600000, max: 5 },
  "api:general": { window: 60000, max: 100 },
  "api:authenticated": { window: 60000, max: 200 },
};

export class RateLimiter {
  private redis: Redis;
  private prefix: string;
  private limits: Record<string, RateLimitConfig>;
  private userLimits: Record<string, RateLimitConfig>;

  constructor(
    redis: Redis,
    limits?: Record<string, RateLimitConfig>,
    userLimits?: Record<string, RateLimitConfig>,
    prefix: string = "kyro:ratelimit:",
  ) {
    this.redis = redis;
    this.prefix = prefix;
    this.limits = { ...DEFAULT_RATE_LIMITS, ...limits };
    this.userLimits = userLimits || {
      "user:api": { window: 60000, max: 500 },
      "user:write": { window: 3600000, max: 100 },
    };
  }

  private getKey(type: string, identifier: string): string {
    return `${this.prefix}${type}:${identifier}`;
  }

  async check(type: string, identifier: string): Promise<RateLimitResult> {
    const config = this.limits[type] || this.limits["api:general"];
    const key = this.getKey(type, identifier);

    const now = Date.now();
    const windowStart = now - config.window;

    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zcard(key);
    pipeline.zadd(key, now, `${now}:${Math.random()}`);
    pipeline.expire(key, Math.ceil(config.window / 1000) + 1);

    const results = await pipeline.exec();
    const count = (results?.[1]?.[1] as number) || 0;

    if (count >= config.max) {
      const oldestTimestamp = await this.redis.zrange(key, 0, 0, "WITHSCORES");
      const resetAt =
        oldestTimestamp.length > 1
          ? parseInt(oldestTimestamp[1], 10) + config.window
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
    const config = this.userLimits[type] || this.userLimits["user:api"];
    const key = this.getKey(`user:${type}:${userId}`, identifier);

    const now = Date.now();
    const windowStart = now - config.window;

    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zcard(key);
    pipeline.zadd(key, now, `${now}:${Math.random()}`);
    pipeline.expire(key, Math.ceil(config.window / 1000) + 1);

    const results = await pipeline.exec();
    const count = (results?.[1]?.[1] as number) || 0;

    if (count >= config.max) {
      const oldestTimestamp = await this.redis.zrange(key, 0, 0, "WITHSCORES");
      const resetAt =
        oldestTimestamp.length > 1
          ? parseInt(oldestTimestamp[1], 10) + config.window
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
    const key = this.getKey(type, identifier);
    await this.redis.del(key);
  }

  async resetUser(
    type: string,
    userId: string,
    identifier: string,
  ): Promise<void> {
    const key = this.getKey(`user:${type}:${userId}`, identifier);
    await this.redis.del(key);
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
    const config = this.limits[type] || this.limits["api:general"];
    const key = this.getKey(type, identifier);

    const now = Date.now();
    const windowStart = now - config.window;

    await this.redis.zremrangebyscore(key, 0, windowStart);
    const count = await this.redis.zcard(key);

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


