import type { RateLimitConfig, RateLimitResult } from "./rate-limit.js";

export class InMemoryRateLimiter {
  private storage: Map<string, { timestamp: number; count: number }[]> =
    new Map();
  private userStorage: Map<
    string,
    Map<string, { timestamp: number; count: number }[]>
  > = new Map();
  private limits: Record<string, RateLimitConfig>;
  private userLimits: Record<string, RateLimitConfig>;

  constructor(
    limits?: Record<string, RateLimitConfig>,
    userLimits?: Record<string, RateLimitConfig>,
  ) {
    this.limits = { ...DEFAULT_RATE_LIMITS, ...limits };
    this.userLimits = userLimits || {
      "user:api": { window: 60000, max: 500 },
      "user:write": { window: 3600000, max: 100 },
    };
  }

  private getKey(type: string, identifier: string): string {
    return `${type}:${identifier}`;
  }

  private getUserKey(type: string, userId: string, identifier: string): string {
    return `user:${type}:${userId}:${identifier}`;
  }

  private cleanupOldEntries(
    entries: { timestamp: number; count: number }[],
    window: number,
  ): void {
    const now = Date.now();
    const windowStart = now - window;

    // Remove entries older than the window
    while (entries.length > 0 && entries[0].timestamp < windowStart) {
      entries.shift();
    }
  }

  async check(type: string, identifier: string): Promise<RateLimitResult> {
    const config = this.limits[type] || this.limits["api:general"];
    const key = this.getKey(type, identifier);

    let entries = this.storage.get(key);
    if (!entries) {
      entries = [];
      this.storage.set(key, entries);
    }

    this.cleanupOldEntries(entries, config.window);

    const now = Date.now();
    const count = entries.reduce((sum, entry) => sum + entry.count, 0);

    // Add current request
    entries.push({ timestamp: now, count: 1 });

    if (count >= config.max) {
      // Find the oldest entry in window to calculate reset time
      const oldestEntry = entries.reduce(
        (oldest, current) =>
          oldest.timestamp < current.timestamp ? oldest : current,
        entries[0],
      );

      const resetAt = oldestEntry.timestamp + config.window;

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
    const userMap = this.userStorage.get(userId);
    let entries: { timestamp: number; count: number }[] = [];

    if (userMap) {
      entries = userMap.get(this.getKey(type, identifier)) || [];
    } else {
      // Initialize user storage if not exists
      if (!this.userStorage.has(userId)) {
        this.userStorage.set(userId, new Map());
      }
      this.userStorage.get(userId)!.set(this.getKey(type, identifier), entries);
    }

    this.cleanupOldEntries(entries, config.window);

    const now = Date.now();
    const count = entries.reduce((sum, entry) => sum + entry.count, 0);

    // Add current request
    entries.push({ timestamp: now, count: 1 });

    if (count >= config.max) {
      // Find the oldest entry in window to calculate reset time
      const oldestEntry = entries.reduce(
        (oldest, current) =>
          oldest.timestamp < current.timestamp ? oldest : current,
        entries[0],
      );

      const resetAt = oldestEntry.timestamp + config.window;

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
    this.storage.delete(key);
  }

  async resetUser(
    type: string,
    userId: string,
    identifier: string,
  ): Promise<void> {
    const userMap = this.userStorage.get(userId);
    if (userMap) {
      const key = this.getKey(type, identifier);
      userMap.delete(key);
    }
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

    let entries = this.storage.get(key);
    if (!entries) {
      entries = [];
      this.storage.set(key, entries);
    }

    this.cleanupOldEntries(entries, config.window);

    const now = Date.now();
    const count = entries.reduce((sum, entry) => sum + entry.count, 0);

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
