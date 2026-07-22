import { createRequire } from "module";
const _require = createRequire(import.meta.url);
const modPath = "node:" + "sqlite";
const { DatabaseSync } = _require(modPath) as typeof import("node:sqlite");
import { randomBytes } from "crypto";
import {
  AuditLog,
  AuditAction,
  AuditLogFilter,
  AuditRetentionConfig,
  DEFAULT_RETENTION_CONFIG,
} from "./audit-log.js";

export class SQLiteAuditLogger {
  private db: any = null;
  private prefix: string;
  private retentionDays: number;
  private externalDb: boolean;
  private options: { db?: any; path?: string };

  constructor(
    options: { db?: any; path?: string } = {},
    retentionDays: number = DEFAULT_RETENTION_CONFIG.retentionDays,
    prefix: string = "kyro:audit:",
  ) {
    this.options = options;
    this.prefix = prefix;
    this.retentionDays = retentionDays;
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
      CREATE TABLE IF NOT EXISTS kyro_audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        action TEXT NOT NULL,
        userId TEXT,
        userEmail TEXT,
        role TEXT,
        resource TEXT NOT NULL,
        resourceId TEXT,
        ipAddress TEXT,
        userAgent TEXT,
        success INTEGER NOT NULL,
        error TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      
      CREATE INDEX IF NOT EXISTS idx_kyro_audit_logs_timestamp ON kyro_audit_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_kyro_audit_logs_action ON kyro_audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_kyro_audit_logs_userId ON kyro_audit_logs(userId);
      CREATE INDEX IF NOT EXISTS idx_kyro_audit_logs_resource ON kyro_audit_logs(resource);
      CREATE INDEX IF NOT EXISTS idx_kyro_audit_logs_success ON kyro_audit_logs(success);
    `);
  }

  async log(data: Omit<AuditLog, "id" | "timestamp">): Promise<string> {
    if (!this.db) throw new Error("Not connected");

    const id = randomBytes(16).toString("hex");
    const timestamp = new Date().toISOString();

    const {
      action,
      userId,
      userEmail,
      role,
      resource,
      resourceId,
      changes,
      ipAddress,
      userAgent,
      success,
      error,
      metadata,
    } = data;

    this.db
      .prepare(
        `
        INSERT INTO kyro_audit_logs (
          id, timestamp, action, userId, userEmail, role, resource, resourceId,
          changes, ipAddress, userAgent, success, error, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        id,
        timestamp,
        action,
        userId || null,
        userEmail || null,
        role || null,
        resource,
        resourceId || null,
        changes ? JSON.stringify(changes) : null,
        ipAddress || null,
        userAgent || null,
        success ? 1 : 0,
        error || null,
        metadata ? JSON.stringify(metadata) : null,
      );

    return id;
  }

