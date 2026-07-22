import { randomBytes } from "crypto";
import type { AuditLog, AuditAction, AuditLogFilter } from "./audit-log.js";
import { DEFAULT_RETENTION_CONFIG } from "./audit-log.js";

export class InMemoryAuditLogger {
  private logs: AuditLog[] = [];
  private retentionDays: number;

  constructor(retentionDays: number = DEFAULT_RETENTION_CONFIG.retentionDays) {
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

    this.logs.push(log);
    this.cleanupOldLogs();

    return id;
  }

  async get(id: string): Promise<AuditLog | null> {
    return this.logs.find((log) => log.id === id) || null;
  }

  async query(filter: AuditLogFilter = {}): Promise<{
    logs: AuditLog[];
    total: number;
  }> {
    const { limit = 50, offset = 0 } = filter;

    let filteredLogs = [...this.logs]; // Create a copy to avoid modifying original

    if (filter.userId) {
      filteredLogs = filteredLogs.filter((log) => log.userId === filter.userId);
    }

    if (filter.action) {
      const actions = Array.isArray(filter.action)
        ? filter.action
        : [filter.action];
      filteredLogs = filteredLogs.filter((log) => actions.includes(log.action));
    }

    if (filter.resource) {
      filteredLogs = filteredLogs.filter(
        (log) => log.resource === filter.resource,
      );
    }

    if (filter.resourceId) {
      filteredLogs = filteredLogs.filter(
        (log) => log.resourceId === filter.resourceId,
      );
    }

    if (filter.success !== undefined) {
      filteredLogs = filteredLogs.filter(
        (log) => log.success === filter.success,
      );
    }

    const startDate = filter.startDate;
    const endDate = filter.endDate;

    if (startDate !== undefined) {
      filteredLogs = filteredLogs.filter((log) => log.timestamp >= startDate);
    }

    if (endDate !== undefined) {
      filteredLogs = filteredLogs.filter((log) => log.timestamp <= endDate);
    }

    // Sort by timestamp descending (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = filteredLogs.length;
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    return { logs: paginatedLogs, total };
  }

  async getRecent(limit: number = 50): Promise<AuditLog[]> {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

    const recentLogs = this.logs
      .filter((log) => log.timestamp >= cutoffDate)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    return recentLogs;
  }

  async getUserActivity(
    userId: string,
    limit: number = 50,
  ): Promise<AuditLog[]> {
    const userLogs = this.logs
      .filter((log) => log.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    return userLogs;
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
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    const end = endDate || new Date();

    const filteredLogs = this.logs.filter(
      (log) => log.timestamp >= start && log.timestamp <= end,
    );

    const byAction: Record<string, number> = {};
    let totalEvents = 0;
    let failedLogins = 0;
    let successCount = 0;
    const uniqueUsers = new Set<string>();

    for (const log of filteredLogs) {
      totalEvents++;

      const action = log.action;
      byAction[action] = (byAction[action] || 0) + 1;

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

    return {
      totalEvents,
      byAction,
      successRate: totalEvents > 0 ? successCount / totalEvents : 1,
      failedLogins,
      uniqueUsers,
    };
  }

  async cleanup(): Promise<number> {
    const cutoffDate = new Date(
      Date.now() - this.retentionDays * 24 * 60 * 60 * 1000,
    );
    const initialCount = this.logs.length;

    this.logs = this.logs.filter((log) => log.timestamp >= cutoffDate);

    return initialCount - this.logs.length;
  }

  private cleanupOldLogs(): void {
    // This is called automatically after each log entry
    // In a production system, you might want to run this less frequently
    const cutoffDate = new Date(
      Date.now() - this.retentionDays * 24 * 60 * 60 * 1000,
    );
    const initialCount = this.logs.length;

    this.logs = this.logs.filter((log) => log.timestamp >= cutoffDate);
  }
}



import { createAuditContext } from "./context.js";
export { createAuditContext };
