import type { Redis } from "ioredis";

export interface LockoutConfig {
  maxAttempts: number;
  lockDuration: number;
  notifyUser: boolean;
  notifyAdmin: boolean;
  adminNotifyAfter: number;
}

export interface LockoutStatus {
  locked: boolean;
  attemptsRemaining: number;
  lockedUntil?: Date;
  totalAttempts: number;
}

export interface LockoutRecord {
  userId: string;
  attempts: number;
  lockedAt?: Date;
  lockedUntil?: Date;
  history: number[];
}

export const DEFAULT_LOCKOUT_CONFIG: LockoutConfig = {
  maxAttempts: 5,
  lockDuration: 900000,
  notifyUser: true,
  notifyAdmin: true,
  adminNotifyAfter: 3,
};

export class AccountLockout {
  private redis: Redis;
  private prefix: string;
  private config: LockoutConfig;

  constructor(
    redis: Redis,
    config: Partial<LockoutConfig> = {},
    prefix: string = "kyro:lockout:",
  ) {
    this.redis = redis;
    this.prefix = prefix;
    this.config = { ...DEFAULT_LOCKOUT_CONFIG, ...config };
  }

  private lockKey(userId: string): string {
    return `${this.prefix}${userId}`;
  }

  private historyKey(userId: string): string {
    return `${this.prefix}${userId}:history`;
  }

  async checkLockout(userId: string): Promise<LockoutStatus> {
    const key = this.lockKey(userId);
    const data = await this.redis.hgetall(key);

    if (!data || Object.keys(data).length === 0) {
      return {
        locked: false,
        attemptsRemaining: this.config.maxAttempts,
        totalAttempts: 0,
      };
    }

    const attempts = parseInt(data.attempts, 10);
    const lockedUntil = data.lockedUntil
      ? new Date(parseInt(data.lockedUntil, 10))
      : undefined;

    if (lockedUntil && lockedUntil > new Date()) {
      return {
        locked: true,
        attemptsRemaining: 0,
        lockedUntil,
        totalAttempts: attempts,
      };
    }

    if (lockedUntil && lockedUntil <= new Date()) {
      await this.unlockAccount(userId);
      return {
        locked: false,
        attemptsRemaining: this.config.maxAttempts,
        totalAttempts: 0,
      };
    }

    return {
      locked: false,
      attemptsRemaining: Math.max(0, this.config.maxAttempts - attempts),
      totalAttempts: attempts,
    };
  }

  async recordFailedAttempt(userId: string): Promise<LockoutStatus> {
    const key = this.lockKey(userId);
    const historyKey = this.historyKey(userId);
    const now = Date.now();

    const current = await this.redis.hincrby(key, "attempts", 1);
    await this.redis.hset(key, "lastAttempt", now.toString());

    await this.redis.lpush(historyKey, now.toString());
    await this.redis.ltrim(historyKey, 0, 99);

    if (current >= this.config.maxAttempts) {
      const lockedUntil = new Date(now + this.config.lockDuration);
      await this.redis.hset(key, {
        lockedAt: now.toString(),
        lockedUntil: lockedUntil.getTime().toString(),
      });
      await this.redis.expire(
        key,
        Math.ceil(this.config.lockDuration / 1000) + 3600,
      );

      return {
        locked: true,
        attemptsRemaining: 0,
        lockedUntil,
        totalAttempts: current,
      };
    }

    return {
      locked: false,
      attemptsRemaining: Math.max(0, this.config.maxAttempts - current),
      totalAttempts: current,
    };
  }

  async lockAccount(userId: string, duration?: number): Promise<void> {
    const key = this.lockKey(userId);
    const now = Date.now();
    const lockDuration = duration || this.config.lockDuration;
    const lockedUntil = new Date(now + lockDuration);

    const pipeline = this.redis.pipeline();
    pipeline.hset(key, {
      attempts: this.config.maxAttempts.toString(),
      lockedAt: now.toString(),
      lockedUntil: lockedUntil.getTime().toString(),
    });
    pipeline.expire(key, Math.ceil(lockDuration / 1000) + 3600);
    await pipeline.exec();
  }

  async unlockAccount(userId: string): Promise<void> {
    const key = this.lockKey(userId);
    await this.redis.del(key);
  }

  async resetAttempts(userId: string): Promise<void> {
    const key = this.lockKey(userId);
    const data = await this.redis.hgetall(key);

    if (data.lockedAt) {
      await this.redis.hset(key, {
        attempts: "0",
        lockedAt: "",
        lockedUntil: "",
      });
    } else {
      await this.redis.del(key);
    }
  }

  async getLockoutHistory(userId: string, limit: number = 10): Promise<Date[]> {
    const historyKey = this.historyKey(userId);
    const timestamps = await this.redis.lrange(historyKey, 0, limit - 1);
    return timestamps.map((ts) => new Date(parseInt(ts, 10)));
  }

  async getLockoutStats(userId: string): Promise<{
    totalFailedAttempts: number;
    lockoutCount: number;
    lastLockout: Date | null;
    averageAttemptsBeforeLockout: number;
  }> {
    const historyKey = this.historyKey(userId);
    const timestamps = await this.redis.lrange(historyKey, 0, -1);

    const lockouts = timestamps.filter((_, i) => {
      const attemptNum = i + 1;
      return attemptNum % this.config.maxAttempts === 0;
    }).length;

    const lastLockoutData = await this.redis.hget(
      this.lockKey(userId),
      "lockedAt",
    );

    return {
      totalFailedAttempts: timestamps.length,
      lockoutCount: lockouts,
      lastLockout: lastLockoutData
        ? new Date(parseInt(lastLockoutData, 10))
        : null,
      averageAttemptsBeforeLockout: lockouts > 0 ? this.config.maxAttempts : 0,
    };
  }

  shouldNotifyAdmin(currentAttempts: number): boolean {
    return (
      this.config.notifyAdmin && currentAttempts >= this.config.adminNotifyAfter
    );
  }

  getConfig(): LockoutConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<LockoutConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
