import type { AuthUser } from "../types.js";
import {
  ROLE_PERMISSIONS,
  getRoleHierarchy,
  type Permission,
  type Condition,
} from "./roles.js";

export interface PermissionContext {
  user: AuthUser;
  resource?: string;
  action?: string;
  doc?: Record<string, any>;
  data?: Record<string, any>;
  tenantId?: string;
}

export function hasPermission(
  user: AuthUser,
  permission: string,
  rolePermissions: Record<string, string[]> = ROLE_PERMISSIONS,
): boolean {
  if (!user || !user.role) return false;

  const userPermissions = getUserPermissions(user, rolePermissions);

  if (userPermissions.includes("*")) return true;
  if (userPermissions.includes(permission)) return true;

  const [resource, action] = permission.split(":");
  if (userPermissions.includes(`${resource}:*`)) return true;
  if (userPermissions.includes(`${resource}:admin`)) return true;

  return false;
}

export function hasRole(
  user: AuthUser,
  role: string,
  roles: string[] = [],
): boolean {
  if (!user || !user.role) return false;

  const hierarchy = getRoleHierarchy(user.role);
  return hierarchy.includes(role);
}

export function hasAnyRole(user: AuthUser, checkRoles: string[]): boolean {
  if (!user || !user.role) return false;

  const hierarchy = getRoleHierarchy(user.role);
  return checkRoles.some((role) => hierarchy.includes(role));
}

export function hasAllRoles(user: AuthUser, checkRoles: string[]): boolean {
  if (!user || !user.role) return false;

  const hierarchy = getRoleHierarchy(user.role);
  return checkRoles.every((role) => hierarchy.includes(role));
}

export function getUserPermissions(
  user: AuthUser,
  rolePermissions: Record<string, string[]> = ROLE_PERMISSIONS,
): string[] {
  if (!user || !user.role) return [];

  const hierarchy = getRoleHierarchy(user.role);
  const permissions = new Set<string>();

  for (const role of hierarchy) {
    const rolePerms = rolePermissions[role];
    if (rolePerms) {
      for (const perm of rolePerms) {
        permissions.add(perm);
      }
    }
  }

  return Array.from(permissions);
}



export function canAccessResource(
  user: AuthUser,
  resource: string,
  action: string,
  rolePermissions: Record<string, string[]> = ROLE_PERMISSIONS,
): boolean {
  return hasPermission(user, `${resource}:${action}`, rolePermissions);
}

export function filterPermissions(
  permissions: string[],
  resource?: string,
): string[] {
  if (!resource) return permissions;

  return permissions.filter((perm) => {
    const [permResource] = perm.split(":");
    return permResource === resource || permResource === "*";
  });
}



export function evaluateCondition(
  condition: Condition,
  context: Record<string, any>,
): boolean {
  const { field, operator, value } = condition;
  const fieldValue = context[field];

  if (fieldValue === undefined) return false;

  switch (operator) {
    case "eq":
      return fieldValue === value;
    case "neq":
      return fieldValue !== value;
    case "in":
      return Array.isArray(value) && value.includes(fieldValue);
    case "nin":
      return Array.isArray(value) && !value.includes(fieldValue);
    case "gt":
      return fieldValue > value;
    case "lt":
      return fieldValue < value;
    case "gte":
      return fieldValue >= value;
    case "lte":
      return fieldValue <= value;
    case "contains":
      if (typeof fieldValue === "string") {
        return fieldValue.includes(value);
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(value);
      }
      return false;
    default:
      return false;
  }
}



export function resolveConditionValue(
  value: any,
  context: Record<string, any>,
): any {
  if (typeof value !== "string") return value;

  if (value.startsWith("${") && value.endsWith("}")) {
    const path = value.slice(2, -1);
    const keys = path.split(".");
    let resolved = context;

    for (const key of keys) {
      if (resolved === undefined || resolved === null) return undefined;
      resolved = resolved[key];
    }

    return resolved;
  }

  return value;
}



export class PermissionChecker {
  private rolePermissions: Record<string, string[]>;

  constructor(rolePermissions: Record<string, string[]> = ROLE_PERMISSIONS) {
    this.rolePermissions = rolePermissions;
  }

  check(user: AuthUser, permission: string): boolean {
    return hasPermission(user, permission, this.rolePermissions);
  }

  checkRole(user: AuthUser, role: string): boolean {
    return hasRole(user, role);
  }

  checkAnyRole(user: AuthUser, roles: string[]): boolean {
    return hasAnyRole(user, roles);
  }

  checkAllRoles(user: AuthUser, roles: string[]): boolean {
    return hasAllRoles(user, roles);
  }

  getPermissions(user: AuthUser): string[] {
    return getUserPermissions(user, this.rolePermissions);
  }

  canAccess(user: AuthUser, resource: string, action: string): boolean {
    return canAccessResource(user, resource, action, this.rolePermissions);
  }

  filterByResource(permissions: string[], resource: string): string[] {
    return filterPermissions(permissions, resource);
  }
}
