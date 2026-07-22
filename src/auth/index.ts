import type {
  AuthTokenConfig,
  AuthResult,
  LoginCredentials,
  RegisterData,
  AuthUser,
  Session,
  JWTPayload,
  AuthAdapter,
  UserRole,
} from "./types.js";
import type * as jwt from "jsonwebtoken";

export type {
  AuthTokenConfig,
  AuthResult,
  LoginCredentials,
  RegisterData,
  AuthUser,
  Session,
  JWTPayload,
  AuthAdapter,
  UserRole,
} from "./types.js";

const DEFAULT_SALT_ROUNDS = 12;
const DEFAULT_EXPIRES_IN = "24h";
const DEFAULT_REFRESH_EXPIRES_IN = "7d";

export class Auth {
  private adapter: AuthAdapter;
  private config: Required<AuthTokenConfig>;

  constructor(adapter: AuthAdapter, config: AuthTokenConfig) {
    this.adapter = adapter;
    this.config = {
      secret: config.secret,
      expiresIn: config.expiresIn ?? DEFAULT_EXPIRES_IN,
      refreshExpiresIn: config.refreshExpiresIn ?? DEFAULT_REFRESH_EXPIRES_IN,
      issuer: config.issuer ?? "kyro-cms",
      audience: config.audience ?? [],
      saltRounds: config.saltRounds ?? DEFAULT_SALT_ROUNDS,
    };
  }

  async register(data: RegisterData): Promise<AuthResult> {
    try {
      const existing = await this.adapter.findUserByEmail(data.email);
      if (existing) {
        return { success: false, error: "Email already registered" };
      }

      const user = await this.adapter.createUser({
        email: data.email,
        password: data.password,
        role: data.role ?? "customer",
        tenantId: data.tenantId,
      });

      return this.createSessionForUser(user);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const user = await this.adapter.verifyPassword(
        credentials.email,
        credentials.password,
      );
      if (!user) {
        return { success: false, error: "Invalid credentials" };
      }

      return this.createSessionForUser(user);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async logout(token: string): Promise<void> {
    await this.adapter.deleteSession(token);
  }

  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      const session = await this.adapter.findSessionByToken(refreshToken);
      if (!session || new Date(session.expiresAt) < new Date()) {
        return { success: false, error: "Invalid or expired refresh token" };
      }

      const user = await this.adapter.findUserById(session.userId);
      if (!user) {
        return { success: false, error: "User not found" };
      }

      await this.adapter.deleteSession(refreshToken);
      return this.createSessionForUser(user);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const { default: jwtModule } = await import("jsonwebtoken");
      const decoded = jwtModule.verify(token, this.config.secret, {
        issuer: this.config.issuer,
        audience:
          this.config.audience.length > 0 ? this.config.audience[0] : undefined,
      }) as unknown as JWTPayload;
      return decoded;
    } catch {
      return null;
    }
  }

