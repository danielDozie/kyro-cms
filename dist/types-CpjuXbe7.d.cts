type AuditAction = "login" | "logout" | "login_failed" | "register" | "verify_email" | "password_change" | "password_reset" | "password_reset_request" | "role_change" | "permission_change" | "document_create" | "document_update" | "document_delete" | "settings_change" | "user_lockout" | "user_unlock" | "user_create" | "user_update" | "user_delete" | "api_request" | "api_key_create" | "api_key_update" | "api_key_rotate" | "api_key_delete" | "tenant_create" | "tenant_delete";
interface AuditLog {
    id: string;
    timestamp: Date;
    action: AuditAction;
    userId?: string;
    userEmail?: string;
    role?: string;
    resource: string;
    resourceId?: string;
    changes?: {
        field: string;
        old: any;
        new: any;
    }[];
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    error?: string;
    metadata?: Record<string, any>;
}
interface AuditLogFilter {
    userId?: string;
    action?: AuditAction | AuditAction[];
    resource?: string;
    resourceId?: string;
    success?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}

interface AuthUser {
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
type UserRole = "super_admin" | "admin" | "editor" | "author" | "customer" | "guest";
interface Session {
    id: string;
    userId: string;
    token: string;
    refreshToken?: string;
    expiresAt: string;
    createdAt: string;
    ipAddress?: string;
    userAgent?: string;
}
interface JWTPayload {
    sub: string;
    email: string;
    role: UserRole;
    tenantId?: string;
    iat?: number;
    exp?: number;
    sid?: string;
}
interface AuthTokenConfig {
    secret: string;
    expiresIn?: string | number;
    refreshExpiresIn?: string | number;
    issuer?: string;
    audience?: string[];
    saltRounds?: number;
}
interface LoginCredentials {
    email: string;
    password: string;
}
interface RegisterData {
    email: string;
    password: string;
    role?: UserRole;
    tenantId?: string;
}
interface AuthResult {
    success: boolean;
    user?: AuthUser;
    session?: Session;
    token?: string;
    error?: string;
}
interface AuthAdapter {
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
    updateUser(id: string, data: Partial<AuthUser> & {
        password?: string;
    }): Promise<AuthUser | null>;
    deleteUser(id: string): Promise<boolean>;
    verifyPassword(email: string, password: string): Promise<AuthUser | null>;
    hashPassword(password: string): Promise<string>;
    createSession(userId: string, data?: {
        ipAddress?: string;
        userAgent?: string;
    }): Promise<Session>;
    findSessionByToken(token: string): Promise<Session | null>;
    findSessionByRefreshToken(refreshToken: string): Promise<Session | null>;
    deleteSession(sessionId: string): Promise<boolean>;
    deleteUserSessions(userId: string): Promise<number>;
    createEmailVerificationToken(userId: string): Promise<{
        token: string;
        expiresAt: Date;
    }>;
    verifyEmailToken(token: string): Promise<{
        success: boolean;
        userId?: string;
        error?: string;
    }>;
    createPasswordResetToken(email: string): Promise<{
        token: string;
        expiresAt: Date;
        error?: string;
    }>;
    resetPasswordWithToken(token: string, newPassword: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    hasAnyUsers?(): Promise<boolean>;
    connect?(): Promise<void>;
    disconnect?(): Promise<void>;
    addPasswordToHistory?(userId: string, passwordHash: string): Promise<void>;
    getPasswordHistory?(userId: string, count?: number): Promise<string[]>;
    isPasswordInHistory?(password: string, userId: string, historyCount?: number): Promise<boolean>;
    findAuditLogs(filter: AuditLogFilter): Promise<{
        logs: AuditLog[];
        total: number;
    }>;
    createAuditLog(data: Omit<AuditLog, "id" | "timestamp">): Promise<AuditLog>;
}

export type { AuthAdapter as A, JWTPayload as J, LoginCredentials as L, RegisterData as R, Session as S, UserRole as U, AuthResult as a, AuthTokenConfig as b, AuthUser as c, AuditLog as d, AuditLogFilter as e, AuditAction as f };
