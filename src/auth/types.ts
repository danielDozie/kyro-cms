import type { AuditLog, AuditLogFilter } from "./security/audit-log-types.js";

export interface AuthUser {
  id: string;
  name?: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  avatar?: string;
  tenantId?: string;
  emailVerified?: boolean;
  locked?: boolean;
  lastLogin?: string;
  failedLoginAttempts?: number;
  createdAt: string;
  updatedAt: string;
}

export type UserRole =
  | "super_admin"
  | "admin"
  | "editor"
  | "author"
  | "customer"
  | "guest";

export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  expiresAt: string;
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  tenantId?: string;
  iat?: number;
  exp?: number;
  sid?: string;
}

export interface AuthTokenConfig {
  secret: string;
  expiresIn?: string | number;
  refreshExpiresIn?: string | number;
  issuer?: string;
  audience?: string[];
  saltRounds?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  role?: UserRole;
  tenantId?: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  session?: Session;
  token?: string;
  error?: string;
}

export interface AuthAdapter {
  createUser(data: {
    email: string;
    password: string;
    name?: string;
    role?: UserRole;
    avatar?: string;
    tenantId?: string;
  }): Promise<AuthUser>;
  findUserByEmail(email: string): Promise<AuthUser | null>;
  findUserById(id: string): Promise<AuthUser | null>;
  updateUser(
    id: string,
    data: Partial<AuthUser> & { password?: string },
  ): Promise<AuthUser | null>;
  deleteUser(id: string): Promise<boolean>;
  verifyPassword(email: string, password: string): Promise<AuthUser | null>;
  hashPassword(password: string): Promise<string>;
  createSession(
    userId: string,
    data?: {
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<Session>;
  findSessionByToken(token: string): Promise<Session | null>;
  findSessionByRefreshToken(refreshToken: string): Promise<Session | null>;
  deleteSession(sessionId: string): Promise<boolean>;
  deleteUserSessions(userId: string): Promise<number>;
  createEmailVerificationToken(userId: string): Promise<{ token: string; expiresAt: Date }>;
  verifyEmailToken(token: string): Promise<{ success: boolean; userId?: string; error?: string }>;
  createPasswordResetToken(email: string): Promise<{ token: string; expiresAt: Date; error?: string }>;
  resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; error?: string }>;
  hasAnyUsers?(): Promise<boolean>;
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
  addPasswordToHistory?(userId: string, passwordHash: string): Promise<void>;
  getPasswordHistory?(userId: string, count?: number): Promise<string[]>;
  isPasswordInHistory?(
    password: string,
    userId: string,
    historyCount?: number,
  ): Promise<boolean>;
  findAuditLogs(
    filter: AuditLogFilter,
  ): Promise<{ logs: AuditLog[]; total: number }>;
  createAuditLog(data: Omit<AuditLog, "id" | "timestamp">): Promise<AuditLog>;
}

export interface Permission {
  resource: string;
  actions: ("create" | "read" | "update" | "delete")[];
  conditions?: Record<string, unknown>;
}

export interface AccessPolicy {
  allow: Permission[];
  deny?: Permission[];
}