  async getUserFromToken(token: string): Promise<AuthUser | null> {
    const payload = await this.verifyToken(token);
    if (!payload) return null;
    return this.adapter.findUserById(payload.sub);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthResult> {
    try {
      const user = await this.adapter.findUserById(userId);
      if (!user) {
        return { success: false, error: "User not found" };
      }

      const valid = await this.adapter.verifyPassword(
        user.email,
        currentPassword,
      );
      if (!valid) {
        return { success: false, error: "Current password is incorrect" };
      }

      await this.adapter.updateUser(userId, { password: newPassword });
      await this.adapter.deleteUserSessions(userId);

      return { success: true, user };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async resetPassword(email: string, newPassword: string): Promise<AuthResult> {
    try {
      const user = await this.adapter.findUserByEmail(email);
      if (!user) {
        return { success: false, error: "User not found" };
      }

      await this.adapter.updateUser(user.id, { password: newPassword });
      await this.adapter.deleteUserSessions(user.id);

      return { success: true, user };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async sendEmailVerification(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { token, expiresAt } = await this.adapter.createEmailVerificationToken(userId);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async verifyEmail(token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      return await this.adapter.verifyEmailToken(token);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.adapter.createPasswordResetToken(email);
      if (result.error) {
        return { success: false, error: result.error };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.adapter.resetPasswordWithToken(token, newPassword);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async deleteAccount(userId: string): Promise<AuthResult> {
    try {
      const user = await this.adapter.findUserById(userId);
      if (!user) {
        return { success: false, error: "User not found" };
      }

      await this.adapter.deleteUserSessions(userId);
      await this.adapter.deleteUser(userId);

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async createSessionForUser(user: AuthUser): Promise<AuthResult> {
    const token = await this.generateToken(user);

    const session = await this.adapter.createSession(user.id);

    return {
      success: true,
      user,
      session,
      token,
    };
  }

  private async generateToken(user: AuthUser): Promise<string> {
    const { default: jwtModule } = await import("jsonwebtoken");
    const payload: Omit<JWTPayload, "iat" | "exp"> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const signOptions: jwt.SignOptions = {
      expiresIn: this.parseExpiresIn(this.config.expiresIn) / 1000,
      issuer: this.config.issuer,
    };

    if (this.config.audience.length > 0) {
      signOptions.audience = this.config.audience[0];
    }

    return jwtModule.sign(payload, this.config.secret, signOptions);
  }

  private async hashPassword(password: string): Promise<string> {
    const { default: bcrypt } = await import("bcryptjs");
    return bcrypt.hash(password, this.config.saltRounds);
  }

  private parseExpiresIn(value: string | number): number {
    if (typeof value === "number") return value;
    const match = value.match(/^(\d+)([smhd])$/);
    if (!match) return 86400000;
    const num = parseInt(match[1], 10);
    switch (match[2]) {
      case "s":
        return num * 1000;
      case "m":
        return num * 60000;
      case "h":
        return num * 3600000;
      case "d":
        return num * 86400000;
      default:
        return 86400000;
    }
  }
}

export function createAuth(
  adapter: AuthAdapter,
  config: AuthTokenConfig,
): Auth {
  return new Auth(adapter, config);
}

export { RedisAuthAdapter } from "./redis-adapter.js";
export { EmailTransport } from "./nodemailer-transport.js";
export {
  bootstrapAdmin,
  getBootstrapFromEnv,
  autoBootstrap,
  bootstrapWithRetry,
} from "./bootstrap.js";

export {
  DEFAULT_ROLES,
  DEFAULT_PERMISSIONS,
  ROLE_PERMISSIONS,
  getRoleHierarchy,
  getRoleLevel,
  isRoleHigherOrEqual,
  canInheritRole,
  type Role,
  type Permission,
} from "./rbac/roles.js";

export {
  hasPermission,
  hasRole,
  hasAnyRole,
  hasAllRoles,
  getUserPermissions,
  PermissionChecker,
  type PermissionContext,
} from "./rbac/checker.js";

export {
  RLSPolicy,
  createTenantContext,
  applyRLS,
  canAccessDocument,
  filterDocumentsByRLS,
  type TenantContext,
  type OwnershipRule,
  type RLSConfig,
} from "./rls/tenant.js";

export {
  PasswordPolicy,
  type PasswordPolicyConfig,
  type ValidationResult,
} from "./security/password-policy.js";

export {
  AccountLockout,
  type LockoutConfig,
  type LockoutStatus,
} from "./security/lockout.js";

export {
  RateLimiter,
  type RateLimitConfig,
  type RateLimitResult,
} from "./security/rate-limit.js";

export {
  AuditLogger,
  createAuditContext,
  type AuditLog,
  type AuditAction,
  type AuditLogFilter,
} from "./security/audit-log.js";

export {
  SecurityHeaders,
  createSecurityHeaders,
  getSecurityHeadersMiddleware,
  type SecurityHeadersConfig,
} from "./security/headers.js";

export { createAuthConfig, authConfig } from "./config.js";
export type { KyroAuthConfig, DatabaseType } from "./config.js";

export { InMemoryAuthAdapter } from "./in-memory-adapter.js";
export { InMemoryRateLimiter } from "./security/in-memory-rate-limit.js";
export { InMemoryAccountLockout } from "./security/in-memory-lockout.js";
export { InMemoryAuditLogger } from "./security/in-memory-audit-log.js";
