import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "crypto";
import type {
  AuthAdapter,
  AuthUser,
  Session,
  UserRole,
} from "../../auth/types.js";
import type {
  AuditLog,
  AuditLogFilter,
} from "../../auth/security/audit-log.js";

export interface MongoDBAuthAdapterOptions {
  db?: any | (() => any);
  adapter?: any;
  collectionPrefix?: string;
  sessionTTL?: number;
  refreshTokenTTL?: number;
}

export class MongoDBAuthAdapter implements AuthAdapter {
  private db: any;
  private adapter: any;
  private prefix: string;
  private sessionTTL: number;
  private refreshTokenTTL: number;
  private indexesEnsured = false;

  constructor(options: MongoDBAuthAdapterOptions) {
    this.db = options.db;
    this.adapter = options.adapter;
    this.prefix = options.collectionPrefix || "";
    this.sessionTTL = options.sessionTTL || 86400;
    this.refreshTokenTTL = options.refreshTokenTTL || 604800;
  }

  private getDatabase(): any {
    let resolved = typeof this.db === 'function' ? this.db() : this.db;
    if (!resolved && this.adapter) {
      if (this.adapter.db) {
        resolved = this.adapter.db;
      } else if (this.adapter.client) {
        this.adapter.db = this.adapter.client.db(this.adapter.database || "kyro_cms");
        resolved = this.adapter.db;
      }
    }
    if (!resolved && (globalThis as any).__KYRO_INSTANCE__?.db) {
      const globalDb = (globalThis as any).__KYRO_INSTANCE__.db;
      if (globalDb.db) {
        resolved = globalDb.db;
      } else if (globalDb.client) {
        globalDb.db = globalDb.client.db(globalDb.database || "kyro_cms");
        resolved = globalDb.db;
      }
    }
    if (!resolved) throw new Error("MongoDB database not initialized");
    return resolved;
  }

  private col(name: string): any {
    return this.getDatabase().collection(`${this.prefix}${name}`);
  }

  async connect(): Promise<void> {
    if (this.adapter && !this.adapter.connected) {
      await this.adapter.connect();
    }
    if (!this.indexesEnsured) {
      await this.ensureIndexes();
    }
  }

  async disconnect(): Promise<void> {
  }

