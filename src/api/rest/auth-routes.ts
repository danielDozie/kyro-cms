import { randomBytes } from "crypto";
import type { AuthAdapter } from "../../auth/types.js";
import { EmailTransport } from "../../auth/nodemailer-transport.js";
import { PasswordPolicy } from "../../auth/security/password-policy.js";
import { InMemoryAccountLockout } from "../../auth/security/in-memory-lockout.js";
import { InMemoryRateLimiter } from "../../auth/security/in-memory-rate-limit.js";
import {
  InMemoryAuditLogger,
  createAuditContext,
} from "../../auth/security/in-memory-audit-log.js";
import type { AuditAction } from "../../auth/security/audit-log.js";
import {
  createSession,
  deleteSession,
  getCurrentUser,
  setSessionCookie,
  clearSessionCookie,
  getSessionIdFromRequest,
  refreshSession,
  getUserSessions,
  updateSessionName,
  invalidateAllUserSessions,
} from "./auth-session.js";
import type {
  AuthUser,
  LoginCredentials,
  RegisterData,
} from "../../auth/types.js";

export interface AuthRoutesConfig {
  redis: AuthAdapter;
  jwtSecret?: string;
  jwtExpiresIn?: string;
  jwtIssuer?: string;
  jwtAudience?: string;
  email?: EmailTransport;
  passwordPolicy?: PasswordPolicy;
  lockout?: InMemoryAccountLockout;
  rateLimiter?: InMemoryRateLimiter;
  auditLogger?: InMemoryAuditLogger;
  baseUrl?: string;
  emailVerificationRequired?: boolean;
}

export class AuthRoutes {
  private authAdapter: AuthAdapter;
  private email?: EmailTransport;
  private passwordPolicy: PasswordPolicy;
  private lockout?: InMemoryAccountLockout;
  private rateLimiter?: InMemoryRateLimiter;
  private auditLogger?: InMemoryAuditLogger;
  private baseUrl: string;
  private emailVerificationRequired: boolean;

  constructor(config: AuthRoutesConfig) {
    this.authAdapter = config.redis;
    this.email = config.email;
    this.passwordPolicy = config.passwordPolicy || new PasswordPolicy();
    this.lockout = config.lockout;
    this.rateLimiter = config.rateLimiter;
    this.auditLogger = config.auditLogger;
    this.baseUrl = config.baseUrl || "http://localhost:4321";
    this.emailVerificationRequired = config.emailVerificationRequired ?? true;
  }

  private getBaseUrl(req?: Request): string {
    if (req) {
      try {
        const proto =
          req.headers.get("x-forwarded-proto") ||
          (req.url.startsWith("https") ? "https" : "http");
        const host =
          req.headers.get("x-forwarded-host") || req.headers.get("host");
        if (host) {
          return `${proto}://${host}`;
        }
        const urlObj = new URL(req.url);
        return urlObj.origin;
      } catch {
        // Fallback to environment variable or config
      }
    }
    return (
      process.env.KYRO_BASE_URL ||
      process.env.SERVER_URL ||
      process.env.PUBLIC_URL ||
      process.env.SITE_URL ||
      this.baseUrl ||
      "http://localhost:4321"
    );
  }

