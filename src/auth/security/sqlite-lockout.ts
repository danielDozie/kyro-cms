import { createRequire } from "module";
let DatabaseSync: typeof import("node:sqlite").DatabaseSync;
function getDatabaseSync() {
  if (DatabaseSync) return DatabaseSync;
  // Fallback for environments like Cloudflare Workers where import.meta.url is undefined
  const _require = createRequire("file:///");
  DatabaseSync = _require("node:sqlite").DatabaseSync;
  return DatabaseSync;
}
import { LockoutConfig, LockoutStatus } from "./lockout.js";

export class SQLiteAccountLockout {
  private db: any = null;
  private prefix: string;
  private config: LockoutConfig;
  private externalDb: boolean;
  private options: { db?: any; path?: string };

  constructor(
    options: { db?: any; path?: string } = {},
    config: Partial<LockoutConfig> = {},
    prefix: string = "kyro:lockout:",
  ) {
    this.options = options;
    this.prefix = prefix;
    this.config = {
      maxAttempts: 5,
      lockDuration: 900000, // 15 minutes
      notifyUser: true,
      notifyAdmin: true,
      adminNotifyAfter: 3,
      ...config,
    };
    this.externalDb = !!options.db;

    if (options.db) {
      this.db = options.db;
    }
  }

  async connect(): Promise<void> {
    if (this.db) return;

    const path = (this.options as { path?: string }).path || "./data.db";
    this.db = new (getDatabaseSync())(path);
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
      CREATE TABLE IF NOT EXISTS kyro_lockout (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_attempt INTEGER,
        locked_at INTEGER,
        locked_until INTEGER,
        UNIQUE(user_id)
      );
      
      CREATE TABLE IF NOT EXISTS kyro_lockout_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        attempt_time INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES kyro_lockout(user_id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_kyro_lockout_user_id ON kyro_lockout(user_id);
      CREATE INDEX IF NOT EXISTS idx_kyro_lockout_locked_until ON kyro_lockout(locked_until);
      CREATE INDEX IF NOT EXISTS idx_kyro_lockout_history_user_id ON kyro_lockout_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_kyro_lockout_history_time ON kyro_lockout_history(attempt_time);
    `);
  }

  private lockKey(userId: string): string {
    return userId;
  }

  private async cleanupExpired(): Promise<void> {
    if (!this.db) return;
    const now = Date.now();
    this.db
      .prepare(
        "UPDATE kyro_lockout SET attempts = 0, locked_at = NULL, locked_until = NULL WHERE locked_until < ?",
      )
      .run(now);
  }

  async checkLockout(userId: string): Promise<LockoutStatus> {
    if (!this.db) throw new Error("Not connected");

    await this.cleanupExpired();

    const lockResult = this.db
      .prepare("SELECT * FROM kyro_lockout WHERE user_id = ?")
      .get(userId) as
      | {
          attempts: number;
          last_attempt: number | null;
          locked_at: number | null;
          locked_until: number | null;
        }
      | undefined;

    if (!lockResult) {
      return {
        locked: false,
        attemptsRemaining: this.config.maxAttempts,
        totalAttempts: 0,
      };
    }

    const { attempts, locked_until } = lockResult;

    if (locked_until !== null && locked_until > Date.now()) {
      return {
        locked: true,
        attemptsRemaining: 0,
        lockedUntil: new Date(locked_until),
        totalAttempts: attempts,
      };
    }

    // If lock expired, reset attempts
    if (locked_until !== null && locked_until <= Date.now()) {
      await this.resetAttempts(userId);
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
    if (!this.db) throw new Error("Not connected");

    await this.cleanupExpired();
    const now = Date.now();

    // Get or create lockout record
    const lockResult = this.db
      .prepare("SELECT attempts FROM kyro_lockout WHERE user_id = ?")
      .get(userId) as { attempts: number } | undefined;

    let attempts = lockResult ? lockResult.attempts : 0;
    attempts += 1;

    // Update attempts and last attempt time
    this.db
      .prepare(
        `
        INSERT INTO kyro_lockout (user_id, attempts, last_attempt) 
        VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET 
          attempts = excluded.attempts,
          last_attempt = excluded.last_attempt
      `,
      )
      .run(userId, attempts, now);

    // Add to history
    this.db
      .prepare(
        "INSERT INTO kyro_lockout_history (user_id, attempt_time) VALUES (?, ?)",
      )
      .run(userId, now);

    // Keep only last 100 history entries per user
    this.db
      .prepare(
        `
        DELETE FROM kyro_lockout_history 
        WHERE id IN (
          SELECT id FROM kyro_lockout_history 
          WHERE user_id = ? 
          ORDER BY attempt_time DESC 
          LIMIT -1 OFFSET 100
        )
      `,
      )
      .run(userId);

    // Check if we should lock the account
    if (attempts >= this.config.maxAttempts) {
      const lockedUntil = new Date(now + this.config.lockDuration);

      this.db
        .prepare(
          `
          UPDATE kyro_lockout 
          SET locked_at = ?, locked_until = ? 
          WHERE user_id = ?
        `,
        )
        .run(now, lockedUntil.getTime(), userId);

      return {
        locked: true,
        attemptsRemaining: 0,
        lockedUntil,
        totalAttempts: attempts,
      };
    }

    return {
      locked: false,
      attemptsRemaining: Math.max(0, this.config.maxAttempts - attempts),
      totalAttempts: attempts,
    };
  }

  async lockAccount(userId: string, duration?: number): Promise<void> {
    if (!this.db) throw new Error("Not connected");

    const now = Date.now();
    const lockDuration = duration || this.config.lockDuration;
    const lockedUntil = new Date(now + lockDuration);

    this.db
      .prepare(
        `
        INSERT INTO kyro_lockout (user_id, attempts, locked_at, locked_until) 
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          attempts = excluded.attempts,
          locked_at = excluded.locked_at,
          locked_until = excluded.locked_until
      `,
      )
      .run(userId, this.config.maxAttempts, now, lockedUntil.getTime());
  }

  async unlockAccount(userId: string): Promise<void> {
    if (!this.db) throw new Error("Not connected");

    this.db
      .prepare(
        `
        UPDATE kyro_lockout 
        SET attempts = 0, locked_at = NULL, locked_until = NULL 
        WHERE user_id = ?
      `,
      )
      .run(userId);
  }

  async resetAttempts(userId: string): Promise<void> {
    if (!this.db) throw new Error("Not connected");

    this.db
      .prepare(
        `
        UPDATE kyro_lockout 
        SET attempts = 0, locked_at = NULL, locked_until = NULL 
        WHERE user_id = ?
      `,
      )
      .run(userId);
  }

  async getLockoutHistory(userId: string, limit: number = 10): Promise<Date[]> {
    if (!this.db) throw new Error("Not connected");

    const rows = this.db
      .prepare(
        `
        SELECT attempt_time FROM kyro_lockout_history 
        WHERE user_id = ? 
        ORDER BY attempt_time DESC 
        LIMIT ?
      `,
      )
      .all(userId, limit) as { attempt_time: number }[];

    return rows.map((row) => new Date(row.attempt_time));
  }

  async getLockoutStats(userId: string): Promise<{
    totalFailedAttempts: number;
    lockoutCount: number;
    lastLockout: Date | null;
    averageAttemptsBeforeLockout: number;
  }> {
    if (!this.db) throw new Error("Not connected");

    // Get total failed attempts (history count)
    const totalResult = this.db
      .prepare(
        "SELECT COUNT(*) as count FROM kyro_lockout_history WHERE user_id = ?",
      )
      .get(userId) as { count: number } | undefined;
    const totalFailedAttempts = totalResult ? totalResult.count : 0;

    // Get lockout count (every maxAttempts attempts)
    const lockoutCount = Math.floor(
      totalFailedAttempts / this.config.maxAttempts,
    );

    // Get last lockout time
    const lastLockoutResult = this.db
      .prepare(
        "SELECT locked_at FROM kyro_lockout WHERE user_id = ? AND locked_at IS NOT NULL",
      )
      .get(userId) as { locked_at: number } | undefined;
    const lastLockout = lastLockoutResult
      ? new Date(lastLockoutResult.locked_at)
      : null;

    // Average attempts before lockout is just the threshold
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


