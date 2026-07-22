export type AuditAction =
  | "login"
  | "logout"
  | "login_failed"
  | "register"
  | "verify_email"
  | "password_change"
  | "password_reset"
  | "password_reset_request"
  | "role_change"
  | "permission_change"
  | "document_create"
  | "document_update"
  | "document_delete"
  | "settings_change"
  | "user_lockout"
  | "user_unlock"
  | "user_create"
  | "user_update"
  | "user_delete"
  | "api_request"
  | "api_key_create"
  | "api_key_update"
  | "api_key_rotate"
  | "api_key_delete"
  | "tenant_create"
  | "tenant_delete";

export interface AuditLog {
  id: string;
  timestamp: Date;
  action: AuditAction;
  userId?: string;
  userEmail?: string;
  role?: string;
  resource: string;
  resourceId?: string;
  changes?: { field: string; old: any; new: any }[];
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogFilter {
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

export interface AuditRetentionConfig {
  retentionDays: number;
  cleanupIntervalHours: number;
}

export const DEFAULT_RETENTION_CONFIG: AuditRetentionConfig = {
  retentionDays: 30,
  cleanupIntervalHours: 24,
};