  async register(req: Request): Promise<Response> {
    const { ipAddress, userAgent } = createAuditContext(req);

    if (this.rateLimiter) {
      const limit = await this.rateLimiter.check("auth:register", ipAddress);
      if (!limit.allowed) {
        return this.rateLimitResponse(limit);
      }
    }

    try {
      const body = (await req.json()) as RegisterData & {
        confirmPassword?: string;
      };

      if (!body.email || !body.password) {
        return this.errorResponse("Email and password are required", 400);
      }

      if (body.password !== body.confirmPassword) {
        return this.errorResponse("Passwords do not match", 400);
      }

      const passwordValidation = this.passwordPolicy.validate(body.password);
      if (!passwordValidation.valid) {
        return this.errorResponse(passwordValidation.errors.join(". "), 400);
      }

      const existingUser = await this.authAdapter.findUserByEmail(body.email);
      if (existingUser) {
        if (!existingUser.emailVerified && this.emailVerificationRequired && this.email) {
          const tokenRes = await this.authAdapter.createEmailVerificationToken?.(existingUser.id);
          const verificationToken = tokenRes?.token || randomBytes(32).toString("hex");
          const baseUrl = this.getBaseUrl(req);
          const verificationUrl = `${baseUrl}/admin/auth/verify-email?token=${verificationToken}`;

          const template = this.email.getTemplates().verifyEmail(verificationUrl, body.email);
          await this.email.send({ to: body.email, ...template });

          return this.jsonResponse(
            {
              success: true,
              message: "An unverified account already exists with this email. We have resent the confirmation link to your inbox.",
              requiresVerification: true,
            },
            200,
          );
        }

        return this.errorResponse("Email already registered", 400);
      }

      const user = await this.authAdapter.createUser({
        email: body.email,
        password: body.password,
        role: body.role || "customer",
        tenantId: body.tenantId,
      });

      if (this.emailVerificationRequired && this.email) {
        const verificationToken = randomBytes(32).toString("hex");
        const baseUrl = this.getBaseUrl(req);
        const verificationUrl = `${baseUrl}/admin/auth/verify-email?token=${verificationToken}`;

        await this.authAdapter.createSession(user.id, { ipAddress, userAgent });
        const template = this.email
          .getTemplates()
          .verifyEmail(verificationUrl, body.email);
        await this.email.send({ to: body.email, ...template });
      }

      if (this.auditLogger) {
        await this.auditLogger.log({
          action: "register",
          userId: user.id,
          userEmail: user.email,
          resource: "auth",
          ipAddress,
          userAgent,
          success: true,
        });
      }

      return this.jsonResponse(
        {
          success: true,
          message: "Registration successful",
          user: this.sanitizeUser(user),
          requiresVerification: this.emailVerificationRequired && !!this.email,
        },
        201,
      );
    } catch (error) {
      console.error("[AuthRoutes.register] Registration error:", error);
      return this.errorResponse("Registration failed", 500);
    }
  }

  async login(req: Request): Promise<Response> {
    const { ipAddress, userAgent } = createAuditContext(req);

    if (this.rateLimiter) {
      const limit = await this.rateLimiter.check("auth:login", ipAddress);
      if (!limit.allowed) {
        return this.rateLimitResponse(limit);
      }
    }

    try {
      const body = (await req.json()) as LoginCredentials;

if (!body.email || !body.password) {
        return this.errorResponse("Email and password are required", 400);
      }

      const user = await this.authAdapter.findUserByEmail(body.email);
      if (!user) {
        await this.recordFailedLogin(ipAddress, userAgent);
        return this.errorResponse("Invalid credentials", 401);
      }

      if (user.locked) {
        if (this.auditLogger) {
          await this.auditLogger.log({
            action: "login_failed",
            userId: user.id,
            userEmail: user.email,
            resource: "auth",
            ipAddress,
            userAgent,
            success: false,
            error: "Account locked",
          });
        }
        return this.errorResponse(
          "Account locked. Contact an administrator.",
          403,
        );
      }

      if (this.lockout) {
        const lockoutStatus = await this.lockout.checkLockout(user.id);
        if (lockoutStatus.locked) {
          if (this.auditLogger) {
            await this.auditLogger.log({
              action: "login_failed",
              userId: user.id,
              userEmail: user.email,
              resource: "auth",
              ipAddress,
              userAgent,
              success: false,
              error: "Account locked",
            });
          }
          return this.errorResponse(
            `Account locked. Try again in ${Math.ceil((lockoutStatus.lockedUntil!.getTime() - Date.now()) / 60000)} minutes`,
            423,
          );
        }
      }

      const verifiedUser = await this.authAdapter.verifyPassword(
        body.email,
        body.password,
      );
      if (!verifiedUser) {
        await this.recordFailedLogin(ipAddress, userAgent, user.id, user.email);
        return this.errorResponse("Invalid credentials", 401);
      }

      if (this.emailVerificationRequired && verifiedUser.emailVerified === false) {
        if (this.email) {
          const tokenRes = await this.authAdapter.createEmailVerificationToken?.(verifiedUser.id);
          const verificationToken = tokenRes?.token || randomBytes(32).toString("hex");
          const baseUrl = this.getBaseUrl(req);
          const verificationUrl = `${baseUrl}/admin/auth/verify-email?token=${verificationToken}`;
          const template = this.email.getTemplates().verifyEmail(verificationUrl, verifiedUser.email);
          await this.email.send({ to: verifiedUser.email, ...template });
        }
        return this.errorResponse(
          "Your email address is not verified yet. We have sent a new confirmation link to your email inbox.",
          403,
        );
      }

      if (this.lockout) {
        await this.lockout.resetAttempts(user.id);
      }

      if (this.auditLogger) {
        await this.auditLogger.log({
          action: "login",
          userId: user.id,
          userEmail: user.email,
          role: user.role,
          resource: "auth",
          ipAddress,
          userAgent,
          success: true,
        });
      }

      await this.authAdapter.updateUser(user.id, {
        lastLogin: new Date().toISOString(),
      });

      const sessionId = await createSession({
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      });

      const responseData = {
        success: true,
        user: this.sanitizeUser(user),
      };

      const response = this.jsonResponse(responseData);
      return setSessionCookie(response, sessionId);
    } catch (error) {
      console.error("[Auth] Login error:", error);
      return this.errorResponse("Login failed", 500);
    }
  }

