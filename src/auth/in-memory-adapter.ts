import { randomBytes } from "crypto";
import type { AuthAdapter, AuthUser, Session, UserRole } from "./types.js";

export class InMemoryAuthAdapter implements AuthAdapter {
  private users: Map<string, AuthUser> = new Map();
  private sessions: Map<string, Session> = new Map();
  private refreshTokens: Map<string, string> = new Map();
  private emailToUserId: Map<string, string> = new Map();
  private passwordHistory: Map<string, string[]> = new Map();
  private emailVerificationTokens: Map<string, { userId: string; expiresAt: Date }> = new Map();
  private passwordResetTokens: Map<string, { userId: string; expiresAt: Date }> = new Map();
  private auditLogs: Array<Record<string, unknown>> = [];
  private externalDb: boolean = false;

  constructor() {}

  async connect(): Promise<void> {
    // No connection needed for in-memory adapter
  }

  async disconnect(): Promise<void> {
    // No disconnection needed for in-memory adapter
    this.users.clear();
    this.sessions.clear();
    this.refreshTokens.clear();
    this.emailToUserId.clear();
    this.passwordHistory.clear();
  }

  async createUser(data: {
    email: string;
    password: string;
    name?: string;
    role?: UserRole;
    avatar?: string;
    tenantId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<AuthUser> {
    const userId = randomBytes(16).toString("hex");
    const now = new Date().toISOString();
    const passwordHash = await this.hashPassword(data.password);

    const user: AuthUser = {
      id: userId,
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      role: (data.role || "customer") as UserRole,
      avatar: data.avatar,
      tenantId: data.tenantId,
      metadata: data.metadata,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(userId, user);
    this.emailToUserId.set(data.email.toLowerCase(), userId);
    this.passwordHistory.set(userId, []);

    return user;
  }

  async findUserByEmail(email: string): Promise<AuthUser | null> {
    const userId = this.emailToUserId.get(email.toLowerCase());
    if (!userId) return null;
    return this.findUserById(userId);
  }

  async findUserById(userId: string): Promise<AuthUser | null> {
    return this.users.get(userId) || null;
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

    // Handle email change
    if (data.email && data.email !== existing.email) {
      this.emailToUserId.delete(existing.email.toLowerCase());
      this.emailToUserId.set(data.email.toLowerCase(), userId);
    }

    this.users.set(userId, updated);
    return updated;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const user = await this.findUserById(userId);
    if (!user) return false;

    this.users.delete(userId);
    this.emailToUserId.delete(user.email.toLowerCase());
    this.refreshTokens.forEach((sessionId, refreshToken) => {
      if (this.sessions.get(sessionId)?.userId === userId) {
        this.refreshTokens.delete(refreshToken);
        this.sessions.delete(sessionId);
      }
    });
    this.passwordHistory.delete(userId);
    this.sessions.forEach((session, sessionId) => {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
      }
    });

    return true;
  }

  async hashPassword(password: string): Promise<string> {
    const bcrypt = (await import("bcryptjs")).default;
    return bcrypt.hash(password, 12);
  }

  async verifyPassword(
    email: string,
    password: string,
  ): Promise<AuthUser | null> {
    const user = await this.findUserByEmail(email);
    if (!user || !user.passwordHash) return null;
    const bcrypt = (await import("bcryptjs")).default;
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
      expiresAt: new Date(now.getTime() + 86400 * 1000).toISOString(), // 24 hours
      createdAt: now.toISOString(),
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    };

    this.sessions.set(sessionId, session);
    this.refreshTokens.set(refreshToken, sessionId);

    return session;
  }

  async findSessionByToken(token: string): Promise<Session | null> {
    return this.sessions.get(token) || null;
  }

  async findSessionByRefreshToken(
    refreshToken: string,
  ): Promise<Session | null> {
    const sessionId = this.refreshTokens.get(refreshToken);
    if (!sessionId) return null;
    const session = this.sessions.get(sessionId);
    return session || null;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (session.refreshToken) {
      this.refreshTokens.delete(session.refreshToken);
    }
    this.sessions.delete(sessionId);
    return true;
  }

  async deleteUserSessions(userId: string): Promise<number> {
    let deleted = 0;
    this.sessions.forEach((session, sessionId) => {
      if (session.userId === userId) {
        if (session.refreshToken) {
          this.refreshTokens.delete(session.refreshToken);
        }
        this.sessions.delete(sessionId);
        deleted++;
      }
    });
    return deleted;
  }

  async addPasswordToHistory(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    const history = this.passwordHistory.get(userId) || [];
    history.push(passwordHash);
    // Keep only last 5 passwords
    if (history.length > 5) {
      history.splice(0, history.length - 5);
    }
    this.passwordHistory.set(userId, history);
  }

  async getPasswordHistory(
    userId: string,
    count: number = 5,
  ): Promise<string[]> {
    return this.passwordHistory.get(userId) || [];
  }

  async isPasswordInHistory(
    password: string,
    userId: string,
    historyCount: number = 5,
  ): Promise<boolean> {
    const history = await this.getPasswordHistory(userId, historyCount);
    const bcrypt = (await import("bcryptjs")).default;

    for (const hash of history) {
      if (await bcrypt.compare(password, hash)) {
        return true;
      }
    }
    return false;
  }

  async createEmailVerificationToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    this.emailVerificationTokens.set(token, { userId, expiresAt });
    return { token, expiresAt };
  }

  async verifyEmailToken(token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
    const data = this.emailVerificationTokens.get(token);
    if (!data || data.expiresAt < new Date()) {
      this.emailVerificationTokens.delete(token);
      return { success: false, error: "Invalid or expired token" };
    }
    this.emailVerificationTokens.delete(token);
    return { success: true, userId: data.userId };
  }

  async createPasswordResetToken(email: string): Promise<{ token: string; expiresAt: Date; error?: string }> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      return { token: "", expiresAt: new Date(), error: "User not found" };
    }
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    this.passwordResetTokens.set(token, { userId: user.id, expiresAt });
    return { token, expiresAt };
  }

  async resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const data = this.passwordResetTokens.get(token);
    if (!data || data.expiresAt < new Date()) {
      this.passwordResetTokens.delete(token);
      return { success: false, error: "Invalid or expired token" };
    }
    const passwordHash = await this.hashPassword(newPassword);
    await this.updateUser(data.userId, { passwordHash });
    this.passwordResetTokens.delete(token);
    return { success: true };
  }

  async hasAnyUsers(): Promise<boolean> {
    return this.users.size > 0;
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
    let logs = this.auditLogs.slice().reverse();
    if (filter.userId) logs = logs.filter((l) => l.userId === filter.userId);
    if (filter.action) {
      if (Array.isArray(filter.action)) {
        logs = logs.filter((l) => filter.action!.includes(String(l.action)));
      } else {
        logs = logs.filter((l) => l.action === filter.action);
      }
    }
    if (filter.resource)
      logs = logs.filter((l) => l.resource === filter.resource);
    if (filter.success !== undefined)
      logs = logs.filter((l) => l.success === filter.success);
    return { logs: logs.slice(offset, offset + limit), total: logs.length };
  }

  async createAuditLog(data: any): Promise<any> {
    const id = randomBytes(16).toString("hex");
    const timestamp = new Date();
    const log = { ...data, id, timestamp };
    this.auditLogs.push(log);
    return log;
  }
}

export function createInMemoryAuthAdapter() {
  return new InMemoryAuthAdapter();
}
