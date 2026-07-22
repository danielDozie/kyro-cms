export interface Role {
  name: string;
  level: number;
  inherits: string[];
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Permission {
  resource: string;
  action: "create" | "read" | "update" | "delete" | "admin";
  conditions?: Condition[];
}

export interface Condition {
  field: string;
  operator:
    | "eq"
    | "neq"
    | "in"
    | "nin"
    | "gt"
    | "lt"
    | "gte"
    | "lte"
    | "contains";
  value: any;
}

export interface RolePermission {
  role: string;
  permissions: Permission[];
}

export const DEFAULT_ROLES: Role[] = [
  {
    name: "super_admin",
    level: 100,
    inherits: [],
    description: "Full system access across all tenants",
  },
  {
    name: "admin",
    level: 90,
    inherits: ["editor"],
    description: "Full tenant access with all content permissions",
  },
  {
    name: "editor",
    level: 70,
    inherits: ["author"],
    description: "Edit and publish all content",
  },
  {
    name: "author",
    level: 50,
    inherits: ["customer"],
    description: "Create and edit own content",
  },
  {
    name: "customer",
    level: 30,
    inherits: [],
    description: "Access own data and make purchases",
  },
  {
    name: "guest",
    level: 10,
    inherits: [],
    description: "Public read-only access",
  },
];

export const DEFAULT_PERMISSIONS: Permission[] = [
  { resource: "users", action: "admin" },
  { resource: "users", action: "read" },
  { resource: "users", action: "create" },
  { resource: "users", action: "update" },
  { resource: "users", action: "delete" },

  { resource: "audit_logs", action: "admin" },
  { resource: "audit_logs", action: "read" },

  { resource: "posts", action: "admin" },
  { resource: "posts", action: "read" },
  { resource: "posts", action: "create" },
  { resource: "posts", action: "update" },
  { resource: "posts", action: "delete" },

  { resource: "pages", action: "admin" },
  { resource: "pages", action: "read" },
  { resource: "pages", action: "create" },
  { resource: "pages", action: "update" },
  { resource: "pages", action: "delete" },

  { resource: "media", action: "admin" },
  { resource: "media", action: "read" },
  { resource: "media", action: "create" },
  { resource: "media", action: "update" },
  { resource: "media", action: "delete" },

  { resource: "categories", action: "admin" },
  { resource: "categories", action: "read" },
  { resource: "categories", action: "create" },
  { resource: "categories", action: "update" },
  { resource: "categories", action: "delete" },

  { resource: "products", action: "admin" },
  { resource: "products", action: "read" },
  { resource: "products", action: "create" },
  { resource: "products", action: "update" },
  { resource: "products", action: "delete" },

  { resource: "orders", action: "admin" },
  { resource: "orders", action: "read" },
  { resource: "orders", action: "create" },
  { resource: "orders", action: "update" },
  { resource: "orders", action: "delete" },

  { resource: "customers", action: "admin" },
  { resource: "customers", action: "read" },
  { resource: "customers", action: "create" },
  { resource: "customers", action: "update" },
  { resource: "customers", action: "delete" },

  { resource: "coupons", action: "admin" },
  { resource: "coupons", action: "read" },
  { resource: "coupons", action: "create" },
  { resource: "coupons", action: "update" },
  { resource: "coupons", action: "delete" },

  { resource: "menu", action: "admin" },
  { resource: "menu", action: "read" },
  { resource: "menu", action: "create" },
  { resource: "menu", action: "update" },
  { resource: "menu", action: "delete" },

  { resource: "settings", action: "admin" },
  { resource: "settings", action: "read" },
  { resource: "settings", action: "update" },

  { resource: "profile", action: "admin" },
  { resource: "profile", action: "read" },
  { resource: "profile", action: "update" },
];

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["*"],

  admin: [
    "users:admin",
    "users:read",
    "users:update",
    "audit_logs:read",
    "posts:admin",
    "posts:read",
    "posts:create",
    "posts:update",
    "posts:delete",
    "pages:admin",
    "pages:read",
    "pages:create",
    "pages:update",
    "pages:delete",
    "media:admin",
    "media:read",
    "media:create",
    "media:update",
    "media:delete",
    "categories:admin",
    "categories:read",
    "categories:create",
    "categories:update",
    "categories:delete",
    "products:admin",
    "products:read",
    "products:create",
    "products:update",
    "products:delete",
    "orders:admin",
    "orders:read",
    "orders:update",
    "customers:admin",
    "customers:read",
    "customers:update",
    "coupons:admin",
    "coupons:read",
    "coupons:create",
    "coupons:update",
    "coupons:delete",
    "navigation:admin",
    "navigation:read",
    "navigation:create",
    "navigation:update",
    "navigation:delete",
    "settings:admin",
    "settings:read",
    "settings:update",
    "profile:admin",
    "profile:read",
    "profile:update",
  ],

  editor: [
    "posts:admin",
    "posts:read",
    "posts:create",
    "posts:update",
    "posts:delete",
    "pages:admin",
    "pages:read",
    "pages:create",
    "pages:update",
    "pages:delete",
    "media:read",
    "media:create",
    "media:update",
    "categories:read",
    "categories:create",
    "categories:update",
    "products:read",
    "orders:read",
    "orders:update",
    "navigation:read",
    "navigation:create",
    "navigation:update",
    "profile:read",
    "profile:update",
  ],

  author: [
    "posts:read",
    "posts:create",
    "posts:update",
    "media:read",
    "media:create",
    "categories:read",
    "profile:read",
    "profile:update",
  ],

  customer: ["profile:read", "profile:update", "orders:read", "orders:create"],

  guest: ["posts:read", "pages:read", "products:read"],
};

export function getRoleHierarchy(
  role: string,
  roles: Role[] = DEFAULT_ROLES,
): string[] {
  const hierarchy: string[] = [role];
  const roleMap = new Map(roles.map((r) => [r.name, r]));

  const addInherited = (r: string) => {
    const roleData = roleMap.get(r);
    if (roleData && roleData.inherits) {
      for (const inherited of roleData.inherits) {
        if (!hierarchy.includes(inherited)) {
          hierarchy.push(inherited);
          addInherited(inherited);
        }
      }
    }
  };

  addInherited(role);
  return hierarchy;
}

export function getRoleLevel(
  role: string,
  roles: Role[] = DEFAULT_ROLES,
): number {
  const roleMap = new Map(roles.map((r) => [r.name, r]));
  const roleData = roleMap.get(role);
  return roleData?.level ?? 0;
}

export function isRoleHigherOrEqual(
  role1: string,
  role2: string,
  roles: Role[] = DEFAULT_ROLES,
): boolean {
  return getRoleLevel(role1, roles) >= getRoleLevel(role2, roles);
}

export function canInheritRole(
  role: string,
  targetRole: string,
  roles: Role[] = DEFAULT_ROLES,
): boolean {
  const hierarchy = getRoleHierarchy(role, roles);
  return hierarchy.includes(targetRole);
}