  async logout(req: Request): Promise<Response> {
    const sessionId = getSessionIdFromRequest(req);
    if (!sessionId) {
      return this.errorResponse("No session to logout", 401);
    }

    const { ipAddress, userAgent } = createAuditContext(req);

    try {
      const session = await getCurrentUser(req);
      if (session) {
        await deleteSession(sessionId);

        if (this.auditLogger) {
          await this.auditLogger.log({
            action: "logout",
            userId: session.userId,
            userEmail: session.email,
            resource: "auth",
            ipAddress,
            userAgent,
            success: true,
          });
        }
      }

      const response = this.jsonResponse({
        success: true,
        message: "Logged out successfully",
      });

      return clearSessionCookie(response);
    } catch (error) {
      return this.errorResponse("Logout failed", 500);
    }
  }

  async refresh(req: Request): Promise<Response> {
    try {
      const sessionId = getSessionIdFromRequest(req);
      if (!sessionId) {
        return this.errorResponse("Not authenticated", 401);
      }

      const updatedSession = await refreshSession(sessionId, req);
      if (!updatedSession) {
        return this.errorResponse("Session not found", 404);
      }

      return this.jsonResponse({
        success: true,
        expiresAt: updatedSession.expiresAt,
      });
    } catch (error) {
      console.error("[Auth] Session refresh error:", error);
      return this.errorResponse("Session refresh failed", 500);
    }
  }

  async me(req: Request): Promise<Response> {
    const session = await getCurrentUser(req);
    if (!session) {
      return this.errorResponse("Not authenticated", 401);
    }
    return this.jsonResponse({
      success: true,
      user: {
        id: session.userId,
        email: session.email,
        role: session.role,
        tenantId: session.tenantId,
      },
    });
  }



