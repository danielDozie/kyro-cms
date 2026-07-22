import type { AuthUser } from "../types.js";
import { hasAnyRole } from "../rbac/checker.js";

export interface TenantContext {
  tenantId: string;
  userId: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  isSuperAdmin?: boolean;
}

export interface OwnershipRule {
  ownerField: string;
  bypassRoles?: string[];
}

export interface RLSConfig {
  tenantEnabled: boolean;
  tenantField: string;
  ownershipRules: Record<string, OwnershipRule>;
}

export const DEFAULT_RLS_CONFIG: RLSConfig = {
  tenantEnabled: true,
  tenantField: "tenantId",
  ownershipRules: {
    posts: {
      ownerField: "authorId",
      bypassRoles: ["super_admin", "admin", "editor"],
    },
    pages: {
      ownerField: "authorId",
      bypassRoles: ["super_admin", "admin", "editor"],
    },
    media: {
      ownerField: "uploadedBy",
      bypassRoles: ["super_admin", "admin", "editor"],
    },
    orders: {
      ownerField: "customerId",
      bypassRoles: ["super_admin", "admin", "editor"],
    },
    customers: { ownerField: "id", bypassRoles: ["super_admin", "admin"] },
    navigation: { ownerField: "id", bypassRoles: ["super_admin", "admin"] },
  },
};

export function createTenantContext(user: AuthUser | undefined): TenantContext {
  if (!user) {
    return {
      tenantId: "public",
      userId: "anonymous",
      role: "guest",
      roles: ["guest"],
      permissions: [],
      isSuperAdmin: false,
    };
  }

  const isSuperAdmin = user.role === "super_admin";

  return {
    tenantId: user.tenantId || "default",
    userId: user.id,
    role: user.role,
    roles: [user.role],
    permissions: [],
    isSuperAdmin,
  };
}

export function addTenantFilter<T extends Record<string, any>>(
  query: T,
  context: TenantContext,
  config: RLSConfig = DEFAULT_RLS_CONFIG,
): T {
  if (!config.tenantEnabled || context.isSuperAdmin) {
    return query;
  }

  return {
    ...query,
    where: {
      ...query.where,
      [config.tenantField]: context.tenantId,
    },
  };
}

export function applyOwnershipRule(
  query: Record<string, any>,
  collection: string,
  context: TenantContext,
  config: RLSConfig = DEFAULT_RLS_CONFIG,
): Record<string, any> {
  const rule = config.ownershipRules[collection];

  if (!rule) {
    return query;
  }

  if (
    rule.bypassRoles &&
    hasAnyRole({ role: context.role } as AuthUser, rule.bypassRoles)
  ) {
    return query;
  }

  if (rule.ownerField === "id" && context.userId) {
    return {
      ...query,
      where: {
        ...query.where,
        id: context.userId,
      },
    };
  }

  if (rule.ownerField && context.userId) {
    return {
      ...query,
      where: {
        ...query.where,
        [rule.ownerField]: context.userId,
      },
    };
  }

  return query;
}

export function applyRLS<T extends Record<string, any>>(
  query: T,
  collection: string,
  context: TenantContext,
  config: RLSConfig = DEFAULT_RLS_CONFIG,
): T {
  let result = query;

  result = addTenantFilter(result, context, config) as T;

  result = applyOwnershipRule(result, collection, context, config) as T;

  return result;
}

export function canAccessDocument(
  doc: Record<string, any>,
  collection: string,
  context: TenantContext,
  config: RLSConfig = DEFAULT_RLS_CONFIG,
): boolean {
  if (context.isSuperAdmin) {
    return true;
  }

  if (config.tenantEnabled && doc[config.tenantField] !== context.tenantId) {
    return false;
  }

  const rule = config.ownershipRules[collection];

  if (!rule) {
    return true;
  }

  if (
    rule.bypassRoles &&
    hasAnyRole({ role: context.role } as AuthUser, rule.bypassRoles)
  ) {
    return true;
  }

  if (rule.ownerField === "id") {
    return doc.id === context.userId;
  }

  if (rule.ownerField) {
    return doc[rule.ownerField] === context.userId;
  }

  return true;
}

export function filterDocumentsByRLS(
  docs: Record<string, any>[],
  collection: string,
  context: TenantContext,
  config: RLSConfig = DEFAULT_RLS_CONFIG,
): Record<string, any>[] {
  if (context.isSuperAdmin) {
    return docs;
  }

  return docs.filter((doc) =>
    canAccessDocument(doc, collection, context, config),
  );
}

export function sanitizeDocumentByRLS(
  doc: Record<string, any>,
  collection: string,
  context: TenantContext,
  config: RLSConfig = DEFAULT_RLS_CONFIG,
): Record<string, any> | null {
  if (!canAccessDocument(doc, collection, context, config)) {
    return null;
  }

  if (config.tenantEnabled && !context.isSuperAdmin) {
    const { [config.tenantField]: _, ...rest } = doc;
    return rest;
  }

  return doc;
}

export class RLSPolicy {
  private config: RLSConfig;

  constructor(config: RLSConfig = DEFAULT_RLS_CONFIG) {
    this.config = config;
  }

  setConfig(config: RLSConfig): void {
    this.config = config;
  }

  getConfig(): RLSConfig {
    return this.config;
  }

  addOwnershipRule(collection: string, rule: OwnershipRule): void {
    this.config.ownershipRules[collection] = rule;
  }

  removeOwnershipRule(collection: string): void {
    delete this.config.ownershipRules[collection];
  }

  createContext(user: AuthUser | undefined): TenantContext {
    return createTenantContext(user);
  }

  apply<T extends Record<string, any>>(
    query: T,
    collection: string,
    context: TenantContext,
  ): T {
    return applyRLS(query, collection, context, this.config);
  }

  canAccess(
    doc: Record<string, any>,
    collection: string,
    context: TenantContext,
  ): boolean {
    return canAccessDocument(doc, collection, context, this.config);
  }

  filter(
    docs: Record<string, any>[],
    collection: string,
    context: TenantContext,
  ): Record<string, any>[] {
    return filterDocumentsByRLS(docs, collection, context, this.config);
  }

  sanitize(
    doc: Record<string, any>,
    collection: string,
    context: TenantContext,
  ): Record<string, any> | null {
    return sanitizeDocumentByRLS(doc, collection, context, this.config);
  }
}