  async get(id: string): Promise<AuditLog | null> {
    if (!this.db) throw new Error("Not connected");

    const row = this.db
      .prepare("SELECT * FROM kyro_audit_logs WHERE id = ?")
      .get(id) as
      | {
          id: string;
          timestamp: string;
          action: string;
          userId: string | null;
          userEmail: string | null;
          role: string | null;
          resource: string;
          resourceId: string | null;
          changes: string | null;
          ipAddress: string | null;
          userAgent: string | null;
          success: number;
          error: string | null;
          metadata: string | null;
        }
      | undefined;

    if (!row) return null;

    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      action: row.action as AuditAction,
      userId: row.userId !== null ? row.userId : undefined,
      userEmail: row.userEmail !== null ? row.userEmail : undefined,
      role: row.role !== null ? row.role : undefined,
      resource: row.resource,
      resourceId: row.resourceId !== null ? row.resourceId : undefined,
      changes: row.changes !== null ? JSON.parse(row.changes) : undefined,
      ipAddress: row.ipAddress !== null ? row.ipAddress : undefined,
      userAgent: row.userAgent !== null ? row.userAgent : undefined,
      success: row.success === 1,
      error: row.error !== null ? row.error : undefined,
      metadata: row.metadata !== null ? JSON.parse(row.metadata) : undefined,
    };
  }

  async query(filter: AuditLogFilter = {}): Promise<{
    logs: AuditLog[];
    total: number;
  }> {
    if (!this.db) throw new Error("Not connected");

    const { limit = 50, offset = 0 } = filter;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.userId) {
      conditions.push("userId = ?");
      params.push(filter.userId);
    }

    if (filter.action) {
      const actions = Array.isArray(filter.action)
        ? filter.action
        : [filter.action];
      const placeholders = actions.map(() => "?").join(", ");
      conditions.push(`action IN (${placeholders})`);
      params.push(...actions);
    }

    if (filter.resource) {
      conditions.push("resource = ?");
      params.push(filter.resource);
    }

    if (filter.resourceId) {
      conditions.push("resourceId = ?");
      params.push(filter.resourceId);
    }

    if (filter.success !== undefined) {
      conditions.push("success = ?");
      params.push(filter.success ? 1 : 0);
    }

    if (filter.startDate) {
      conditions.push("timestamp >= ?");
      params.push(filter.startDate.toISOString());
    }

    if (filter.endDate) {
      conditions.push("timestamp <= ?");
      params.push(filter.endDate.toISOString());
    }

    const whereClause =
      conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    // Get total count
    const countResult = this.db
      .prepare(`SELECT COUNT(*) as total FROM kyro_audit_logs ${whereClause}`)
      .get(...params) as { total: number };
    const total = countResult.total;

    // Get logs with pagination
    const rows = this.db
      .prepare(
        `
        SELECT * FROM kyro_audit_logs 
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `,
      )
      .all(...params, limit, offset) as {
      id: string;
      timestamp: string;
      action: string;
      userId: string | null;
      userEmail: string | null;
      role: string | null;
      resource: string;
      resourceId: string | null;
      changes: string | null;
      ipAddress: string | null;
      userAgent: string | null;
      success: number;
      error: string | null;
      metadata: string | null;
    }[];

    const logs: AuditLog[] = rows.map((row) => ({
      id: row.id,
      timestamp: new Date(row.timestamp),
      action: row.action as AuditAction,
      userId: row.userId !== null ? row.userId : undefined,
      userEmail: row.userEmail !== null ? row.userEmail : undefined,
      role: row.role !== null ? row.role : undefined,
      resource: row.resource,
      resourceId: row.resourceId !== null ? row.resourceId : undefined,
      changes: row.changes !== null ? JSON.parse(row.changes) : undefined,
      ipAddress: row.ipAddress !== null ? row.ipAddress : undefined,
      userAgent: row.userAgent !== null ? row.userAgent : undefined,
      success: row.success === 1,
      error: row.error !== null ? row.error : undefined,
      metadata: row.metadata !== null ? JSON.parse(row.metadata) : undefined,
    }));

    return { logs, total };
  }

  async getRecent(limit: number = 50): Promise<AuditLog[]> {
    if (!this.db) throw new Error("Not connected");

    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

    const rows = this.db
      .prepare(
        `
         SELECT * FROM kyro_audit_logs 
         WHERE timestamp >= ?
         ORDER BY timestamp DESC
         LIMIT ?
       `,
      )
      .all(cutoffDate.toISOString(), limit) as {
      id: string;
      timestamp: string;
      action: string;
      userId: string | null;
      userEmail: string | null;
      role: string | null;
      resource: string;
      resourceId: string | null;
      changes: string | null;
      ipAddress: string | null;
      userAgent: string | null;
      success: number;
      error: string | null;
      metadata: string | null;
    }[];

    const logs: AuditLog[] = rows.map((row) => ({
      id: row.id,
      timestamp: new Date(row.timestamp),
      action: row.action as AuditAction,
      userId: row.userId !== null ? row.userId : undefined,
      userEmail: row.userEmail !== null ? row.userEmail : undefined,
      role: row.role !== null ? row.role : undefined,
      resource: row.resource,
      resourceId: row.resourceId !== null ? row.resourceId : undefined,
      changes: row.changes !== null ? JSON.parse(row.changes) : undefined,
      ipAddress: row.ipAddress !== null ? row.ipAddress : undefined,
      userAgent: row.userAgent !== null ? row.userAgent : undefined,
      success: row.success === 1,
      error: row.error !== null ? row.error : undefined,
      metadata: row.metadata !== null ? JSON.parse(row.metadata) : undefined,
    }));

    return logs;
  }

  async getUserActivity(
    userId: string,
    limit: number = 50,
  ): Promise<AuditLog[]> {
    if (!this.db) throw new Error("Not connected");

    const rows = this.db
      .prepare(
        `
         SELECT * FROM kyro_audit_logs 
         WHERE userId = ?
         ORDER BY timestamp DESC
         LIMIT ?
       `,
      )
      .all(userId, limit) as {
      id: string;
      timestamp: string;
      action: string;
      userId: string | null;
      userEmail: string | null;
      role: string | null;
      resource: string;
      resourceId: string | null;
      changes: string | null;
      ipAddress: string | null;
      userAgent: string | null;
      success: number;
      error: string | null;
      metadata: string | null;
    }[];

    const logs: AuditLog[] = rows.map((row) => ({
      id: row.id,
      timestamp: new Date(row.timestamp),
      action: row.action as AuditAction,
      userId: row.userId !== null ? row.userId : undefined,
      userEmail: row.userEmail !== null ? row.userEmail : undefined,
      role: row.role !== null ? row.role : undefined,
      resource: row.resource,
      resourceId: row.resourceId !== null ? row.resourceId : undefined,
      changes: row.changes !== null ? JSON.parse(row.changes) : undefined,
      ipAddress: row.ipAddress !== null ? row.ipAddress : undefined,
      userAgent: row.userAgent !== null ? row.userAgent : undefined,
      success: row.success === 1,
      error: row.error !== null ? row.error : undefined,
      metadata: row.metadata !== null ? JSON.parse(row.metadata) : undefined,
    }));

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
    if (!this.db) throw new Error("Not connected");

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    const end = endDate || new Date();

    const rows = this.db
      .prepare(
        `
        SELECT * FROM kyro_audit_logs 
        WHERE timestamp >= ? AND timestamp <= ?
      `,
      )
      .all(start.toISOString(), end.toISOString()) as {
      id: string;
      timestamp: string;
      action: string;
      userId: string | null;
      userEmail: string | null;
      role: string | null;
      resource: string;
      resourceId: string | null;
      changes: string | null;
      ipAddress: string | null;
      userAgent: string | null;
      success: number;
      error: string | null;
      metadata: string | null;
    }[];

    const byAction: Record<string, number> = {};
    let totalEvents = 0;
    let failedLogins = 0;
    let successCount = 0;
    const uniqueUsers = new Set<string>();

    for (const row of rows) {
      totalEvents++;

      const action = row.action;
      byAction[action] = (byAction[action] || 0) + 1;

      if (row.success === 1) {
        successCount++;
      }

      if (action === "login_failed") {
        failedLogins++;
      }

      if (row.userId) {
        uniqueUsers.add(row.userId);
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
    if (!this.db) throw new Error("Not connected");

    const cutoffDate = new Date(
      Date.now() - this.retentionDays * 24 * 60 * 60 * 1000,
    );

    const result = this.db
      .prepare("DELETE FROM kyro_audit_logs WHERE timestamp < ?")
      .run(cutoffDate.toISOString());

    return result.changes;
  }
}