  async changePassword(req: Request): Promise<Response> {
    const session = await getCurrentUser(req);
    if (!session) {
      return this.errorResponse("Not authenticated", 401);
    }

    const { ipAddress, userAgent } = createAuditContext(req);

    try {
      const body = (await req.json()) as {
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
      };
      const { currentPassword, newPassword, confirmPassword } = body;

      if (!currentPassword || !newPassword) {
        return this.errorResponse("Current and new password required", 400);
      }

      if (newPassword !== confirmPassword) {
        return this.errorResponse("Passwords do not match", 400);
      }

      const passwordValidation = this.passwordPolicy.validate(newPassword);
      if (!passwordValidation.valid) {
        return this.errorResponse(passwordValidation.errors.join(". "), 400);
      }

      const user = await this.authAdapter.findUserById(session.userId);
      if (!user) {
        return this.errorResponse("User not found", 404);
      }

      const validPassword = user.passwordHash
        ? await this.authAdapter.verifyPassword(
            currentPassword,
            user.passwordHash,
          )
        : false;
      if (!validPassword) {
        return this.errorResponse("Current password is incorrect", 401);
      }

      const passwordHistory = await this.authAdapter.getPasswordHistory?.(
        user.id,
        5,
      );
      const isReused = await this.authAdapter.isPasswordInHistory?.(
        newPassword,
        user.id,
        5,
      );
      if (isReused) {
        return this.errorResponse(
          "Password was recently used. Please choose a different password",
          400,
        );
      }

      const newPasswordHash = await this.authAdapter.hashPassword(newPassword);
      if (user.passwordHash) {
        await this.authAdapter.addPasswordToHistory?.(
          user.id,
          user.passwordHash,
        );
      }
      await this.authAdapter.updateUser(user.id, {
        passwordHash: newPasswordHash,
      });

      await this.authAdapter.deleteUserSessions(user.id);

      if (this.email && this.email.getTemplates) {
        const template = this.email.getTemplates().passwordChanged(user.email);
        await this.email.send({ to: user.email, ...template });
      }

      if (this.auditLogger) {
        await this.auditLogger.log({
          action: "password_change",
          userId: user.id,
          userEmail: user.email,
          resource: "auth",
          ipAddress,
          userAgent,
          success: true,
        });
      }

      return this.jsonResponse({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      return this.errorResponse("Password change failed", 500);
    }
  }

  async forgotPassword(req: Request): Promise<Response> {
    const { ipAddress, userAgent } = createAuditContext(req);

    if (this.rateLimiter) {
      const limit = await this.rateLimiter.check("auth:forgot", ipAddress);
      if (!limit.allowed) {
        return this.rateLimitResponse(limit);
      }
    }

    try {
      const body = (await req.json()) as { email?: string };
      const { email } = body;

      if (!email) {
        return this.errorResponse("Email required", 400);
      }

      const user = await this.authAdapter.findUserByEmail(email);
      if (!user) {
        return this.jsonResponse({
          success: true,
          message: "If the email exists, a reset link has been sent",
        });
      }

      if (this.email) {
        let resetToken = randomBytes(32).toString("hex");
        if (this.authAdapter.createPasswordResetToken) {
          const res = await this.authAdapter.createPasswordResetToken(user.email);
          if (res.token) resetToken = res.token;
        }
        const baseUrl = this.getBaseUrl(req);
        const resetUrl = `${baseUrl}/admin/auth/reset-password?token=${resetToken}`;
        const template = this.email
          .getTemplates()
          .resetPassword(resetUrl, user.email);
        await this.email.send({ to: user.email, ...template });
      }

      if (this.auditLogger) {
        await this.auditLogger.log({
          action: "password_reset",
          userId: user.id,
          userEmail: user.email,
          resource: "auth",
          ipAddress,
          userAgent,
          success: true,
        });
      }

      return this.jsonResponse({
        success: true,
        message: "If the email exists, a reset link has been sent",
      });
    } catch (error) {
      return this.errorResponse("Password reset request failed", 500);
    }
  }

  async resetPassword(req: Request): Promise<Response> {
    const { ipAddress, userAgent } = createAuditContext(req);

    if (this.rateLimiter) {
      const limit = await this.rateLimiter.check("auth:reset", ipAddress);
      if (!limit.allowed) {
        return this.rateLimitResponse(limit);
      }
    }

    try {
      const body = await req.json() as { token?: string; newPassword?: string; confirmPassword?: string };
      const { token, newPassword, confirmPassword } = body;

      if (!token || !newPassword) {
        return this.errorResponse("Reset token and new password are required", 400);
      }

      if (newPassword !== confirmPassword) {
        return this.errorResponse("Passwords do not match", 400);
      }

      const passwordValidation = this.passwordPolicy.validate(newPassword);
      if (!passwordValidation.valid) {
        return this.errorResponse(passwordValidation.errors.join(". "), 400);
      }

      if (this.authAdapter.resetPasswordWithToken) {
        const result = await this.authAdapter.resetPasswordWithToken(token, newPassword);
        if (!result.success) {
          return this.errorResponse(result.error || "Password reset failed or token expired", 400);
        }
      }

      return this.jsonResponse({
        success: true,
        message: "Password reset successful. You can now log in with your new password.",
      });
    } catch (error) {
      console.error("[AuthRoutes.resetPassword] Error:", error);
      return this.errorResponse("Password reset failed", 500);
    }
  }

  async verifyEmail(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return this.errorResponse("Verification token required", 400);
    }

    try {
      if (this.authAdapter.verifyEmailToken) {
        const result = await this.authAdapter.verifyEmailToken(token);
        if (!result.success) {
          return this.errorResponse(result.error || "Invalid or expired verification token", 400);
        }

        if (result.userId && this.email) {
          const user = await this.authAdapter.findUserById(result.userId);
          if (user) {
            const template = this.email.getTemplates().welcome(user.email);
            await this.email.send({ to: user.email, ...template });
          }
        }
      }

      return this.jsonResponse({ success: true, message: "Email address verified successfully" });
    } catch (error) {
      console.error("[AuthRoutes.verifyEmail] Error:", error);
      return this.errorResponse("Email verification failed", 500);
    }
  }

  private async recordFailedLogin(
    ipAddress: string,
    userAgent: string,
    userId?: string,
    userEmail?: string,
  ): Promise<void> {
    if (this.lockout) {
      await this.lockout.recordFailedAttempt(userId || ipAddress);
    }

    if (this.auditLogger) {
      await this.auditLogger.log({
        action: "login_failed",
        userId,
        userEmail,
        resource: "auth",
        ipAddress,
        userAgent,
        success: false,
        error: "Invalid credentials",
      });
    }
  }

  private sanitizeUser(user: AuthUser): Partial<AuthUser> {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  private jsonResponse(data: any, status: number = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  }

  async listSessions(req: Request): Promise<Response> {
    const session = await getCurrentUser(req);
    if (!session) {
      return this.errorResponse("Not authenticated", 401);
    }

    try {
      const sessions = await getUserSessions(session.userId, getSessionIdFromRequest(req) ?? undefined);
      return this.jsonResponse({ sessions });
    } catch (error) {
      console.error("[AuthRoutes.listSessions] Error:", error);
      return this.errorResponse("Failed to list sessions", 500);
    }
  }

  async revokeSession(req: Request, sessionId: string): Promise<Response> {
    const session = await getCurrentUser(req);
    if (!session) {
      return this.errorResponse("Not authenticated", 401);
    }

    try {
      const allSessions = await getUserSessions(session.userId);
      const targetSession = allSessions.find(s => s.id === sessionId);
      
      if (!targetSession) {
        return this.errorResponse("Session not found", 404);
      }

      if (targetSession.currentSession) {
        return this.errorResponse("Cannot revoke current session", 400);
      }

      await deleteSession(sessionId);
      
      return this.jsonResponse({ 
        success: true, 
        message: "Session revoked" 
      });
    } catch (error) {
      console.error("[AuthRoutes.revokeSession] Error:", error);
      return this.errorResponse("Failed to revoke session", 500);
    }
  }

  async revokeOtherSessions(req: Request): Promise<Response> {
    const session = await getCurrentUser(req);
    if (!session) {
      return this.errorResponse("Not authenticated", 401);
    }

    try {
      const allSessions = await getUserSessions(session.userId);
      const currentSessionId = getSessionIdFromRequest(req);
      
      for (const s of allSessions) {
        if (!s.currentSession) {
          await deleteSession(s.id);
        }
      }
      
      return this.jsonResponse({ 
        success: true, 
        message: "Other sessions revoked" 
      });
    } catch (error) {
      console.error("[AuthRoutes.revokeOtherSessions] Error:", error);
      return this.errorResponse("Failed to revoke sessions", 500);
    }
  }

  async renameSession(req: Request, sessionId: string): Promise<Response> {
    const session = await getCurrentUser(req);
    if (!session) {
      return this.errorResponse("Not authenticated", 401);
    }

    try {
      const allSessions = await getUserSessions(session.userId);
      const targetSession = allSessions.find(s => s.id === sessionId);
      
      if (!targetSession) {
        return this.errorResponse("Session not found", 404);
      }

      const body = await req.json() as any;
      const { name } = body;
      
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return this.errorResponse("Invalid session name", 400);
      }

      await updateSessionName(sessionId, name.trim());
      
      return this.jsonResponse({ 
        success: true, 
        message: "Session renamed" 
      });
    } catch (error) {
      console.error("[AuthRoutes.renameSession] Error:", error);
      return this.errorResponse("Failed to rename session", 500);
    }
  }

  async refreshSession(req: Request): Promise<Response> {
    const sessionId = getSessionIdFromRequest(req);
    if (!sessionId) {
      return this.errorResponse("No session", 401);
    }

    try {
      const { refreshSession } = await import('./auth-session.js');
      const updatedSession = await refreshSession(sessionId, req);
      if (!updatedSession) {
        return this.errorResponse("Session not found", 404);
      }

      return this.jsonResponse({ 
        success: true, 
        expiresAt: updatedSession.expiresAt 
      });
    } catch (error) {
      console.error("[AuthRoutes.refreshSession] Error:", error);
      return this.errorResponse("Failed to refresh session", 500);
    }
  }

  private errorResponse(message: string, status: number): Response {
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  private async rateLimitResponse(limit: { retryAfter?: number }): Promise<Response> {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Too many requests",
        retryAfter: limit.retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(limit.retryAfter || 60),
        },
      },
    );
  }
}