  private async ensureIndexes(): Promise<void> {
    await this.col("users").createIndex({ email: 1 }, { unique: true });
    await this.col("users").createIndex({ tenantId: 1 });
    await this.col("users").createIndex({ role: 1 });

    await this.col("sessions").createIndex({ token: 1 }, { unique: true });
    await this.col("sessions").createIndex({ refreshToken: 1 });
    await this.col("sessions").createIndex({ userId: 1 });
    await this.col("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    await this.col("audit_logs").createIndex({ timestamp: -1 });
    await this.col("audit_logs").createIndex({ userId: 1 });
    await this.col("audit_logs").createIndex({ action: 1 });
    await this.col("audit_logs").createIndex({ resource: 1 });

    await this.col("password_history").createIndex({ userId: 1, createdAt: -1 });

    await this.col("lockouts").createIndex({ userId: 1 }, { unique: true });
    await this.col("lockouts").createIndex({ lockedUntil: 1 });

    this.indexesEnsured = true;
  }

  async createUser(data: {
    email: string;
    password: string;
    name?: string;
    role?: UserRole;
    avatar?: string;
    tenantId?: string;
  }): Promise<AuthUser> {
    const id = randomUUID();
    const now = new Date();
    const passwordHash = await this.hashPassword(data.password);
    const user = {
      _id: id,
      name: data.name || null,
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role || "customer",
      avatar: data.avatar || null,
      tenantId: data.tenantId || null,
      emailVerified: false,
      locked: false,
      lastLogin: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    };
    await this.col("users").insertOne(user);
    return this.docToAuthUser(user);
  }

  async findUserByEmail(email: string): Promise<AuthUser | null> {
    const doc = await this.col("users").findOne({ email: email.toLowerCase() });
    return doc ? this.docToAuthUser(doc) : null;
  }

  async findUserById(id: string): Promise<AuthUser | null> {
    const doc = await this.col("users").findOne({ _id: id });
    return doc ? this.docToAuthUser(doc) : null;
  }

  async updateUser(
    id: string,
    data: Partial<AuthUser>,
  ): Promise<AuthUser | null> {
    const setData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) setData.name = data.name;
    if (data.email !== undefined) setData.email = data.email;
    if (data.passwordHash !== undefined) setData.passwordHash = data.passwordHash;
    if (data.role !== undefined) setData.role = data.role;
    if (data.avatar !== undefined) setData.avatar = data.avatar;
    if (data.tenantId !== undefined) setData.tenantId = data.tenantId;
    if (data.emailVerified !== undefined) setData.emailVerified = data.emailVerified;
    if (data.locked !== undefined) setData.locked = data.locked;
    if (data.lastLogin !== undefined) setData.lastLogin = data.lastLogin ? new Date(data.lastLogin) : null;
    if (data.failedLoginAttempts !== undefined) setData.failedLoginAttempts = data.failedLoginAttempts;

    const result = await this.col("users").findOneAndUpdate(
      { _id: id },
      { $set: setData },
      { returnDocument: "after" },
    );
    return result ? this.docToAuthUser(result) : null;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.col("users").deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  async verifyPassword(
    email: string,
    password: string,
  ): Promise<AuthUser | null> {
    const user = await this.findUserByEmail(email);
    if (!user) return null;
    const doc = await this.col("users").findOne(
      { email: email.toLowerCase() },
      { projection: { passwordHash: 1 } },
    );
    if (!doc?.passwordHash) return null;
    const valid = await bcrypt.compare(password, doc.passwordHash);
    return valid ? user : null;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async createSession(
    userId: string,
    data?: { ipAddress?: string; userAgent?: string },
  ): Promise<Session> {
    const id = randomUUID();
    const token = randomBytes(32).toString("base64url");
    const refreshToken = randomBytes(32).toString("base64url");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionTTL * 1000);

    const session = {
      _id: id,
      userId,
      token,
      refreshToken,
      ipAddress: data?.ipAddress || null,
      userAgent: data?.userAgent || null,
      expiresAt,
      createdAt: now,
    };

    await this.col("sessions").insertOne(session);
    return this.docToSession(session);
  }

  async findSessionByToken(token: string): Promise<Session | null> {
    const doc = await this.col("sessions").findOne({
      token,
      expiresAt: { $gt: new Date() },
    });
    return doc ? this.docToSession(doc) : null;
  }

  async findSessionByRefreshToken(
    refreshToken: string,
  ): Promise<Session | null> {
    const doc = await this.col("sessions").findOne({
      refreshToken,
      expiresAt: { $gt: new Date() },
    });
    return doc ? this.docToSession(doc) : null;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const result = await this.col("sessions").deleteOne({ _id: sessionId });
    return result.deletedCount > 0;
  }

  async deleteUserSessions(userId: string): Promise<number> {
    const result = await this.col("sessions").deleteMany({ userId });
    return result.deletedCount;
  }

  async hasAnyUsers(): Promise<boolean> {
    const count = await this.col("users").countDocuments();
    return count > 0;
  }

  async addPasswordToHistory(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await this.col("password_history").insertOne({
      userId,
      passwordHash,
      createdAt: new Date(),
    });
  }

  async getPasswordHistory(
    userId: string,
    count: number = 5,
  ): Promise<string[]> {
    const docs = await this.col("password_history")
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(count)
      .toArray();
    return docs.map((d: any) => d.passwordHash);
  }

  async isPasswordInHistory(
    password: string,
    userId: string,
    historyCount: number = 5,
  ): Promise<boolean> {
    const history = await this.getPasswordHistory(userId, historyCount);
    for (const hash of history) {
      if (await bcrypt.compare(password, hash)) {
        return true;
      }
    }
    return false;
  }

  async findAuditLogs(
    filter: AuditLogFilter,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const {
      limit = 50,
      offset = 0,
      userId,
      action,
      resource,
      resourceId,
      success,
      startDate,
      endDate,
    } = filter;

    const query: Record<string, any> = {};
    if (userId) query.userId = userId;
    if (action) {
      if (Array.isArray(action)) {
        query.action = { $in: action };
      } else {
        query.action = action;
      }
    }
    if (resource) query.resource = resource;
    if (resourceId) query.resourceId = resourceId;
    if (success !== undefined) query.success = success;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    const total = await this.col("audit_logs").countDocuments(query);
    const docs = await this.col("audit_logs")
      .find(query)
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    return {
      logs: docs.map((doc: any) => ({
        id: doc._id,
        timestamp: doc.timestamp,
        action: doc.action as AuditLog["action"],
        userId: doc.userId || undefined,
        userEmail: doc.userEmail || undefined,
        role: doc.role || undefined,
        resource: doc.resource,
        resourceId: doc.resourceId || undefined,
        changes: doc.changes || undefined,
        ipAddress: doc.ipAddress || undefined,
        userAgent: doc.userAgent || undefined,
        success: doc.success,
        error: doc.error || undefined,
        metadata: doc.metadata || undefined,
      })),
      total,
    };
  }

  async createAuditLog(
    data: Omit<AuditLog, "id" | "timestamp">,
  ): Promise<AuditLog> {
    const id = randomUUID();
    const timestamp = new Date();

    await this.col("audit_logs").insertOne({
      _id: id,
      action: data.action,
      userId: data.userId || null,
      userEmail: data.userEmail || null,
      role: data.role || null,
      resource: data.resource,
      resourceId: data.resourceId || null,
      changes: data.changes || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      success: data.success,
      error: data.error || null,
      metadata: data.metadata || null,
      timestamp,
    });

    return {
      ...data,
      id,
      timestamp,
    };
  }

  private docToAuthUser(doc: any): AuthUser {
    return {
      id: doc._id,
      name: doc.name || undefined,
      email: doc.email,
      passwordHash: doc.passwordHash || undefined,
      role: doc.role as UserRole,
      tenantId: doc.tenantId || undefined,
      avatar: doc.avatar || undefined,
      emailVerified: doc.emailVerified || false,
      locked: doc.locked || false,
      lastLogin: doc.lastLogin?.toISOString?.() || doc.lastLogin || undefined,
      failedLoginAttempts: doc.failedLoginAttempts || 0,
      createdAt: doc.createdAt?.toISOString?.() || doc.createdAt,
      updatedAt: doc.updatedAt?.toISOString?.() || doc.updatedAt,
    };
  }

  private docToSession(doc: any): Session {
    return {
      id: doc._id,
      userId: doc.userId,
      token: doc.token,
      refreshToken: doc.refreshToken || undefined,
      expiresAt: doc.expiresAt?.toISOString?.() || doc.expiresAt,
      createdAt: doc.createdAt?.toISOString?.() || doc.createdAt,
      ipAddress: doc.ipAddress || undefined,
      userAgent: doc.userAgent || undefined,
    };
  }

  async createEmailVerificationToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const mongoMod: any = await import(/* @vite-ignore */ "mongodb" as any);
    const ObjectId = mongoMod.ObjectId ?? mongoMod.default?.ObjectId;
    await this.db.collection("email_verifications").insertOne({
      userId: new ObjectId(userId),
      token,
      expiresAt,
      createdAt: new Date(),
    });

    return { token, expiresAt };
  }

