import type { CollectionConfig, GlobalConfig } from "../../../registry/types.js";
import type { User, Request as KyroRequest } from "../../../hooks/types.js";
import {
  checkCollectionAccess as checkCollAccessShared,
  checkGlobalAccess as checkGblAccessShared,
} from "../../../access/checker.js";
import { createAuthMiddleware } from "../auth-middleware.js";
import { WEBHOOK_EVENTS, type WebhookEvent } from "../../../webhooks/index.js";
import type { Context } from "hono";
import { ApiError } from "../../../utils/errors.js";

export function jsonError(c: Context, error: unknown) {
  if (error instanceof ApiError) {
    return c.json({ error: error.message }, error.statusCode as any);
  }
  const message = error instanceof Error ? error.message : "Internal Server Error";
  return c.json({ error: message }, 500);
}

const COLLECTION_EVENT_MAP: Record<
  string,
  { create: WebhookEvent; update: WebhookEvent; delete: WebhookEvent }
> = {
  _media: {
    create: WEBHOOK_EVENTS.MEDIA_UPLOAD,
    update: WEBHOOK_EVENTS.MEDIA_UPLOAD,
    delete: WEBHOOK_EVENTS.MEDIA_DELETE,
  },
};

export function getWebhookEvent(
  collection: string,
  operation: "create" | "update" | "delete",
): WebhookEvent {
  const mapped = COLLECTION_EVENT_MAP[collection];
  if (mapped) return mapped[operation];
  return `collection.${operation}` as WebhookEvent;
}

export interface AccessCheckResult {
  allowed: boolean;
  error?: string;
  status?: number;
}

export function extractIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export function auditApiKeyUsage(
  sessionAuthAdapter: any,
  apiKeyContext: any,
  endpoint: string,
  method: string,
  req: Request,
) {
  if (apiKeyContext?.apiKeyId && sessionAuthAdapter) {
    sessionAuthAdapter.createAuditLog({
      action: "api_request",
      userId: apiKeyContext.userId || "",
      resource: "api_key",
      resourceId: apiKeyContext.apiKeyId,
      success: true,
      metadata: {
        endpoint,
        method,
        ip: extractIp(req),
      },
    });
  }
}

export function readBaseUpdatedAt(body: Record<string, any>): string | null | undefined {
  return body.baseUpdatedAt ?? body._baseUpdatedAt;
}

export function omitRevisionFields<T extends Record<string, any>>(body: T): T {
  const { baseUpdatedAt, _baseUpdatedAt, ...rest } = body;
  return rest as T;
}

export function buildConflictResponse(
  expectedUpdatedAt: string | null | undefined,
  currentDoc: Record<string, any>,
) {
  return {
    error: "Document has changed since you started editing",
    code: "REVISION_CONFLICT",
    conflict: {
      expectedUpdatedAt: expectedUpdatedAt ?? null,
      actualUpdatedAt: currentDoc.updatedAt ?? null,
      current: currentDoc,
    },
  };
}

const reqAccessCache = new WeakMap<object, Map<string, AccessCheckResult>>();

export async function checkCollectionAccess(
  collection: CollectionConfig,
  operation: "read" | "create" | "update" | "delete",
  req: any,
  ctxUser?: User,
  ctxTenantID?: string,
  apiKeyContext?: any,
  enablePublicAccess: boolean = true,
  defaultCollectionAccess: string = "none",
): Promise<AccessCheckResult> {
  const reqObj = (req && typeof req === "object") ? req : null;
  const cacheKey = reqObj
    ? `col:${collection.slug}:${operation}:${ctxUser?.id || "anon"}:${ctxTenantID || ""}:${apiKeyContext?.apiKeyId || ""}`
    : null;

  if (reqObj && cacheKey) {
    let cacheMap = reqAccessCache.get(reqObj);
    if (cacheMap && cacheMap.has(cacheKey)) {
      return cacheMap.get(cacheKey)!;
    }
  }

  const result = await checkCollAccessShared(collection, operation, {
    user: ctxUser,
    req,
    tenantId: ctxTenantID,
    apiKey: apiKeyContext,
  }, {
    enablePublicAccess,
    defaultAccess: defaultCollectionAccess,
  });

  if (reqObj && cacheKey) {
    let cacheMap = reqAccessCache.get(reqObj);
    if (!cacheMap) {
      cacheMap = new Map();
      reqAccessCache.set(reqObj, cacheMap);
    }
    cacheMap.set(cacheKey, result);
  }

  return result;
}

