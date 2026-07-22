import type { User, Request } from '../hooks/types.js';
import { evaluateAccess, type WhereClause } from './types.js';
import { hasPermission } from '../auth/rbac/checker.js';
import { hasApiKeyPermission } from '../auth/api-key.js';

export interface AccessCheckResult {
  allowed: boolean;
  extraWhere?: WhereClause;
  error?: string;
  status?: number;
}

export interface AccessContext {
  user?: User;
  req?: Request;
  tenantId?: string;
  apiKey?: any;
}

export interface AccessOptions {
  enablePublicAccess?: boolean;
  defaultAccess?: string;
}

function actionToPermission(
  operation: "read" | "create" | "update" | "delete",
): string {
  if (operation === "read") return "read";
  if (operation === "create") return "create";
  if (operation === "update") return "update";
  return "delete";
}

function isDefaultAllowed(
  operation: "read" | "create" | "update" | "delete",
  defaultAccess: string,
): boolean {
  const levels: Record<string, boolean> = {
    none: false,
    read: operation === "read",
    create: operation === "read" || operation === "create",
    update: operation === "read" || operation === "create" || operation === "update",
    delete: operation === "read" || operation === "create" || operation === "update" || operation === "delete",
    admin: true,
  };
  return levels[defaultAccess] || false;
}

export async function checkCollectionAccess(
  config: { access?: any; slug: string },
  operation: "read" | "create" | "update" | "delete",
  context: AccessContext,
  options: AccessOptions = {},
): Promise<AccessCheckResult> {
  const { user, req, tenantId, apiKey } = context;
  const { enablePublicAccess = true, defaultAccess = "none" } = options;
  const accessRule = config.access?.[operation];

  // Custom access function (highest priority)
  if (accessRule) {
    const allowed = await evaluateAccess(accessRule, {
      req: req!,
      user,
      tenantId,
    });
    if (allowed === false) {
      return { allowed: false, error: "Access denied", status: 403 };
    }
    if (typeof allowed === "object") {
      return { allowed: true, extraWhere: allowed as WhereClause };
    }
    return { allowed: true };
  }

  // API key permission check
  if (apiKey?.permissions?.length > 0) {
    const resource = config.slug;
    const action = actionToPermission(operation);
    const permission = `${resource}:${action}`;
    if (
      !hasApiKeyPermission(apiKey.permissions, permission) &&
      !hasApiKeyPermission(apiKey.permissions, `${resource}:admin`)
    ) {
      return { allowed: false, error: "Access denied: insufficient permissions", status: 403 };
    }
    return { allowed: true };
  }

  // No accessRule, no apiKey — authenticated user RBAC
  if (user) {
    const resource = config.slug;
    const action = actionToPermission(operation);
    const permission = `${resource}:${action}`;

    const userHas = hasPermission(
      { id: user.id, email: user.email, role: user.role } as any,
      permission,
    );
    const adminHas = hasPermission(
      { id: user.id, email: user.email, role: user.role } as any,
      `${resource}:admin`,
    );

    if (userHas || adminHas) {
      return { allowed: true };
    }
    return { allowed: false, error: "Access denied: missing RBAC permission", status: 403 };
  }

  // Unauthenticated — check public access
  const defaultAllowed = isDefaultAllowed(operation, defaultAccess);
  if (enablePublicAccess && defaultAllowed) {
    return { allowed: true };
  }

  return { allowed: false, error: "Authentication required", status: 401 };
}

export async function checkGlobalAccess(
  config: { access?: any; slug: string },
  operation: "read" | "update",
  context: AccessContext,
  options: AccessOptions = {},
): Promise<AccessCheckResult> {
  const { user, req, tenantId } = context;
  const { enablePublicAccess = true } = options;
  const accessRule = config.access?.[operation];

  // Custom access function
  if (accessRule) {
    const allowed = await evaluateAccess(accessRule, {
      req: req!,
      user,
      tenantId,
    });
    if (allowed === false) {
      return { allowed: false, error: "Access denied", status: 403 };
    }
    return { allowed: true };
  }

  // Authenticated user RBAC
  if (user) {
    const permission = `globals:${operation}`;
    const userHas = hasPermission(
      { id: user.id, email: user.email, role: user.role } as any,
      permission,
    );
    const adminHas = hasPermission(
      { id: user.id, email: user.email, role: user.role } as any,
      "globals:admin",
    );
    if (userHas || adminHas) {
      return { allowed: true };
    }
    return { allowed: false, error: "Access denied: missing RBAC permission", status: 403 };
  }

  // Unauthenticated
  if (enablePublicAccess) {
    return { allowed: true };
  }

  return { allowed: false, error: "Authentication required", status: 401 };
}