  async verifyEmailToken(token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
    const verification = await this.db.collection("email_verifications").findOne({ token });

    if (!verification) {
      return { success: false, error: "Invalid verification token" };
    }

    if (verification.expiresAt < new Date()) {
      return { success: false, error: "Verification token has expired" };
    }

    await this.db.collection("users").updateOne(
      { _id: verification.userId },
      { $set: { emailVerified: true } }
    );

    await this.db.collection("email_verifications").deleteOne({ _id: verification._id });

    return { success: true, userId: verification.userId.toString() };
  }

  async createPasswordResetToken(email: string): Promise<{ token: string; expiresAt: Date; error?: string }> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      return { token: "", expiresAt: new Date(), error: "User not found" };
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const mongoMod: any = await import(/* @vite-ignore */ "mongodb" as any);
    const ObjectId = mongoMod.ObjectId ?? mongoMod.default?.ObjectId;
    await this.db.collection("password_resets").insertOne({
      userId: new ObjectId(user.id),
      token,
      expiresAt,
      createdAt: new Date(),
    });

    return { token, expiresAt };
  }

  async resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const reset = await this.db.collection("password_resets").findOne({ token });

    if (!reset) {
      return { success: false, error: "Invalid reset token" };
    }

    if (reset.expiresAt < new Date()) {
      return { success: false, error: "Reset token has expired" };
    }

    if (reset.usedAt) {
      return { success: false, error: "Reset token has already been used" };
    }

    const passwordHash = await this.hashPassword(newPassword);

    await this.db.collection("users").updateOne(
      { _id: reset.userId },
      { $set: { passwordHash, updatedAt: new Date() } }
    );

    await this.db.collection("password_resets").updateOne(
      { _id: reset._id },
      { $set: { usedAt: new Date() } }
    );

    await this.db.collection("sessions").deleteMany({ userId: reset.userId });

    return { success: true };
  }
}