export async function ensureCollectionAccess(
  collection: CollectionConfig,
  operation: "read" | "create" | "update" | "delete",
  req: any,
  ctxUser?: User,
  ctxTenantID?: string,
  apiKeyContext?: any,
  enablePublicAccess: boolean = true,
  defaultCollectionAccess: string = "none",
): Promise<AccessCheckResult> {
  const access = await checkCollectionAccess(
    collection,
    operation,
    req,
    ctxUser,
    ctxTenantID,
    apiKeyContext,
    enablePublicAccess,
    defaultCollectionAccess,
  );
  if (!access.allowed) {
    throw new ApiError((access.status || 403) as number, access.error || "Access denied");
  }
  return access;
}

export async function checkGlobalAccess(
  global: GlobalConfig,
  operation: "read" | "update",
  req: any,
  ctxUser?: User,
  ctxTenantID?: string,
  enablePublicAccess: boolean = true,
): Promise<AccessCheckResult> {
  const reqObj = (req && typeof req === "object") ? req : null;
  const cacheKey = reqObj
    ? `gbl:${global.slug}:${operation}:${ctxUser?.id || "anon"}:${ctxTenantID || ""}`
    : null;

  if (reqObj && cacheKey) {
    let cacheMap = reqAccessCache.get(reqObj);
    if (cacheMap && cacheMap.has(cacheKey)) {
      return cacheMap.get(cacheKey)!;
    }
  }

  const result = await checkGblAccessShared(global, operation, {
    user: ctxUser,
    req,
    tenantId: ctxTenantID,
  }, {
    enablePublicAccess,
  });

  if (reqObj && cacheKey) {
    let cacheMap = reqAccessCache.get(reqObj);
    if (!cacheMap) {
      cacheMap = new Map();
      reqAccessCache.set(reqObj, cacheMap);
    }
    cacheMap.set(cacheKey, result);
  }

  return result;
}

export async function ensureGlobalAccess(
  global: GlobalConfig,
  operation: "read" | "update",
  req: any,
  ctxUser?: User,
  ctxTenantID?: string,
  enablePublicAccess: boolean = true,
): Promise<AccessCheckResult> {
  const access = await checkGlobalAccess(
    global,
    operation,
    req,
    ctxUser,
    ctxTenantID,
    enablePublicAccess,
  );
  if (!access.allowed) {
    throw new ApiError((access.status || 403) as number, access.error || "Access denied");
  }
  return access;
}

export async function resolveAuthContext(
  req: globalThis.Request,
  authMw: ReturnType<typeof createAuthMiddleware> | null,
  staticUser?: User,
  staticTenantID?: string,
): Promise<{
  user: User | undefined;
  tenantId: string | undefined;
  apiKeyContext: any;
  authType?: string;
}> {
  if (staticUser) {
    return {
      user: staticUser,
      tenantId: staticTenantID,
      apiKeyContext: undefined,
      authType: "static",
    };
  }

  if (authMw) {
    const res = await authMw(req);
    if (res.status === 200 && res.user) {
      return {
        user: res.user as any,
        tenantId: res.tenantContext?.tenantId,
        apiKeyContext: res.apiKeyContext,
        authType: res.authType,
      };
    }
  }

  return {
    user: undefined,
    tenantId: undefined,
    apiKeyContext: undefined,
    authType: undefined,
  };
}

export function triggerWebhookEvent(
  webhookService: any,
  collection: string,
  operation: "create" | "update" | "delete",
  data: any,
  ctxUser?: User,
  ctxTenantID?: string,
  previousData?: any
) {
  if (!webhookService) return;
  webhookService
    .trigger(getWebhookEvent(collection, operation), {
      collection,
      operation,
      data,
      previousData,
      user: ctxUser ? { id: ctxUser.id, email: ctxUser.email, role: ctxUser.role } : undefined,
      tenantId: ctxTenantID,
    })
    .catch((err: any) => console.error(`[Webhook] Failed to trigger:`, err));
}

export function logAuditAction(
  sessionAuthAdapter: any,
  action: string,
  ctxUser?: User,
  resource?: string,
  resourceId?: string,
  metadata?: Record<string, any>
) {
  if (!ctxUser || !sessionAuthAdapter) return;
  sessionAuthAdapter.createAuditLog({
    action,
    userId: ctxUser.id,
    resource,
    resourceId,
    success: true,
    metadata,
  });
}
