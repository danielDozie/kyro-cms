import type { LockoutConfig, LockoutStatus } from "./lockout.js";

export class InMemoryAccountLockout {
  private storage: Map<
    string,
    {
      attempts: number;
      lastAttempt: number | null;
      lockedAt: number | null;
      lockedUntil: number | null;
    }
  > = new Map();
  private history: Map<string, number[]> = new Map(); // userId -> attempt timestamps
  private config: LockoutConfig;

  constructor(config: Partial<LockoutConfig> = {}) {
    this.config = {
      maxAttempts: 5,
      lockDuration: 900000, // 15 minutes
      notifyUser: true,
      notifyAdmin: true,
      adminNotifyAfter: 3,
      ...config,
    };
  }

  async checkLockout(userId: string): Promise<LockoutStatus> {
    const now = Date.now();
    const record = this.storage.get(userId);

    // Clear expired locks
    if (record && record.lockedUntil !== null && record.lockedUntil <= now) {
      await this.resetAttempts(userId);
      return {
        locked: false,
        attemptsRemaining: this.config.maxAttempts,
        totalAttempts: 0,
      };
    }

    if (!record) {
      return {
        locked: false,
        attemptsRemaining: this.config.maxAttempts,
        totalAttempts: 0,
      };
    }

    const { attempts, lockedUntil } = record;

    if (lockedUntil !== null && lockedUntil > now) {
      return {
        locked: true,
        attemptsRemaining: 0,
        lockedUntil: new Date(lockedUntil),
        totalAttempts: attempts,
      };
    }

    return {
      locked: false,
      attemptsRemaining: Math.max(0, this.config.maxAttempts - attempts),
      totalAttempts: attempts,
    };
  }

  async recordFailedAttempt(userId: string): Promise<LockoutStatus> {
    const now = Date.now();
    const record = this.storage.get(userId) || {
      attempts: 0,
      lastAttempt: null,
      lockedAt: null,
      lockedUntil: null,
    };

    record.attempts += 1;
    record.lastAttempt = now;

    // Add to history
    let history = this.history.get(userId) || [];
    history.push(now);
    // Keep only last 100 attempts
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    this.history.set(userId, history);

    this.storage.set(userId, record);

    // Check if we should lock the account
    if (record.attempts >= this.config.maxAttempts) {
      const lockedUntil = new Date(now + this.config.lockDuration);
      record.lockedAt = now;
      record.lockedUntil = lockedUntil.getTime();
      this.storage.set(userId, record);

      return {
        locked: true,
        attemptsRemaining: 0,
        lockedUntil,
        totalAttempts: record.attempts,
      };
    }

    return {
      locked: false,
      attemptsRemaining: Math.max(0, this.config.maxAttempts - record.attempts),
      totalAttempts: record.attempts,
    };
  }

  async lockAccount(userId: string, duration?: number): Promise<void> {
    const now = Date.now();
    const lockDuration = duration || this.config.lockDuration;
    const lockedUntil = new Date(now + lockDuration);

    const record = this.storage.get(userId) || {
      attempts: 0,
      lastAttempt: null,
      lockedAt: null,
      lockedUntil: null,
    };

    record.attempts = this.config.maxAttempts;
    record.lockedAt = now;
    record.lockedUntil = lockedUntil.getTime();
    this.storage.set(userId, record);
  }

  async unlockAccount(userId: string): Promise<void> {
    await this.resetAttempts(userId);
  }

  async resetAttempts(userId: string): Promise<void> {
    const record = this.storage.get(userId);
    if (record) {
      record.attempts = 0;
      record.lockedAt = null;
      record.lockedUntil = null;
      this.storage.set(userId, record);
    }

    // Clear history for this user
    this.history.delete(userId);
  }

  async getLockoutHistory(userId: string, limit: number = 10): Promise<Date[]> {
    const history = this.history.get(userId) || [];
    return history
      .slice(-limit)
      .reverse()
      .map((timestamp) => new Date(timestamp));
  }

  async getLockoutStats(userId: string): Promise<{
    totalFailedAttempts: number;
    lockoutCount: number;
    lastLockout: Date | null;
    averageAttemptsBeforeLockout: number;
  }> {
    const history = this.history.get(userId) || [];
    const totalFailedAttempts = history.length;
    const lockoutCount = Math.floor(
      totalFailedAttempts / this.config.maxAttempts,
    );

    let lastLockout: Date | null = null;
    const record = this.storage.get(userId);
    if (record && record.lockedAt !== null) {
      lastLockout = new Date(record.lockedAt);
    }

    // Average attempts before lockout is just the threshold for simplicity
    const averageAttemptsBeforeLockout =
      lockoutCount > 0 ? this.config.maxAttempts : 0;

    return {
      totalFailedAttempts,
      lockoutCount,
      lastLockout,
      averageAttemptsBeforeLockout,
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


