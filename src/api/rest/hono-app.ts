import crypto from "crypto";
import { Hono } from "hono";
import { sign, verify } from "hono/jwt";
import { resolve, join } from "path";
import { existsSync, readFileSync } from "fs";
// sharp is imported dynamically at usage sites to prevent browser bundling
import type {
  BaseAdapter,
  CollectionConfig,
  GlobalConfig,
} from "../../registry/types.js";
import { Registry } from "../../registry/index.js";
import { type WhereClause } from "../../access/types.js";
import { populateRelationships } from "../../utils/populate.js";
import { sanitizeDoc } from "../../utils/sanitize.js";
import { findFieldByName } from "../../utils/field-helpers.js";
import {
  checkCollectionAccess as checkCollAccessShared,
  checkGlobalAccess as checkGblAccessShared,
} from "../../access/checker.js";
import type { User, Request as KyroRequest } from "../../hooks/types.js";
import {
  createAuthMiddleware,
  type AuthMiddlewareResult,
  hasApiKeyPermission,
} from "./auth-middleware.js";
import {
  createWebhookService,
  WEBHOOK_EVENTS,
  type WebhookEvent,
} from "../../webhooks/index.js";
import { getSessionIdFromRequest, refreshSession, getUserSessions, updateSessionName, deleteSession } from "../../api/rest/auth-session.js";
import { loadSecrets } from "../../lib/secret.js";
import { EmailTransport } from "../../auth/nodemailer-transport.js";
import { InMemoryRateLimiter } from "../../auth/security/in-memory-rate-limit.js";
import { AuthRoutes } from "./auth-routes.js";
import { SQLiteAuthAdapter } from "../../auth/sqlite-adapter.js";
import { DrizzleAdapter } from "../../database/drizzle/adapter.js";
import { PostgresAuthAdapter } from "../../database/drizzle/postgres-auth-adapter.js";
import { D1AuthAdapter } from "../../database/drizzle/d1-auth-adapter.js";
import { MongoDBAdapter } from "../../database/mongodb/adapter.js";
import { MongoDBAuthAdapter } from "../../database/mongodb/mongo-auth-adapter.js";
import { MediaService } from "../../storage/MediaService.js";
import { hasPermission } from "../../auth/rbac/checker.js";
import { JWTPayload } from "../../auth/types.js";
import { generateApiKey, generateApiKeyPrefix, API_KEY_COLLECTION } from "../../auth/api-key.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { usersCollection as defaultUsersCollection } from "../../templates/auth.js";

function formatZodErrors(errors: any[]): string {
  return errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
}

function normalizeEmptyStrings(data: any, fields: any[]): void {
  if (!data || typeof data !== 'object') return;
  for (const field of fields) {
    if (field.type === 'tabs' && Array.isArray(field.tabs)) {
      const target = field.name ? data[field.name] : data;
      if (target && typeof target === 'object') {
        for (const tab of field.tabs) {
          if (Array.isArray(tab.fields)) normalizeEmptyStrings(target, tab.fields);
        }
      }
      continue;
    }
    if (!field.name || !(field.name in data)) continue;
    const val = data[field.name];
    if (val === "") {
      const isTextual = field.type === 'text' || field.type === 'textarea' || field.type === 'code' || field.type === 'markdown';
      if (!isTextual) data[field.name] = null;
    }
    if ((field.type === 'group' || field.type === 'collapsible') && field.name && Array.isArray(field.fields) && data[field.name] && typeof data[field.name] === 'object') {
      normalizeEmptyStrings(data[field.name], field.fields);
    } else if (field.type === 'array' && field.name && Array.isArray(field.fields) && Array.isArray(data[field.name])) {
      for (const item of data[field.name]) {
        if (item && typeof item === 'object') normalizeEmptyStrings(item, field.fields);
      }
    } else if (field.type === 'blocks' && field.name && Array.isArray(field.blocks) && Array.isArray(data[field.name])) {
      for (const item of data[field.name]) {
        if (!item || typeof item !== 'object') continue;
        const blockTypeStr = item.type || item.blockType;
        if (!blockTypeStr) continue;
        const blockDef = field.blocks.find((b: any) => b.slug === blockTypeStr);
        if (!blockDef || !Array.isArray(blockDef.fields)) continue;
        const target = item.data && typeof item.data === 'object' ? item.data : item;
        normalizeEmptyStrings(target, blockDef.fields);
      }
    }
  }
}

function convertRichtextFields(fields: any[], data: any): void {
  if (!data || typeof data !== 'object') return;
  for (const field of fields) {
    if (field.type === 'tabs' && Array.isArray(field.tabs)) {
      const target = field.name ? data[field.name] : data;
      if (target && typeof target === 'object') {
        for (const tab of field.tabs) {
          if (Array.isArray(tab.fields)) convertRichtextFields(tab.fields, target);
        }
      }
    }
    if (field.type === 'richtext' && field.name) {
      const val = data[field.name];
      if (typeof val === 'string') {
        data[field.name] = [{ type: "paragraph", children: [{ text: val }] }];
      } else if (val && typeof val === 'object' && !Array.isArray(val) && val.type === 'doc' && Array.isArray(val.content)) {
        data[field.name] = val.content;
      }
    }
    if ((field.type === 'group' || field.type === 'collapsible') && field.name && Array.isArray(field.fields) && data[field.name] && typeof data[field.name] === 'object') {
      convertRichtextFields(field.fields, data[field.name]);
    } else if (field.type === 'array' && field.name && Array.isArray(field.fields) && Array.isArray(data[field.name])) {
      for (const item of data[field.name]) {
        if (item && typeof item === 'object') convertRichtextFields(field.fields, item);
      }
    } else if (field.type === 'blocks' && field.name && Array.isArray(field.blocks) && Array.isArray(data[field.name])) {
      for (const item of data[field.name]) {
        if (!item || typeof item !== 'object') continue;
        const blockTypeStr = item.type || item.blockType;
        if (!blockTypeStr) continue;
        const blockDef = field.blocks.find((b: any) => b.slug === blockTypeStr);
        if (!blockDef || !Array.isArray(blockDef.fields)) continue;
        const target = item.data && typeof item.data === 'object' ? item.data : item;
        convertRichtextFields(blockDef.fields, target);
      }
    }
  }
}

function clearUniqueFields(fields: any[], data: any): void {
  if (!data || typeof data !== 'object') return;
  for (const field of fields) {
    if (!field.name || !(field.name in data)) continue;
    
    if (field.unique) {
      if (field.type === 'text' || field.type === 'email') {
        data[field.name] = `${data[field.name] || field.name}-copy-${Date.now().toString(36)}`;
      } else {
        delete data[field.name];
      }
    }

    if (field.type === 'tabs' && field.name && Array.isArray(field.tabs) && data[field.name] && typeof data[field.name] === 'object') {
      for (const tab of field.tabs) {
        if (Array.isArray(tab.fields)) clearUniqueFields(tab.fields, data[field.name]);
      }
    } else if ((field.type === 'group' || field.type === 'collapsible') && field.name && Array.isArray(field.fields) && data[field.name] && typeof data[field.name] === 'object') {
      clearUniqueFields(field.fields, data[field.name]);
    } else if (field.type === 'array' && field.name && Array.isArray(field.fields) && Array.isArray(data[field.name])) {
      for (const item of data[field.name]) {
        if (item && typeof item === 'object') {
          delete item.id;
          clearUniqueFields(field.fields, item);
        }
      }
    } else if (field.type === 'blocks' && field.name && Array.isArray(field.blocks) && Array.isArray(data[field.name])) {
      for (const item of data[field.name]) {
        if (!item || typeof item !== 'object') continue;
        delete item.id;
        const blockTypeStr = item.type || item.blockType;
        if (!blockTypeStr) continue;
        const blockDef = field.blocks.find((b: any) => b.slug === blockTypeStr);
        if (!blockDef || !Array.isArray(blockDef.fields)) continue;
        const target = item.data && typeof item.data === 'object' ? item.data : item;
        clearUniqueFields(blockDef.fields, target);
      }
    }
  }
}

// ============================================================================
// REST API Factory
// ============================================================================

export interface HonoAppOptions {
  registry: Registry;
  db: BaseAdapter;
  authSecret?: string;
  authAdapter?: any; // NEW
  checkSession?: boolean; // NEW - default true
  user?: User;
  req?: any;
  tenantId?: string;
  cors?: {
    origins?: string[];
    credentials?: boolean;
  };
  webhookService?: ReturnType<typeof createWebhookService>;
  settings?: {
    access?: {
      enablePublicAccess?: boolean;
      defaultCollectionAccess?: string;
      apiAccess?: {
        graphqlEnabled?: boolean;
        trpcEnabled?: boolean;
        websocketEnabled?: boolean;
        requireAuth?: boolean;
        cors?: {
          allowedOrigins?: string[] | string;
        };
      };
      rateLimiting?: {
        enabled?: boolean;
        maxRequests?: number;
        windowMs?: number;
      };
    };
  };
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

function getWebhookEvent(
  collection: string,
  operation: "create" | "update" | "delete",
): WebhookEvent {
  const mapped = COLLECTION_EVENT_MAP[collection];
  if (mapped) return mapped[operation];
  return `collection.${operation}` as WebhookEvent;
}

// ============================================================================
// Access Check Helper
// ============================================================================

interface AccessCheckResult {
  allowed: boolean;
  error?: string;
  status?: number;
}

function extractIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function auditApiKeyUsage(
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

function readBaseUpdatedAt(body: Record<string, any>): string | null | undefined {
  return body.baseUpdatedAt ?? body._baseUpdatedAt;
}

function omitRevisionFields<T extends Record<string, any>>(body: T): T {
  const { baseUpdatedAt, _baseUpdatedAt, ...rest } = body;
  return rest as T;
}

function buildConflictResponse(
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

async function checkCollectionAccess(
  collection: CollectionConfig,
  operation: "read" | "create" | "update" | "delete",
  req: any,
  ctxUser?: User,
  ctxTenantID?: string,
  apiKeyContext?: any,
  enablePublicAccess: boolean = true,
  defaultCollectionAccess: string = "none",
): Promise<AccessCheckResult> {
  const result = await checkCollAccessShared(collection, operation, {
    user: ctxUser,
    req,
    tenantId: ctxTenantID,
    apiKey: apiKeyContext,
  }, {
    enablePublicAccess,
    defaultAccess: defaultCollectionAccess,
  });
  return result;
}

async function checkGlobalAccess(
  global: GlobalConfig,
  operation: "read" | "update",
  req: any,
  ctxUser?: User,
  ctxTenantID?: string,
  enablePublicAccess: boolean = true,
): Promise<AccessCheckResult> {
  const result = await checkGblAccessShared(global, operation, {
    user: ctxUser,
    req,
    tenantId: ctxTenantID,
  }, {
    enablePublicAccess,
  });
  return result;
}

// ============================================================================
// Auth Context Resolution
// ============================================================================

async function resolveAuthContext(
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

// ============================================================================
// Auth Adapter Factory (auto-detect dialect)
// ============================================================================

function createDefaultAuthAdapter(
  db: BaseAdapter,
  rootDir: string,
): any {
  if ('dialect' in db && db.dialect === "postgres" && db instanceof DrizzleAdapter) {
    return new PostgresAuthAdapter({ db: db.client });
  }
  if ('dialect' in db && db.dialect === "sqlite" && db instanceof DrizzleAdapter) {
    return new D1AuthAdapter({ db: db.client });
  }
  if ('dialect' in db && db.dialect === "mongodb") {
    // We safely assert db as MongoDBAdapter
    const mongoDb = db as MongoDBAdapter;
    return new MongoDBAuthAdapter({ db: () => mongoDb.db });
  }
  const defaultAuthDbPath = resolve(rootDir, "data", "auth.db");
  return new SQLiteAuthAdapter({
    path: process.env.KYRO_AUTH_DB_PATH || defaultAuthDbPath,
  });
}

// ============================================================================
// Hono App Factory
// ============================================================================

export function createHonoApp(options: HonoAppOptions): Hono {
  const {
    registry,
    db,
    authSecret,
    authAdapter,
    checkSession,
    user,
    tenantId,
    cors,
    webhookService,
    settings,
  } = options;
  const app = new Hono();

  // Utility to recursively remove 'attrs' from the API response
  function removeAttrs(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(removeAttrs);
    } else if (obj !== null && typeof obj === 'object') {
      const newObj: any = {};
      for (const key in obj) {
        if (key === 'attrs') continue;
        newObj[key] = removeAttrs(obj[key]);
      }
      return newObj;
    }
    return obj;
  }

  // Middleware to sanitize API responses for external clients
  app.use('*', async (c, next) => {
    await next();
    
    // Check if the request is from the Admin panel
    const referer = c.req.header('referer') || '';
    const isKyroAdmin = c.req.header('x-kyro-admin') === 'true' || referer.includes('/admin');
    
    if (!isKyroAdmin) {
      const contentType = c.res.headers.get('Content-Type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const clonedResponse = c.res.clone();
          const body = await clonedResponse.json();
          const strippedBody = removeAttrs(body);
          c.res = c.json(strippedBody, c.res.status as any);
        } catch (e) {
          // Ignore parse errors, just return original response
        }
      }
    }
  });

  // Inject Plugin API Routes
  for (const plugin of registry.getPlugins()) {
    if (typeof plugin.serverMiddleware === 'function') {
      plugin.serverMiddleware(app);
    }
  }

  const apiAccess = settings?.access?.apiAccess;
  const enablePublicAccess = settings?.access?.enablePublicAccess ?? false;
  const defaultCollectionAccess =
    settings?.access?.defaultCollectionAccess ?? "none";

  const requireAuth = apiAccess?.requireAuth;

  // Resolve the true project root dynamically
  const cwd = process.cwd();
  const rootDir = cwd.endsWith("admin") ? resolve(cwd, "..") : cwd;

  // Create auth adapter early for session checking
  const sessionAuthAdapter = authAdapter || createDefaultAuthAdapter(db, rootDir);

  // Always create auth middleware if authSecret is provided
  // This enables auth-based access for collection routes
  // checkSession defaults to true unless explicitly set to false
  const shouldCheckSession = checkSession !== false;
  // Use sessionAuthAdapter for session checking (created below)
  const sessionChecker = sessionAuthAdapter;
  const authMw = createAuthMiddleware({
      secret: authSecret || "change-me",
      db,
      userLookup: async (userId: string) => {
        const user = await sessionAuthAdapter.findUserById(userId);
        return user || null;
      },
      checkSession: shouldCheckSession
        ? async (
          userId: string,
          token: string,
          req?: Request,
          payload?: JWTPayload,
        ) => {
          // Check session if sessionAuthAdapter exists
          if (!sessionChecker) return true;
          try {
            const sessionToken = payload?.sid || token;

            let session =
              await sessionChecker.findSessionByToken(sessionToken);

            if (!session && req) {
              const cookieHeader = req.headers.get("Cookie") || "";
              const match = cookieHeader.match(/refresh_token=([^;]+)/);
              if (match) {
                session = await sessionChecker.findSessionByRefreshToken(
                  match[1],
                );
              }
            }

            return !!session;
          } catch {
            return false;
          }
        }
        : undefined,
    });

  // CORS middleware
  const settingsCorsRaw = apiAccess?.cors?.allowedOrigins;
  const optionsCors = cors?.origins;
  const settingsCors = Array.isArray(settingsCorsRaw)
    ? settingsCorsRaw
    : typeof settingsCorsRaw === "string" && settingsCorsRaw
      ? settingsCorsRaw
        .split("\n")
        .map((s: string) => s.trim())
        .filter(Boolean)
      : [];
  const allowedOrigins: string[] =
    settingsCors.length > 0 ? settingsCors : optionsCors || [];
  const corsEnabled = allowedOrigins.length > 0 || !!cors;

  if (corsEnabled) {
    app.use("*", async (c, next) => {
      const origin = c.req.header("Origin") || "*";

      if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
        return c.json({ error: "Origin not allowed" }, 403);
      }

      const allowOrigin = allowedOrigins.length > 0 ? origin : "*";
      c.header("Access-Control-Allow-Origin", allowOrigin);
      c.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PATCH, DELETE, OPTIONS",
      );
      c.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-API-Key",
      );
      if (cors?.credentials) {
        c.header("Access-Control-Allow-Credentials", "true");
      }
      if (c.req.method === "OPTIONS") {
        return c.text("");
      }
      await next();
    });
  }

  // Rate limiting middleware
  const rateLimiting = settings?.access?.rateLimiting;
  let rateLimiter: InMemoryRateLimiter | undefined;

  if (rateLimiting?.enabled) {
    const maxRequests = rateLimiting.maxRequests || 100;
    const windowMs = rateLimiting.windowMs || 60000;

    rateLimiter = new InMemoryRateLimiter({
      "api:general": { window: windowMs, max: maxRequests },
    });

    app.use("/api/*", async (c, next) => {
      if (!rateLimiter) {
        return next();
      }

      const ip =
        c.req.header("CF-Connecting-IP") ||
        c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ||
        c.req.header("X-Real-IP") ||
        "unknown";

      const result = await rateLimiter.check("api:general", ip);

      c.header("X-RateLimit-Limit", String(maxRequests));
      c.header("X-RateLimit-Remaining", String(result.remaining));
      c.header("X-RateLimit-Reset", String(result.resetAt));

      if (!result.allowed) {
        return c.json(
          {
            error: "Too many requests",
            retryAfter: result.retryAfter,
          },
          429,
        );
      }

      await next();
    });
  }

  // ============================================================================
  // Auth & Media Routes
  // ============================================================================

  // Auth Routes - uses single DB with absolute path
  // Lazy initialization handled in auth-routes to avoid top-level await issues
  // sessionAuthAdapter already created above for session checking

  const authRoutes = new AuthRoutes({
    redis: sessionAuthAdapter as any, // Using redis property for AuthAdapter
    jwtSecret: authSecret || "change-me",
    baseUrl: process.env.KYRO_BASE_URL || "http://localhost:4321",
    rateLimiter,
  });

  EmailTransport.fromConfig(db).then((transport) => {
    if (transport) {
      (authRoutes as any).email = transport;
    }
  }).catch((err) => {
    console.error("[Email] Failed to initialize transport from config:", err);
  });

  app.post("/api/auth/login", async (c) => authRoutes.login(c.req.raw));
  app.post("/api/auth/register", async (c) => {
    try {
      const systemDoc = await db.findOne({ collection: "_globals_system", where: {} });
      if (systemDoc && systemDoc.enableRegistration === false) {
        return c.json({ error: "User registration is currently disabled by administrator." }, 403);
      }
      if (systemDoc?.defaultRegistrationRole) {
        const rawReq = c.req.raw;
        const contentType = rawReq.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const jsonBody = await c.req.json();
          if (!jsonBody.role) {
            jsonBody.role = systemDoc.defaultRegistrationRole;
          }
          const newReq = new Request(rawReq.url, {
            method: rawReq.method,
            headers: rawReq.headers,
            body: JSON.stringify(jsonBody),
          });
          return authRoutes.register(newReq);
        }
      }
    } catch {
      // Proceed if global system table is not initialized yet
    }
    return authRoutes.register(c.req.raw);
  });
  app.post("/api/auth/logout", async (c) => authRoutes.logout(c.req.raw));
  app.post("/api/auth/refresh", async (c) => authRoutes.refresh(c.req.raw));
  app.get("/api/auth/me", async (c) => authRoutes.me(c.req.raw));
  app.post("/api/auth/forgot-password", async (c) => authRoutes.forgotPassword(c.req.raw));
  app.post("/api/auth/reset-password", async (c) => authRoutes.resetPassword(c.req.raw));
  app.post("/api/auth/change-password", async (c) => authRoutes.changePassword(c.req.raw));
  app.get("/api/auth/verify-email", async (c) => authRoutes.verifyEmail(c.req.raw));
  app.post("/api/auth/verify-email", async (c) => authRoutes.verifyEmail(c.req.raw));
  app.get("/api/auth/verify", async (c) => authRoutes.verifyEmail(c.req.raw));
  app.post("/api/auth/verify", async (c) => authRoutes.verifyEmail(c.req.raw));

  // Session management
  app.get("/api/auth/sessions", async (c) => authRoutes.listSessions(c.req.raw));
  app.post("/api/auth/sessions/refresh", async (c) => authRoutes.refreshSession(c.req.raw));
  app.delete("/api/auth/sessions", async (c) => authRoutes.revokeOtherSessions(c.req.raw));
  app.delete("/api/auth/sessions/:id", async (c) => authRoutes.revokeSession(c.req.raw, c.req.param("id")));
app.put("/api/auth/sessions/:id/name", async (c) => authRoutes.renameSession(c.req.raw, c.req.param("id")));

  app.get("/api/auth/access", async (c) => {
    try {
      const { user: ctxUser, tenantId: ctxTenantID } = await resolveAuthContext(
        c.req.raw,
        authMw,
        user,
        tenantId,
      );

      if (!ctxUser) {
        return c.json({ error: "Not authenticated" }, 401);
      }

      const collections: Record<string, any> = {};
      const globals: Record<string, any> = {};

      for (const col of registry.getCollections()) {
        const permissions = {
          read: (
            await checkCollectionAccess(
              col,
              "read",
              c.req.raw,
              ctxUser,
              ctxTenantID,
              undefined,
              enablePublicAccess,
              defaultCollectionAccess,
            )
          ).allowed,
          create: (
            await checkCollectionAccess(
              col,
              "create",
              c.req.raw,
              ctxUser,
              ctxTenantID,
              undefined,
              enablePublicAccess,
              defaultCollectionAccess,
            )
          ).allowed,
          update: (
            await checkCollectionAccess(
              col,
              "update",
              c.req.raw,
              ctxUser,
              ctxTenantID,
              undefined,
              enablePublicAccess,
              defaultCollectionAccess,
            )
          ).allowed,
          delete: (
            await checkCollectionAccess(
              col,
              "delete",
              c.req.raw,
              ctxUser,
              ctxTenantID,
              undefined,
              enablePublicAccess,
              defaultCollectionAccess,
            )
          ).allowed,
        };
        collections[col.slug] = permissions;
      }

      for (const globalConfig of registry.getGlobals()) {
        const permissions = {
          read: (
            await checkGlobalAccess(
              globalConfig,
              "read",
              c.req.raw,
              ctxUser,
              ctxTenantID,
              enablePublicAccess,
            )
          ).allowed,
          update: (
            await checkGlobalAccess(
              globalConfig,
              "update",
              c.req.raw,
              ctxUser,
              ctxTenantID,
              enablePublicAccess,
            )
          ).allowed,
        };
        globals[globalConfig.slug] = permissions;
      }

      return c.json({ collections, globals });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // Dedicated Users Routes (backed by auth adapter, not main DB)
  const usersCollection = (typeof registry.hasCollection === "function" && registry.hasCollection("users"))
    ? registry.getCollection("users")
    : (() => {
        try {
          return registry.getCollection("users");
        } catch {
          return defaultUsersCollection;
        }
      })();

  app.get("/api/users", async (c) => {
    try {
      const { user: ctxUser, tenantId: ctxTenantID } = await resolveAuthContext(
        c.req.raw,
        authMw,
        user,
        tenantId,
      );

      const access = await checkCollectionAccess(
        usersCollection!,
        "read",
        c.req.raw,
        ctxUser,
        ctxTenantID,
        undefined,
        enablePublicAccess,
        defaultCollectionAccess,
      );
      if (!access.allowed) {
        return c.json({ error: access.error }, (access.status || 403) as any);
      }

      const page = parseInt(c.req.query("page") || "1");
      const limit = Math.min(parseInt(c.req.query("limit") || "10"), 100);
      const search = c.req.query("search") || undefined;

      let docs: any[] = [];
      let totalDocs = 0;

      if (typeof (sessionAuthAdapter as any).findUsers === "function") {
        const res = await (sessionAuthAdapter as any).findUsers({ page, limit, search });
        docs = res.users || [];
        totalDocs = res.total || 0;
      } else {
        const result = await db.find({
          collection: "users",
          page,
          limit,
          where: search ? { email: { contains: search } } : {},
          tenantId: ctxTenantID,
        });
        docs = result.docs || [];
        totalDocs = result.totalDocs || 0;
      }

      return c.json({
        docs,
        totalDocs,
        limit,
        totalPages: Math.ceil(totalDocs / limit) || 1,
        page,
        pagingCounter: (page - 1) * limit + 1,
        hasPrevPage: page > 1,
        hasNextPage: page < Math.ceil(totalDocs / limit),
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page < Math.ceil(totalDocs / limit) ? page + 1 : null,
      });
    } catch (error: any) {
      console.error("[API] Error listing users:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  app.get("/api/users/:id", async (c) => {
    try {
      const { user: ctxUser, tenantId: ctxTenantID } = await resolveAuthContext(
        c.req.raw,
        authMw,
        user,
        tenantId,
      );

      const id = c.req.param("id");
      const found = await sessionAuthAdapter.findUserById(id);
      if (!found) {
        return c.json({ error: "User not found" }, 404);
      }

      return c.json({ data: found });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  app.post("/api/users", async (c) => {
    try {
      const { user: ctxUser, tenantId: ctxTenantID } = await resolveAuthContext(
        c.req.raw,
        authMw,
        user,
        tenantId,
      );

      const access = await checkCollectionAccess(
        usersCollection!,
        "create",
        c.req.raw,
        ctxUser,
        ctxTenantID,
        undefined,
        enablePublicAccess,
        defaultCollectionAccess,
      );
      if (!access.allowed) {
        return c.json({ error: access.error }, (access.status || 403) as any);
      }

      const body = await c.req.json();
      if (!body.email || !body.password) {
        return c.json({ error: "Email and password are required" }, 400);
      }

      const existing = await sessionAuthAdapter.findUserByEmail(body.email);
      if (existing) {
        return c.json({ error: "Email already in use" }, 400);
      }

      const targetRole = body.role || "customer";
      if (targetRole !== "customer" && ctxUser?.role !== "super_admin") {
        return c.json({ error: "Forbidden: Only super_admin can assign administrative roles" }, 403);
      }

      const created = await sessionAuthAdapter.createUser({
        email: body.email,
        password: body.password,
        name: body.name,
        role: targetRole,
        avatar: body.avatar,
        tenantId: body.tenantId,
      });

      if (ctxUser) {
        sessionAuthAdapter?.createAuditLog({
          action: "user_create",
          userId: ctxUser.id,
          resource: "users",
          resourceId: created.id,
          success: true,
        });
      }

      return c.json(
        { data: created, message: "User created successfully" },
        201,
      );
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  app.patch("/api/users/:id", async (c) => {
    try {
      const { user: ctxUser, tenantId: ctxTenantID } = await resolveAuthContext(
        c.req.raw,
        authMw,
        user,
        tenantId,
      );

      const access = await checkCollectionAccess(
        usersCollection!,
        "update",
        c.req.raw,
        ctxUser,
        ctxTenantID,
        undefined,
        enablePublicAccess,
        defaultCollectionAccess,
      );
      if (!access.allowed) {
        return c.json({ error: access.error }, (access.status || 403) as any);
      }

      const id = c.req.param("id");
      const body = await c.req.json();

      const existing = await sessionAuthAdapter.findUserById(id);
      if (!existing) {
        return c.json({ error: "User not found" }, 404);
      }

      const updateData: Record<string, unknown> = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.email !== undefined) updateData.email = body.email;
      if (body.role !== undefined && body.role !== existing.role) {
        if (ctxUser?.role !== "super_admin") {
          return c.json({ error: "Forbidden: Only super_admin can modify user roles" }, 403);
        }
        updateData.role = body.role;
      }
      if (body.avatar !== undefined) {
        updateData.avatar = typeof body.avatar === "object" && body.avatar !== null
          ? (body.avatar.id || String(body.avatar))
          : body.avatar;
      }
      if (body.tenantId !== undefined) updateData.tenantId = body.tenantId;
      if (body.emailVerified !== undefined)
        updateData.emailVerified = body.emailVerified;
      if (body.locked !== undefined) updateData.locked = body.locked;
      if (body.failedLoginAttempts !== undefined)
        updateData.failedLoginAttempts = body.failedLoginAttempts;
      if (body.lastLogin !== undefined) updateData.lastLogin = body.lastLogin;

      const updated = await sessionAuthAdapter.updateUser(id, updateData);
      if (!updated) {
        return c.json({ error: "User update failed" }, 500);
      }

      if (ctxUser) {
        sessionAuthAdapter?.createAuditLog({
          action: "user_update",
          userId: ctxUser.id,
          resource: "users",
          resourceId: id,
          success: true,
        });
        if (body.role && existing.role !== body.role) {
          sessionAuthAdapter?.createAuditLog({
            action: "role_change",
            userId: ctxUser.id,
            resource: "users",
            resourceId: id,
            success: true,
            metadata: { oldRole: existing.role, newRole: body.role }
          });
        }
      }

      return c.json({ data: updated, message: "User updated successfully" });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  app.delete("/api/users/:id", async (c) => {
    try {
      const { user: ctxUser, tenantId: ctxTenantID } = await resolveAuthContext(
        c.req.raw,
        authMw,
        user,
        tenantId,
      );

      const access = await checkCollectionAccess(
        usersCollection!,
        "delete",
        c.req.raw,
        ctxUser,
        ctxTenantID,
        undefined,
        enablePublicAccess,
        defaultCollectionAccess,
      );
      if (!access.allowed) {
        return c.json({ error: access.error }, (access.status || 403) as any);
      }

      const id = c.req.param("id");

      if (ctxUser && ctxUser.id === id) {
        return c.json({ error: "You cannot delete your own account" }, 403);
      }

      const existing = await sessionAuthAdapter.findUserById(id);
      if (!existing) {
        return c.json({ error: "User not found" }, 404);
      }

      const deleted = await sessionAuthAdapter.deleteUser(id);
      if (!deleted) {
        return c.json({ error: "User deletion failed" }, 500);
      }

      if (ctxUser) {
        sessionAuthAdapter?.createAuditLog({
          action: "user_delete",
          userId: ctxUser.id,
          resource: "users",
          resourceId: id,
          success: true,
        });
      }

      return c.json({ data: existing, message: "User deleted successfully" });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // Audit Logs Route (backed by auth adapter)
  app.get("/api/auth/audit-logs", async (c) => {
    try {
      const { user: ctxUser, tenantId: ctxTenantID } = await resolveAuthContext(
        c.req.raw,
        authMw,
        user,
        tenantId,
      );

      const auditLogsCollection = registry.getCollection("audit_logs");
      if (auditLogsCollection) {
        const access = await checkCollectionAccess(
          auditLogsCollection,
          "read",
          c.req.raw,
          ctxUser,
          ctxTenantID,
          undefined,
          enablePublicAccess,
          defaultCollectionAccess,
        );
        if (!access.allowed) {
          return c.json({ error: access.error }, (access.status || 403) as any);
        }
      } else if (!ctxUser) {
        return c.json({ error: "Authentication required" }, 401);
      }

      const page = parseInt(c.req.query("page") || "1");
      const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
      const action = c.req.query("action") || undefined;
      const userId = c.req.query("userId") || undefined;
      const resource = c.req.query("resource") || undefined;

      const result = await sessionAuthAdapter.findAuditLogs({
        action,
        userId,
        resource,
        limit,
        offset: (page - 1) * limit,
      });

      return c.json({
        docs: result.logs,
        totalDocs: result.total,
        limit,
        totalPages: Math.ceil(result.total / limit),
        page,
        pagingCounter: (page - 1) * limit + 1,
        hasPrevPage: page > 1,
        hasNextPage: page < Math.ceil(result.total / limit),
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page < Math.ceil(result.total / limit) ? page + 1 : null,
      });
    } catch (error: any) {
      console.error("[API] Error listing audit logs:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Media Routes
  // Note: MediaService.init is async, so we'll lazy-load or assume it's ready.
  // In a real production app, we'd handle the async init better.
  let mediaService: MediaService | null = null;
  let mediaServiceInitError: any = null;

  const getMedia = async () => {
    if (mediaServiceInitError) {
      throw mediaServiceInitError;
    }
    if (!mediaService) {
      try {
        let dialect: any = "sqlite";
        if ('dialect' in db && db.dialect === "postgres" && db instanceof DrizzleAdapter) {
          dialect = db.dialect;
        } else if ('dialect' in db && db.dialect === "mongodb") {
          dialect = "mongodb";
        }
        const mediaDb = dialect === "postgres" && db instanceof DrizzleAdapter ? db.client : db;
        mediaService = await MediaService.init(mediaDb, { dialect });
      } catch (error: any) {
        console.error("[getMedia] Init error:", error);
        mediaServiceInitError = error;
        throw error;
      }
    }
    return mediaService;
  };

  // ============================================================================
  // Media Routes (authenticated)
  // ============================================================================

  app.get("/api/media", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser) return c.json({ error: "Authentication required" }, 401);
      const service = await getMedia();
      const origin = new URL(c.req.url).origin;
      const page = parseInt(c.req.query("page") || "1");
      const limit = parseInt(c.req.query("limit") || "30");
      const search = c.req.query("search") || "";
      const type = c.req.query("type") || "";
      const folder = c.req.query("folder") || "";

      const result = await service.find({ page, limit, search, type, folder }, origin);
      return c.json(result);
    } catch (error: any) {
      console.error("[Media] find error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  app.post("/api/media/upload", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser) {
        return c.json({ error: "Authentication required" }, 401);
      }
      const service = await getMedia();
      const contentType = c.req.header("content-type") || "";
      const origin = new URL(c.req.url).origin;

      if (contentType.includes("multipart/form-data")) {
        const formData = await c.req.formData();
        const file = formData.get("file") as File;
        const folder = (formData.get("folder") as string) || "";

        if (!file) return c.json({ error: "No file uploaded" }, 400);

        const result = await service.upload(file, folder, origin);
        return c.json(result);
      }

      const body = await c.req.json();
      const { url } = body;
      const folder = body.folder || "";
      if (!url) return c.json({ error: "No URL provided" }, 400);
      const result = await service.uploadFromUrl(url, folder, origin);
      return c.json(result);
    } catch (error: any) {
      console.error("[Media] upload error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  app.get("/api/media/folders", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser) return c.json({ error: "Authentication required" }, 401);
      const service = await getMedia();
      const folders = await service.listFolders();
      return c.json(folders);
    } catch (error: any) {
      console.error("[Media] folders error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  app.post("/api/media/folders", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser) return c.json({ error: "Authentication required" }, 401);
      const service = await getMedia();
      const body = await c.req.json();
      const { name, parentPath } = body;
      if (!name) {
        return c.json({ error: "Folder name is required" }, 400);
      }
      await service.createFolder(name, parentPath || "");
      return c.json({
        message: "Folder created",
        path: parentPath ? `${parentPath}/${name}` : name,
      });
    } catch (error: any) {
      console.error("[Media] create folder error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  app.delete("/api/media/folders", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser) return c.json({ error: "Authentication required" }, 401);
      const service = await getMedia();
      const path = c.req.query("path");
      if (!path) {
        return c.json({ error: "Path is required" }, 400);
      }
      await service.deleteFolder(path);
      return c.json({ message: "Folder deleted" });
    } catch (error: any) {
      console.error("[Media] delete folder error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  app.delete("/api/media/:id", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser) return c.json({ error: "Authentication required" }, 401);
      const service = await getMedia();
      const id = c.req.param("id");
      const origin = new URL(c.req.url).origin;
      await service.delete(id, origin);
      return c.json({ success: true });
    } catch (error: any) {
      console.error("[Media] delete error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  app.get("/api/media/resize", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser) return c.json({ error: "Authentication required" }, 401);
      const url = c.req.query("url");
      const w = parseInt(c.req.query("w") || "0");
      const h = parseInt(c.req.query("h") || "0");
      const fit = (c.req.query("fit") || "cover") as any;
      const cx = parseFloat(c.req.query("cx") || "0");
      const cy = parseFloat(c.req.query("cy") || "0");
      const cw = parseFloat(c.req.query("cw") || "0");
      const ch = parseFloat(c.req.query("ch") || "0");

      if (!url) return c.json({ error: "URL is required" }, 400);

      const service = await getMedia();
      const storage: any = (service as any).storage;

      if (storage.name !== "local") {
        return c.redirect(url);
      }

      const uploadDir = storage.config?.uploadDir || join(process.cwd(), "public", "uploads");
      const baseUrl = storage.config?.baseUrl || "/uploads";

      if (!url.startsWith(baseUrl)) {
        return c.redirect(url);
      }

      const relativePath = url.replace(baseUrl, "");
      const physicalPath = join(uploadDir, relativePath);

      if (!existsSync(physicalPath)) {
        return c.json({ error: "File not found" }, 404);
      }

      const imageBuffer = readFileSync(physicalPath);
      const { default: sharp } = await import("sharp");
      let transform = sharp(imageBuffer);

      // Apply crop region (percentages) before resize
      if (cw > 0 && ch > 0) {
        const imgMeta = await sharp(imageBuffer).metadata();
        const imgW = imgMeta.width || 0;
        const imgH = imgMeta.height || 0;
        if (imgW > 0 && imgH > 0) {
          const left = Math.max(0, Math.min(Math.round((cx / 100) * imgW), imgW - 1));
          const top = Math.max(0, Math.min(Math.round((cy / 100) * imgH), imgH - 1));
          const width = Math.max(1, Math.min(Math.round((cw / 100) * imgW), imgW - left));
          const height = Math.max(1, Math.min(Math.round((ch / 100) * imgH), imgH - top));
          transform = transform.extract({ left, top, width, height });
        }
      }

      if (w > 0 || h > 0) {
        transform = transform.resize({
          width: w > 0 ? w : undefined,
          height: h > 0 ? h : undefined,
          fit: fit
        });
      }

      const outputBuffer = await transform.toBuffer();
      const metadata = await sharp(imageBuffer).metadata();

      c.header("Content-Type", `image/${metadata.format || "webp"}`);
      c.header("Cache-Control", "public, max-age=31536000, immutable");
      return c.body(outputBuffer as any);
    } catch (error: any) {
      console.error("[Media] resize error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  app.get("/api/media/:id", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser) return c.json({ error: "Authentication required" }, 401);
      const service = await getMedia();
      const id = c.req.param("id");
      const origin = new URL(c.req.url).origin;
      const doc = await service.findById(id, origin);
      if (!doc) return c.json({ error: "Media not found" }, 404);
      return c.json(doc);
    } catch (error: any) {
      console.error("[Media] get error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  app.patch("/api/media/:id", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser) return c.json({ error: "Authentication required" }, 401);
      const service = await getMedia();
      const id = c.req.param("id");
      const body = await c.req.json();
      const origin = new URL(c.req.url).origin;
      const updatableFields = ["folder", "metadata", "title", "alt", "caption", "originalName"];
      const updates: any = {};
      for (const field of updatableFields) {
        if (body[field] !== undefined) {
          updates[field] = body[field];
        }
      }
      
      if (Object.keys(updates).length > 0) {
        const updated = await service.update(id, updates, origin);
        return c.json({ doc: updated });
      }
      return c.json({ error: "No valid fields to update" }, 400);
    } catch (error: any) {
      console.error("[Media] update error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /api/media/test - Test media service initialization (authenticated)
  app.get("/api/media/test", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser) return c.json({ error: "Authentication required" }, 401);
      const service = await getMedia();
      return c.json({
        status: service ? "initialized" : "failed",
        serviceType: service?.constructor?.name,
      });
    } catch (error: any) {
      console.error("[test] Error:", error);
      return c.json(
        {
          error: error.message,
          type: error.constructor?.name,
          stack: error.stack,
        },
        500,
      );
    }
  });

  // GET /api/storage-status - Storage status info (authenticated)
  app.get("/api/storage-status", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser) return c.json({ error: "Authentication required" }, 401);
      let configured = false;
      let provider = "local";

      if (db) {
        try {
          const row = (db as any)
            .prepare(`SELECT provider FROM "_globals_storage-settings" LIMIT 1`)
            .get() as any;
          if (row && row.provider) {
            configured = true;
            provider = row.provider === "aws" ? "s3" : row.provider;
          }
        } catch {
          try {
            const result = await (db as any).findOne({
              collection: "_globals_storage-settings",
              where: {},
              draft: true,
            });
            if (result && result.provider) {
              configured = true;
              provider = result.provider === "aws" ? "s3" : result.provider;
            }
          } catch { }
        }
      }

      return c.json({
        provider,
        configured,
        usage: 0,
        limit: "unlimited",
      });
    } catch (error: any) {
      console.error("[Storage] status error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /api/plugins — list all registered plugins with enabled state
  app.get("/api/plugins", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser) return c.json({ error: "Authentication required" }, 401);

      const plugins = registry.getPlugins();
      const storageRegistry = registry.storageProviders;

      const pluginList = await Promise.all(
        plugins.map(async (p) => {
          let enabled = true;
          const pluginName = p.name;

          // Try to read enabled state from settings table
          let states: Record<string, boolean> = {};
          try {
            const doc = await db.findOne({
              collection: "_globals_plugin-settings",
              where: {},
              draft: true,
            });
            if (doc && doc.states) states = doc.states;
          } catch {}

          if (states[pluginName] !== undefined) {
            enabled = states[pluginName];
          }

          // Also sync registry
          storageRegistry.setPluginEnabled(pluginName, enabled);

          // Format plugin name beautifully
          let formattedName = pluginName.replace(/^@[^/]+\//, ''); // Remove @scope/
          formattedName = formattedName.replace(/^(plugin|kyro)-/, '');
          
          const acronyms: Record<string, string> = {
            'ai': 'AI',
            'seo': 'SEO',
            's3': 'S3',
            'aws': 'AWS',
            'api': 'API',
            'ui': 'UI',
            'ftp': 'FTP'
          };
          
          formattedName = formattedName.split('-').map(w => {
            const lower = w.toLowerCase();
            if (acronyms[lower]) return acronyms[lower];
            return w.charAt(0).toUpperCase() + w.slice(1);
          }).join(' ');

          // E.g., 'Storage S3' -> 'S3 Storage', 'Storage Cloudinary' -> 'Cloudinary Storage'
          if (formattedName.toLowerCase().startsWith('storage ')) {
            const parts = formattedName.split(' ');
            if (parts.length === 2) {
              formattedName = `${parts[1]} Storage`;
            }
          }

          return {
            id: pluginName,
            name: p.displayName || formattedName,
            version: p.version || "1.0.0",
            description: p.description || "",
            enabled,
            status: enabled ? "active" : "disabled",
          };
        }),
      );

      return c.json(pluginList);
    } catch (error: any) {
      console.error("[Plugins] list error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  // PUT /api/plugins/:name/toggle — toggle plugin enabled state
  app.put("/api/plugins/:name/toggle", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser) return c.json({ error: "Authentication required" }, 401);

      const pluginName = c.req.param("name");
      const storageRegistry = registry.storageProviders;
      const currentEnabled = storageRegistry.isPluginEnabled(pluginName);
      const newEnabled = !currentEnabled;

      // Determine which storage providers would be affected
      const affectedProviders: string[] = [];
      if (!newEnabled) {
        for (const p of storageRegistry.getAll()) {
          if (p.pluginName === pluginName) {
            affectedProviders.push(p.type);
          }
        }
      }

      // If disabling and not forced, check if any affected provider is currently active
      const force = c.req.query("force") === "1";
      if (!force && !newEnabled && affectedProviders.length > 0) {
        let activeProvider = "local";
        try {
          const row = (db as any)
            ?.prepare?.(`SELECT provider FROM "_globals_storage-settings" LIMIT 1`)
            ?.get() as any;
          if (row?.provider) activeProvider = row.provider;
        } catch {
          try {
            const result = await (db as any)?.findOne?.({
              collection: "_globals_storage-settings",
              where: {},
              draft: true,
            });
            if (result?.provider) activeProvider = result.provider;
          } catch {}
        }

        if (affectedProviders.includes(activeProvider)) {
          return c.json({
            error: `Cannot disable "${pluginName}" — storage provider "${activeProvider}" is currently active. Switch to Local storage first.`,
            requiresAction: true,
            activeProvider,
          }, 409);
        }
      }

      // Persist to settings table
      try {
        let states: Record<string, boolean> = {};
        let docId = "global";

        const doc = await db.findOne({
          collection: "_globals_plugin-settings",
          where: {},
          draft: true,
        });
        if (doc) {
          states = doc.states || {};
          docId = doc.id;
        }

        states[pluginName] = newEnabled;

        if (doc) {
          await db.update({
            collection: "_globals_plugin-settings",
            id: docId,
            data: { states },
          });
        } else {
          await db.create({
            collection: "_globals_plugin-settings",
            data: { states, id: "global" },
          });
        }
      } catch (e) {
        console.warn(`[Plugins] Could not persist state for "${pluginName}":`, e);
      }

      storageRegistry.setPluginEnabled(pluginName, newEnabled);

      return c.json({ name: pluginName, enabled: newEnabled });
    } catch (error: any) {
      console.error("[Plugins] toggle error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Health check (public)
  app.get("/api/health", (c) => {
    return c.json({
      status: "ok",
      version: "0.11.0",
      collections: registry.getCollectionSlugs(),
      timestamp: new Date().toISOString(),
    });
  });

  // CMS Metrics (admin only)
  app.get("/api/metrics", async (c) => {
    try {
      const { user: ctxUser, tenantId: ctxTenantID } = await resolveAuthContext(
        c.req.raw,
        authMw,
        user,
        tenantId,
      );
      if (!ctxUser) return c.json({ error: "Authentication required" }, 401);
      const isAdmin = ctxUser.role === "admin" || ctxUser.role === "super_admin";


      // --- Collection document counts ---
      const collectionSlugs = registry.getCollectionSlugs().filter(
        (s: string) => !["users", "audit_logs", "media", "_globals_access-settings", "_globals_brand-settings"].includes(s) && !s.startsWith("_globals_")
      );
      const allowedSlugs = collectionSlugs.filter(
        (slug: string) => isAdmin || hasPermission(ctxUser as any, `${slug}:read`)
      );

      let totalDocuments = 0;
      const collectionCounts: Record<string, number> = {};

      await Promise.all(
        allowedSlugs.map(async (slug: string) => {
          try {
            const result = await db.find({ collection: slug, where: {}, limit: 1, page: 1, tenantId: ctxTenantID });
            const count = result.totalDocs ?? 0;
            totalDocuments += count;
            collectionCounts[slug] = count;
          } catch {
            // ignore error
          }
        })
      );

      // --- Media count ---
      let totalMedia = 0;
      try {
        const mediaResult = await db.find({ collection: "media", where: {}, limit: 1, page: 1, tenantId: ctxTenantID });
        totalMedia = mediaResult.totalDocs ?? 0;
      } catch {}

      // --- User count ---
      let totalUsers = 0;
      try {
        const usersResult = await db.find({ collection: "users", where: {}, limit: 1, page: 1, tenantId: ctxTenantID });
        totalUsers = usersResult.totalDocs ?? 0;
      } catch {}



      // --- Webhook count ---
      let totalWebhooks = 0;
      try {
        if (webhookService) {
          const webhooks = await webhookService.getWebhooks();
          totalWebhooks = Array.isArray(webhooks) ? webhooks.length : 0;
        }
      } catch {}

      // --- API key count ---
      let totalApiKeys = 0;
      try {
        const apiKeyResult = await db.find({ collection: API_KEY_COLLECTION, where: {}, limit: 1, page: 1, tenantId: ctxTenantID });
        totalApiKeys = apiKeyResult.totalDocs ?? 0;
      } catch {}

      // --- Database size estimate (sum of collection docs) ---
      const totalStoredRecords = totalDocuments + totalMedia + totalUsers;



      return c.json({
        totalDocuments,
        totalMedia: (isAdmin || hasPermission(ctxUser as any, "media:read")) ? totalMedia : undefined,
        totalUsers: (isAdmin || hasPermission(ctxUser as any, "users:read")) ? totalUsers : undefined,
        totalWebhooks: isAdmin ? totalWebhooks : undefined,
        totalApiKeys: isAdmin ? totalApiKeys : undefined,
        totalStoredRecords,
        collectionCounts,
        collections: allowedSlugs.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("[API] Metrics error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  // E-Commerce Analytics (admin only)
  app.get("/api/analytics", async (c) => {
    try {
      const { user: ctxUser, tenantId: ctxTenantID } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser) return c.json({ error: "Authentication required" }, 401);
      const isAdmin = ctxUser.role === "admin" || ctxUser.role === "super_admin";
      if (!isAdmin) return c.json({ error: "Unauthorized" }, 403);

      const result = await db.find({ collection: "orders", where: {}, limit: 1000, page: 1, tenantId: ctxTenantID });
      const orders = result.docs || [];
      
      const storeSettings = await db.findOne({ collection: "_globals_store-settings", where: {}, tenantId: ctxTenantID });
      const currencyCode = storeSettings?.currency?.code || storeSettings?.currency || "USD";
      
      const revenueByDate: Record<string, number> = {};
      const ordersByDate: Record<string, number> = {};
      const ordersByStatus: Record<string, number> = {};

      orders.forEach((order: any) => {
         const rawDate = order.createdAt || order.updatedAt;
         const date = rawDate ? new Date(rawDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
         if (!revenueByDate[date]) revenueByDate[date] = 0;
         if (!ordersByDate[date]) ordersByDate[date] = 0;

         const totalNum = typeof order.total === "number" ? order.total : parseFloat(String(order.total || 0));
         revenueByDate[date] += isNaN(totalNum) ? 0 : totalNum;
         ordersByDate[date] += 1;

         const status = (order.orderStatus as string) || (order.status as string) || "pending";
         ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;
      });

      const chartData = Object.keys(revenueByDate).sort().map(date => ({
         date,
         revenue: Math.round(revenueByDate[date] * 100) / 100,
         orders: ordersByDate[date]
      }));

      const totalRevenue = Math.round(chartData.reduce((sum, item) => sum + item.revenue, 0) * 100) / 100;

      return c.json({
         chartData,
         totalRevenue,
         totalOrders: orders.length,
         ordersByStatus,
         currencyCode: typeof currencyCode === "string" ? currencyCode : "USD"
      });
    } catch (e: any) {
      return c.json({ error: e.message }, 500);
    }
  });

  // Kyro schema — exposes field metadata + JSON Schema for codegen
  app.get("/api/kyro/schema", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser) return c.json({ error: "Authentication required" }, 401);

    const extractFields = (fields: any[]): any[] =>
      fields.map((f: any) => {
        const meta: any = {
          name: f.name,
          type: f.type,
          label: f.label,
          required: f.required ?? false,
          unique: f.unique ?? false,
          indexed: f.indexed ?? false,
          defaultValue: f.defaultValue,
          admin: f.admin ? { ...f.admin } : undefined,
        };
        if (f.minLength !== undefined) meta.minLength = f.minLength;
        if (f.maxLength !== undefined) meta.maxLength = f.maxLength;
        if (f.pattern !== undefined) meta.pattern = f.pattern;
        if (f.variant !== undefined) meta.variant = f.variant;
        if (f.hasMany !== undefined) meta.hasMany = f.hasMany;
        if (f.min !== undefined) meta.min = f.min;
        if (f.max !== undefined) meta.max = f.max;
        if (f.step !== undefined) meta.step = f.step;
        if (f.integer !== undefined) meta.integer = f.integer;
        if (f.options) meta.options = f.options;
        if (f.relationTo) meta.relationTo = f.relationTo;
        if (f.maxDepth !== undefined) meta.maxDepth = f.maxDepth;
        if (f.minRows !== undefined) meta.minRows = f.minRows;
        if (f.maxRows !== undefined) meta.maxRows = f.maxRows;
        if (f.localized !== undefined) meta.localized = f.localized;
        if (f.language) meta.language = f.language;
        if (f.format) meta.format = f.format;
        if (f.allowedTypes) meta.allowedTypes = f.allowedTypes;
        if (f.maxSize) meta.maxSize = f.maxSize;

        if (f.type === "group" || f.type === "row" || f.type === "collapsible" && f.fields) {
          meta.fields = extractFields(f.fields);
        }
        if (f.type === "array" && f.fields) {
          meta.fields = extractFields(f.fields);
        }
        if (f.type === "blocks" && f.blocks) {
          meta.blocks = f.blocks.map((b: any) => ({
            slug: b.slug,
            label: b.label,
            fields: extractFields(b.fields),
          }));
        }
        if (f.type === "tabs" && f.tabs) {
          meta.tabs = f.tabs.map((t: any) => ({
            label: t.label,
            name: t.name,
            fields: extractFields(t.fields),
          }));
        }
        return meta;
      });

    const data: any = { collections: {}, globals: {} };

    for (const col of registry.getCollections()) {
      const slug = col.slug;
      try {
        data.collections[slug] = {
          slug,
          label: col.label || slug,
          fields: extractFields(col.fields),
          jsonSchema: zodToJsonSchema(registry.getZodSchema(slug), { target: "openApi3" }),
          createSchema: zodToJsonSchema(registry.getCreateZodSchema(slug), { target: "openApi3" }),
          updateSchema: zodToJsonSchema(registry.getUpdateZodSchema(slug), { target: "openApi3" }),
          procedures: {
            find: { collection: slug, where: "Record<string,any>", sort: "string", limit: "number", page: "number", depth: "number", select: "string[]", draft: "boolean" },
            findByID: { collection: slug, id: "string", depth: "number", select: "string[]", draft: "boolean" },
            create: { collection: slug, data: "Record<string,any>", depth: "number", select: "string[]" },
            update: { collection: slug, id: "string", data: "Record<string,any>", depth: "number", select: "string[]", baseUpdatedAt: "string" },
            delete: { collection: slug, id: "string" },
            count: { collection: slug, where: "Record<string,any>" },
          },
        };
      } catch { /* skip collections without schemas */ }
    }

    for (const global of registry.getGlobals()) {
      const slug = global.slug;

      let fieldsToExtract = global.fields;
      if (slug === "storage-settings") {
         const storageRegistry = registry.storageProviders;
         const allProviders = storageRegistry.getAll();
         const activeProviders = new Set(
           storageRegistry.getAllAvailable(name => storageRegistry.isPluginEnabled(name)).map(p => p.type)
         );
         activeProviders.add("local");

         const allProviderTypes = new Set(allProviders.map(p => p.type));
         
         fieldsToExtract = fieldsToExtract.filter(f => {
           if (f.type === "group" && f.name && allProviderTypes.has(f.name as string)) {
             return activeProviders.has(f.name as string);
           }
           return true;
         }).map(f => {
           if (f.name === "provider" && f.type === "select") {
             return { ...f, options: (f as any).options.filter((opt: any) => activeProviders.has(opt.value)) };
           }
           return f;
         });
      }

      try {
        data.globals[slug] = {
          slug,
          label: global.label || slug,
          fields: extractFields(fieldsToExtract),
          jsonSchema: zodToJsonSchema(registry.getZodSchema(slug), { target: "openApi3" }),
          procedures: {
            get: {},
            update: { data: "Record<string,any>" },
          },
        };
      } catch { /* skip globals without schemas */ }
    }

    return c.json(data);
  });

  // List collections (authenticated)
  app.get("/api/collections", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser) return c.json({ error: "Authentication required" }, 401);
    const collections = registry.getCollections().map((col) => ({
      slug: col.slug,
      label: col.label || col.slug,
      fields: col.fields
        .filter((f) => f.name)
        .map((f) => ({
          name: f.name,
          type: f.type,
          required: f.required,
          label: f.label,
        })),
    }));
    return c.json(collections);
  });

  function resolveDocField(fields: any[], doc: any, fieldName: string): any {
    if (fieldName in doc) return doc[fieldName];
    for (const field of fields) {
      if (!field.name) continue;
      if (field.type === "tabs" && field.tabs) {
        const data = doc[field.name];
        if (data && typeof data === "object" && fieldName in data) return data[fieldName];
      }
      if ((field.type === "group" || field.type === "collapsible") && field.fields) {
        const data = doc[field.name];
        if (data && typeof data === "object") {
          if (fieldName in data) return data[fieldName];
          const nested = resolveDocField(field.fields, data, fieldName);
          if (nested !== undefined) return nested;
        }
      }
    }
    return undefined;
  }



  // Global search - searches across all collections, media, and system content
  app.get("/api/search", async (c) => {
    try {
      const query = c.req.query("q") || "";
      const collectionsParam = c.req.query("collections") || "";
      const limit = Math.min(parseInt(c.req.query("limit") || "10"), 50);

      if (!query || query.length < 2) {
        return c.json({ results: [], message: "Query too short" });
      }

      const { user: ctxUser, tenantId: ctxTenantID } = await resolveAuthContext(
        c.req.raw,
        authMw,
        user,
        tenantId,
      );

      const targetCollections = collectionsParam
        ? collectionsParam.split(",").filter(Boolean)
        : registry.getCollectionSlugs();

      const results: Array<{
        collection: string;
        label: string;
        id: string;
        title: string;
        doc: any;
      }> = [];

      const regex = new RegExp(
        query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );

      for (const collection of registry.getCollections()) {
        if (!targetCollections.includes(collection.slug)) continue;

        const access = await checkCollectionAccess(
          collection,
          "read",
          c.req.raw,
          ctxUser,
          ctxTenantID,
          undefined,
          enablePublicAccess,
          defaultCollectionAccess,
        );
        if (!access.allowed) continue;

        const searchableFields = collection.fields
          .filter(
            (f) =>
              f.name &&
              f.name !== "id" &&
              (f.type === "text" ||
                f.type === "email" ||
                f.type === "textarea" ||
                f.type === "richtext" ||
                f.indexed) &&
              !f.admin?.hidden,
          )
          .map((f) => f.name!);

        if (searchableFields.length === 0) continue;

        try {
          const orConditions: Record<string, any>[] = searchableFields.map(
            (field) => {
              const condition: Record<string, any> = {};
              condition[field] = { like: `%${query}%` };
              return condition;
            },
          );

          const searchResult = await db.find({
            collection: collection.slug,
            where: { OR: orConditions },
            limit,
            tenantId: ctxTenantID,
          });

          await populateRelationships(searchResult.docs as any[], collection.fields, db as BaseAdapter, registry, 1, 0);

          for (const doc of searchResult.docs as any[]) {
            const titleField =
              collection.admin?.useAsTitle ||
              searchableFields.find(
                (f) =>
                  f === "title" ||
                  f === "name" ||
                  f === "heading" ||
                  f === "slug",
              );
            const title = titleField ? (resolveDocField(collection.fields, doc, titleField) ?? doc.id) : doc.id;

            results.push({
              collection: collection.slug,
              label: collection.label || collection.slug,
              id: doc.id,
              title: String(title || "Untitled"),
              doc,
            });
          }
        } catch (err) {
          console.error(`Search error for ${collection.slug}:`, err);
        }
      }

      results.sort((a, b) => a.label.localeCompare(b.label));

      return c.json({ results });
    } catch (error: any) {
      return c.json({ error: error.message, results: [] }, 500);
    }
  });

  // API Key management — requires users:admin permission
  app.get("/api/keys", async (c) => {
    try {
      const { user: ctxUser, tenantId: ctxTenantID } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser || !hasPermission(ctxUser as any, "users:read")) {
        return c.json({ error: "Forbidden" }, 403);
      }
      const page = parseInt(c.req.query("page") || "1");
      const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
      const result = await db.find({ collection: API_KEY_COLLECTION, where: {}, page, limit, tenantId: ctxTenantID });
      const docs = (result.docs || []).map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        keyPrefix: doc.keyPrefix,
        permissions: doc.permissions || [],
        lastUsed: doc.lastUsedAt,
        createdAt: doc.createdAt,
      }));
      return c.json({ docs, totalDocs: result.totalDocs || docs.length, totalPages: result.totalPages || 1 });
    } catch (error: any) {
      console.error("[ApiKeys] GET error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  app.post("/api/keys", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser || !hasPermission(ctxUser as any, "users:admin")) {
        return c.json({ error: "Forbidden" }, 403);
      }
      const body = await c.req.json();
      if (!body.name || typeof body.name !== "string") {
        return c.json({ error: "name is required" }, 400);
      }
      const rawKey = generateApiKey();
      const doc = await db.create({
        collection: API_KEY_COLLECTION,
        data: {
          userId: ctxUser.id,
          name: body.name,
          key: rawKey,
          keyPrefix: generateApiKeyPrefix(rawKey),
          permissions: Array.isArray(body.permissions) ? body.permissions : ["*"],
          expiresAt: body.expiresAt || null,
          createdAt: new Date().toISOString(),
        },
      });
      await sessionAuthAdapter?.createAuditLog({
        action: "api_key_create",
        userId: ctxUser.id,
        resource: "api_key",
        resourceId: (doc as any).id,
        success: true,
        metadata: { keyName: body.name },
      });
      return c.json({
        ...(doc as any),
        key: rawKey,
        permissions: Array.isArray(body.permissions) ? body.permissions : ["*"],
      }, 201);
    } catch (error: any) {
      console.error("[ApiKeys] POST error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  app.delete("/api/keys/:id", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser || !hasPermission(ctxUser as any, "users:admin")) {
        return c.json({ error: "Forbidden" }, 403);
      }
      const id = c.req.param("id");
      const existing = await db.findByID({ collection: API_KEY_COLLECTION, id });
      if (!existing) return c.json({ error: "API key not found" }, 404);
      await db.delete({ collection: API_KEY_COLLECTION, id });
      await sessionAuthAdapter?.createAuditLog({
        action: "api_key_delete",
        userId: ctxUser.id,
        resource: "api_key",
        resourceId: id,
        success: true,
        metadata: { keyName: (existing as any).name },
      });
      return c.json({ message: "API key deleted" });
    } catch (error: any) {
      console.error("[ApiKeys] DELETE error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  // PATCH /api/keys/:id — update name / permissions / expires
  app.patch("/api/keys/:id", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser || !hasPermission(ctxUser as any, "users:admin")) {
        return c.json({ error: "Forbidden" }, 403);
      }
      const id = c.req.param("id");
      const body = await c.req.json();
      const existing = await db.findByID({ collection: API_KEY_COLLECTION, id });
      if (!existing) return c.json({ error: "API key not found" }, 404);
      const updateData: Record<string, unknown> = {};
      if (typeof body.name === "string" && body.name.trim()) updateData.name = body.name.trim();
      if (Array.isArray(body.permissions)) updateData.permissions = body.permissions;
      if (body.expiresAt !== undefined) updateData.expiresAt = body.expiresAt || null;
      if (Object.keys(updateData).length === 0) return c.json({ error: "Nothing to update" }, 400);
      const updated = await db.update({ collection: API_KEY_COLLECTION, id, data: updateData });
      return c.json({ ...(updated as any), keyPrefix: (existing as any).keyPrefix });
    } catch (error: any) {
      console.error("[ApiKeys] PATCH error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  // POST /api/keys/:id/rotate — regenerate key, keep name/metadata
  app.post("/api/keys/:id/rotate", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser || !hasPermission(ctxUser as any, "users:admin")) {
        return c.json({ error: "Forbidden" }, 403);
      }
      const id = c.req.param("id");
      const existing = await db.findByID({ collection: API_KEY_COLLECTION, id });
      if (!existing) return c.json({ error: "API key not found" }, 404);
      const rawKey = generateApiKey();
      const updated = await db.update({
        collection: API_KEY_COLLECTION,
        id,
        data: {
          key: rawKey,
          keyPrefix: generateApiKeyPrefix(rawKey),
          lastUsedAt: null,
        },
      });
      await sessionAuthAdapter?.createAuditLog({
        action: "api_key_rotate",
        userId: ctxUser.id,
        resource: "api_key",
        resourceId: id,
        success: true,
        metadata: { keyName: (existing as any).name },
      });
      return c.json({
        ...(updated as any),
        key: rawKey,
        permissions: (existing as any).permissions,
        expiresAt: (existing as any).expiresAt,
      });
    } catch (error: any) {
      console.error("[ApiKeys] rotate error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Webhook management — requires users:admin permission
  app.get("/api/webhooks/actions", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser || !hasPermission(ctxUser as any, "users:read")) {
        return c.json({ error: "Forbidden" }, 403);
      }

      const actions = {
        generic: {
          label: "Custom URL",
          description: "POST to any endpoint with Kyro payload",
          configFields: [],
          envVars: [],
        },
        "github-push": {
          label: "GitHub Push",
          description: "Push an empty commit to simulate a push event",
          configFields: [
            { name: "githubOwner", label: "Owner", required: true, placeholder: "e.g., kyro-dev" },
            { name: "githubRepo", label: "Repository", required: true, placeholder: "e.g., my-website" },
            { name: "githubBranch", label: "Branch", required: false, placeholder: "main" },
          ],
          envVars: ["GITHUB_TOKEN"],
        },
      };

      return c.json({ actions });
    } catch (error: any) {
      console.error("[Webhooks] actions error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  app.get("/api/webhooks", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser || !hasPermission(ctxUser as any, "users:read")) {
        return c.json({ error: "Forbidden" }, 403);
      }
      if (!webhookService) return c.json({ error: "Webhook service not available" }, 503);
      
      const webhooks = await webhookService.getWebhooks();
      return c.json({ docs: webhooks });
    } catch (error: any) {
      console.error("[Webhooks] GET error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  app.post("/api/webhooks", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser || !hasPermission(ctxUser as any, "users:admin")) {
        return c.json({ error: "Forbidden" }, 403);
      }
      if (!webhookService) return c.json({ error: "Webhook service not available" }, 503);

      const body = await c.req.json();
      const webhook = await webhookService.createWebhook(body);
      
      await sessionAuthAdapter?.createAuditLog({
        action: "webhook_create",
        userId: ctxUser.id,
        resource: "webhook",
        resourceId: webhook.id,
        success: true,
        metadata: { name: webhook.name, url: webhook.url },
      });
      
      return c.json(webhook, 201);
    } catch (error: any) {
      console.error("[Webhooks] POST error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  app.get("/api/webhooks/:id", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser || !hasPermission(ctxUser as any, "users:read")) {
        return c.json({ error: "Forbidden" }, 403);
      }
      if (!webhookService) return c.json({ error: "Webhook service not available" }, 503);

      const id = c.req.param("id");
      const webhook = await webhookService.getWebhookById(id);
      if (!webhook) return c.json({ error: "Webhook not found" }, 404);
      
      return c.json(webhook);
    } catch (error: any) {
      console.error("[Webhooks] GET :id error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  app.patch("/api/webhooks/:id", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser || !hasPermission(ctxUser as any, "users:admin")) {
        return c.json({ error: "Forbidden" }, 403);
      }
      if (!webhookService) return c.json({ error: "Webhook service not available" }, 503);

      const id = c.req.param("id");
      const body = await c.req.json();
      const updated = await webhookService.updateWebhook(id, body);
      if (!updated) return c.json({ error: "Webhook not found" }, 404);
      
      await sessionAuthAdapter?.createAuditLog({
        action: "webhook_update",
        userId: ctxUser.id,
        resource: "webhook",
        resourceId: id,
        success: true,
        metadata: { name: updated.name },
      });
      
      return c.json(updated);
    } catch (error: any) {
      console.error("[Webhooks] PATCH error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  app.delete("/api/webhooks/:id", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser || !hasPermission(ctxUser as any, "users:admin")) {
        return c.json({ error: "Forbidden" }, 403);
      }
      if (!webhookService) return c.json({ error: "Webhook service not available" }, 503);

      const id = c.req.param("id");
      const existing = await webhookService.getWebhookById(id);
      if (!existing) return c.json({ error: "Webhook not found" }, 404);
      
      await webhookService.deleteWebhook(id);
      
      await sessionAuthAdapter?.createAuditLog({
        action: "webhook_delete",
        userId: ctxUser.id,
        resource: "webhook",
        resourceId: id,
        success: true,
        metadata: { name: existing.name },
      });
      
      return c.json({ message: "Webhook deleted" });
    } catch (error: any) {
      console.error("[Webhooks] DELETE error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  app.post("/api/webhooks/:id/test", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser || !hasPermission(ctxUser as any, "users:admin")) {
        return c.json({ error: "Forbidden" }, 403);
      }
      if (!webhookService) return c.json({ error: "Webhook service not available" }, 503);

      const id = c.req.param("id");
      const result = await webhookService.testWebhook(id);
      if (!result) return c.json({ error: "Webhook not found" }, 404);
      
      return c.json(result);
    } catch (error: any) {
      console.error("[Webhooks] test error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  app.get("/api/webhooks/:id/history", async (c) => {
    try {
      const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      if (!ctxUser || !hasPermission(ctxUser as any, "users:read")) {
        return c.json({ error: "Forbidden" }, 403);
      }
      if (!webhookService) return c.json({ error: "Webhook service not available" }, 503);

      const id = c.req.param("id");
      const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
      const history = await webhookService.getDeliveryHistory(id, limit);
      
      return c.json({ docs: history });
    } catch (error: any) {
      console.error("[Webhooks] history error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  // ============================================================================
  // Schema introspection endpoint — for remote codegen
  // ============================================================================

  function serializeField(field: any): any {
    const safe: any = {};
    const keys = ["name", "type", "required", "hasMany", "relationTo", "options",
      "min", "max", "minLength", "maxLength", "defaultValue", "label", "localized",
      "admin", "unique", "index", "hidden", "readOnly", "deprecated"];
    for (const k of keys) {
      if (k in field) safe[k] = field[k];
    }
    if (field.fields) {
      safe.fields = field.fields.map(serializeField);
    }
    if (field.tabs) {
      safe.tabs = field.tabs.map((t: any) => ({
        label: t.label,
        name: t.name,
        fields: t.fields.map(serializeField),
      }));
    }
    return safe;
  }

  app.get("/api/__schema", async (c) => {
    try {
      const { user: ctxUser, apiKeyContext } = await resolveAuthContext(
        c.req.raw, authMw, user, tenantId,
      );
      if (!ctxUser && !apiKeyContext) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      const cols = registry.getCollections().filter(
        (col) => col.slug !== "users" && col.slug !== "audit_logs",
      );
      const serialized = cols.map((col) => ({
        slug: col.slug,
        label: col.label,
        labelPlural: col.labelPlural,
        singularLabel: col.singularLabel,
        timestamps: col.timestamps,
        auth: !!col.auth,
        tenantScoped: !!col.tenantScoped,
        upload: col.upload ? { staticDir: col.upload.staticDir, imageSizes: col.upload.imageSizes, mimeTypes: col.upload.mimeTypes } : undefined,
        fields: col.fields.map(serializeField),
      }));
      return c.json(serialized);
    } catch (error: any) {
      console.error("[Schema] error:", error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Dynamic collection routes
  const collections = registry.getCollections();

  for (const collection of collections) {
    const slug = collection.slug;

    if (slug === "users" || slug === "audit_logs") continue;

    const basePath = `/api/${slug}`;

    // POST /api/:collection/dynamic-options/:fieldName
    app.post(`${basePath}/dynamic-options/:fieldName`, async (c) => {
      try {
        const { user: ctxUser, tenantId: ctxTenantID, apiKeyContext } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
        const access = await checkCollectionAccess(collection, "read", c.req.raw, ctxUser, ctxTenantID, apiKeyContext, enablePublicAccess, defaultCollectionAccess);
        if (!access.allowed) {
          return c.json({ error: access.error }, (access.status || 403) as any);
        }

        const fieldName = c.req.param("fieldName");
        const body = await c.req.json();
        const { data, siblingData } = body;

        const field = findFieldByName(collection.fields, fieldName);
        if (!field) return c.json({ error: "Field not found" }, 404);
        if (field.type !== "select") return c.json({ error: "Field is not a select field" }, 400);

        let options: any = [];
        if (typeof field.options === "function") {
          options = await field.options({ data: data || {}, siblingData: siblingData || {} });
        } else if (Array.isArray(field.options)) {
          options = field.options;
        }

        return c.json({ options });
      } catch (error: any) {
        return c.json({ error: error.message }, 500);
      }
    });

    // GET /api/:collection - List
    app.get(basePath, async (c) => {
      try {
        const {
          user: ctxUser,
          tenantId: ctxTenantID,
          apiKeyContext,
        } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);

        const access = await checkCollectionAccess(
          collection,
          "read",
          c.req.raw,
          ctxUser,
          ctxTenantID,
          apiKeyContext,
          enablePublicAccess,
          defaultCollectionAccess,
        );
        if (!access.allowed) {
          return c.json({ error: access.error }, (access.status || 403) as any);
        }

        if (ctxTenantID) {
          db.setTenantContext({ tenantId: ctxTenantID, userId: ctxUser?.id ?? '', role: ctxUser?.role, isSuperAdmin: ctxUser?.role === 'super_admin' });
        }

        const url = new URL(c.req.url);
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 100);
        const sort = url.searchParams.get("sort") || undefined;
        const depth = parseInt(url.searchParams.get("depth") || "0");
        const select = url.searchParams.get("select")?.split(",") || undefined;
        const draftParam = url.searchParams.get("draft");
        const isDraftRequest = draftParam === "true" ? true : draftParam === "false" ? false : !!ctxUser;
        let where: Record<string, any> = {};
        const whereRaw = url.searchParams.get("where");
        if (whereRaw) {
          try {
            where = JSON.parse(whereRaw);
          } catch {
            return c.json({ error: "Invalid JSON in where parameter" }, 400);
          }
        }

        const result = await db.find({
          collection: slug,
          where,
          sort,
          limit,
          page,
          depth,
          tenantId: ctxTenantID,
          select,
          draft: isDraftRequest,
        });

        await populateRelationships(result.docs as any[], collection.fields, db as BaseAdapter, registry, 1, depth);

        return c.json(sanitizeDoc(result));
      } catch (error: any) {
        console.error("[API] list error:", error);
        return c.json({ error: error.message }, 500);
      }
    });

    // GET /api/:collection/:id/versions - List/compare versions
    app.get(`${basePath}/:id/versions`, async (c) => {
      try {
        const {
          user: ctxUser,
          tenantId: ctxTenantID,
          apiKeyContext,
        } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);

        const access = await checkCollectionAccess(
          collection,
          "read",
          c.req.raw,
          ctxUser,
          ctxTenantID,
          apiKeyContext,
          enablePublicAccess,
          defaultCollectionAccess,
        );
        if (!access.allowed) {
          return c.json({ error: access.error }, (access.status || 403) as any);
        }

        const id = c.req.param("id");
        if (!id) {
          return c.json({ error: "Missing document ID" }, 400);
        }
        const url = new URL(c.req.url);
        const compareA = url.searchParams.get("compareA");
        const compareB = url.searchParams.get("compareB");

        auditApiKeyUsage(sessionAuthAdapter, apiKeyContext, `${basePath}/${id}/versions`, "GET", c.req.raw);

        // Compare two versions
        if (compareA && compareB) {
          const [versionA, versionB] = await Promise.all([
            db.findVersionByID({ collection: slug, versionId: compareA, tenantId: ctxTenantID }),
            db.findVersionByID({ collection: slug, versionId: compareB, tenantId: ctxTenantID }),
          ]);
          if (!versionA || !versionB) {
            return c.json({ error: "Version not found" }, 404);
          }
          const diffs = computeDiff(versionA.data, versionB.data);
          return c.json({ diffs });
        }

        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 100);

        const result = await db.findVersions({
          collection: slug,
          documentId: id,
          page,
          limit,
          tenantId: ctxTenantID,
        });

        return c.json(result);
      } catch (error: any) {
        console.error("[API] versions error:", error);
        return c.json({ error: error.message }, 500);
      }
    });

    app.put(`${basePath}/:id/draft`, async (c) => {
      try {
        const {
          user: ctxUser,
          tenantId: ctxTenantID,
          apiKeyContext,
        } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);

        const access = await checkCollectionAccess(
          collection,
          "update",
          c.req.raw,
          ctxUser,
          ctxTenantID,
          apiKeyContext,
          enablePublicAccess,
          defaultCollectionAccess,
        );
        if (!access.allowed) {
          return c.json({ error: access.error }, (access.status || 403) as any);
        }

        const id = c.req.param("id");
        const body = await c.req.json();
        const baseUpdatedAt = readBaseUpdatedAt(body);

        const originalDoc = await db.findByID<Record<string, any>>({
          collection: slug,
          id,
          tenantId: ctxTenantID,
          draft: true,
        });

        if (!originalDoc) {
          return c.json({ error: "Document not found" }, 404);
        }

        let finalData;
        if (body.delta) {
          finalData = { ...originalDoc, ...body.delta };
        } else {
          finalData = body.data ?? omitRevisionFields(body);
        }

        const version = await db.updateLatestVersion({
          collection: slug,
          documentId: id,
          data: finalData,
          status: 'draft',
          tenantId: ctxTenantID,
        });

        if (ctxUser) {
          sessionAuthAdapter?.createAuditLog({
            action: "document_update",
            userId: ctxUser.id,
            resource: slug,
            resourceId: id,
            success: true,
            metadata: { type: "draft_save" }
          });
        }
        return c.json({ data: version, message: "Draft saved successfully" });
      } catch (error: any) {
        return c.json({ error: error.message }, 500);
      }
    });

    app.delete(`${basePath}/:id/draft`, async (c) => {
      try {
        const {
          user: ctxUser,
          tenantId: ctxTenantID,
          apiKeyContext,
        } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);

        const access = await checkCollectionAccess(
          collection,
          "update",
          c.req.raw,
          ctxUser,
          ctxTenantID,
          apiKeyContext,
          enablePublicAccess,
          defaultCollectionAccess,
        );
        if (!access.allowed) {
          return c.json({ error: access.error }, (access.status || 403) as any);
        }

        if (ctxUser) {
          sessionAuthAdapter?.createAuditLog({
            action: "document_update",
            userId: ctxUser.id,
            resource: slug,
            resourceId: c.req.param("id"),
            success: true,
            metadata: { type: "draft_discard" }
          });
        }
        return c.json({ message: "Draft discarded successfully" });
      } catch (error: any) {
        return c.json({ error: error.message }, 500);
      }
    });

    function computeDiff(a: Record<string, any>, b: Record<string, any>): { field: string; oldValue: any; newValue: any }[] {
      const diffs: { field: string; oldValue: any; newValue: any }[] = [];
      const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const key of allKeys) {
        if (key === "id" || key === "createdAt" || key === "updatedAt") continue;
        if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
          diffs.push({ field: key, oldValue: key in a ? a[key] : undefined, newValue: key in b ? b[key] : undefined });
        }
      }
      return diffs;
    }

    // GET /api/:collection/:id - Find by ID
    app.get(`${basePath}/:id`, async (c) => {
      try {
        const {
          user: ctxUser,
          tenantId: ctxTenantID,
          apiKeyContext,
        } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);

        const url = new URL(c.req.url);
        const draftParam = url.searchParams.get("draft");
        const kyroToken = url.searchParams.get("kyroToken");

        let previewAllowed = false;
        if (draftParam === "true" && kyroToken && authSecret) {
          try {
            const decoded = await verify(kyroToken, authSecret, "HS256");
            if (decoded && decoded.type === "preview" && decoded.collection === collection.slug) {
              previewAllowed = true;
            }
          } catch (e) {
            console.warn("Invalid preview token", e);
          }
        }

        if (!previewAllowed) {
          const access = await checkCollectionAccess(
            collection,
            "read",
            c.req.raw,
            ctxUser,
            ctxTenantID,
            apiKeyContext,
            enablePublicAccess,
            defaultCollectionAccess,
          );
          if (!access.allowed) {
            return c.json({ error: access.error }, (access.status || 403) as any);
          }
        }

        const id = c.req.param("id");
        const depth = parseInt(url.searchParams.get("depth") || "0");
        const select = url.searchParams.get("select")?.split(",") || undefined;
        // Admin always sees the current doc state regardless of publish status
        const isDraftRequest = draftParam === "true" ? true : draftParam === "false" ? false : !!ctxUser;

        let doc = await db.findByID({
          collection: slug,
          id,
          depth,
          tenantId: ctxTenantID,
          select,
          draft: isDraftRequest,
        });

        // Fallback to slug lookup if ID lookup fails and collection has a slug field
        if (!doc && collection.fields.some((f: any) => f.name === "slug")) {
          doc = await db.findOne({
            collection: slug,
            where: { slug: id },
            tenantId: ctxTenantID,
            draft: isDraftRequest,
          });
        }

        if (!doc) {
          return c.json({ error: "Document not found" }, 404);
        }

        await populateRelationships([doc as any], collection.fields, db as BaseAdapter, registry, 1, depth);

        return c.json({ data: sanitizeDoc(doc) });
      } catch (error: any) {
        return c.json({ error: error.message }, 500);
      }
    });
    // POST /api/:collection/preview-url - Evaluate preview URL
    app.post(`${basePath}/preview-url`, async (c) => {
      try {
        const { user: ctxUser, tenantId: ctxTenantID } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
        
        // Basic check: must have read access at least to preview
        const access = await checkCollectionAccess(collection, "read", c.req.raw, ctxUser, ctxTenantID);
        if (!access.allowed) {
          return c.json({ error: access.error || "Forbidden" }, (access.status || 403) as any);
        }

        const body = await c.req.json().catch(() => ({}));
        
        // 1. Generate short-lived JWT token
        let token = "";
        if (authSecret) {
          token = await sign({
            type: "preview",
            collection: collection.slug,
            id: body.id,
            exp: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour expiration
          }, authSecret, "HS256");
        }

        // 2. Compute URL
        let finalUrl = "";
        if (collection.admin?.preview) {
          finalUrl = await collection.admin.preview(body, { req: c.req.raw, token });
          try {
            const u = new URL(finalUrl, "http://localhost");
            if (!u.searchParams.has("preview")) u.searchParams.set("preview", "true");
            if (!u.searchParams.has("kyroToken") && token) u.searchParams.set("kyroToken", token);
            finalUrl = finalUrl.startsWith("http") ? u.toString() : `${u.pathname}${u.search}`;
          } catch(e) {}
        } else {
          // Fallback to site settings
          let siteUrl = "";
          try {
            const settings = await db.findOne({ collection: "_globals_site-settings", where: {} });
            if (settings?.siteUrl) siteUrl = settings.siteUrl;
          } catch(e) {}

          if (!siteUrl) {
            // Can't preview without a site URL
            return c.json({ error: "No site URL configured in settings, and no custom preview function defined for this collection." }, 400);
          }
          
          // Remove trailing slash
          siteUrl = siteUrl.replace(/\/$/, "");
          // Use the collection slug as the route prefix (e.g. /posts/my-slug)
          const docSlug = body.slug || body.id || "";
          finalUrl = `${siteUrl}/${collection.slug}/${docSlug}?preview=true&kyroToken=${token}`;
        }

        return c.json({ url: finalUrl });
      } catch (error: any) {
        return c.json({ error: error.message }, 500);
      }
    });

    // POST /api/:collection - Create
    app.post(basePath, async (c) => {
      try {
        const {
          user: ctxUser,
          tenantId: ctxTenantID,
          apiKeyContext,
        } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);

        const access = await checkCollectionAccess(
          collection,
          "create",
          c.req.raw,
          ctxUser,
          ctxTenantID,
          apiKeyContext,
          enablePublicAccess,
          defaultCollectionAccess,
        );
        if (!access.allowed) {
          return c.json({ error: access.error }, (access.status || 403) as any);
        }

        if (ctxTenantID) {
          db.setTenantContext({ tenantId: ctxTenantID, userId: ctxUser?.id ?? '', role: ctxUser?.role, isSuperAdmin: ctxUser?.role === 'super_admin' });
        }

        auditApiKeyUsage(sessionAuthAdapter, apiKeyContext, basePath, "POST", c.req.raw);

        const body = await c.req.json();
        let validated = body;

        // Convert empty strings to null for non-textual field types (recursive)
        normalizeEmptyStrings(validated, collection.fields);

        // Convert legacy string values to richtext format; unwrap TipTap doc objects
        convertRichtextFields(collection.fields, validated);

        const hookReq = c.req.raw as unknown as KyroRequest;

        if (collection.hooks?.beforeValidate) {
          for (const hook of collection.hooks.beforeValidate) {
            const hookResult = await hook({
              collection: slug,
              data: validated,
              req: hookReq,
              user: ctxUser,
              tenantId: ctxTenantID,
              operation: "create",
            });
            if (hookResult && typeof hookResult === "object" && !Array.isArray(hookResult)) Object.assign(validated, hookResult);
          }
        }

        const schema = registry.getCreateZodSchema(slug);
        try {
          validated = schema.parse(validated);
        } catch (zodErr: any) {
          return c.json({ error: `Validation failed: ${formatZodErrors(zodErr.errors)}`, details: zodErr.errors }, 400);
        }

        if (collection.tenantScoped && ctxTenantID) {
          validated.tenantId = ctxTenantID;
        }

        const isDraftEnabled = collection.versions?.drafts === true;
        const statusField = collection.fields.find((f: any) => f.name === 'status');
        const hasPublished = statusField?.type === 'select' && Array.isArray(statusField.options) && statusField.options.some((o: any) => o.value === 'published');
        
        if (isDraftEnabled) {
          validated.status = 'draft';
        } else if (hasPublished && !validated.status) {
          validated.status = 'published';
        }

        if (collection.hooks?.beforeChange) {
          for (const hook of collection.hooks.beforeChange) {
            const hookResult = await hook({
              collection: slug,
              data: validated,
              req: hookReq,
              user: ctxUser,
              tenantId: ctxTenantID,
              operation: "create",
            });
            if (hookResult && typeof hookResult === "object" && !Array.isArray(hookResult)) Object.assign(validated, hookResult);
          }
        }

        const doc = await db.create({
          collection: slug,
          data: validated,
          tenantId: ctxTenantID,
        });

        // Create initial version if drafts enabled
        if (isDraftEnabled) {
          await db.createVersion({
            collection: slug,
            documentId: (doc as any).id,
            data: validated,
            status: 'draft',
            createdBy: ctxUser?.id,
            changeDescription: 'Created',
            tenantId: ctxTenantID,
          });
        }

        if (collection.hooks?.afterChange) {
          for (const hook of collection.hooks.afterChange) {
            await hook({
              collection: slug,
              doc,
              data: validated,
              req: hookReq,
              user: ctxUser,
              tenantId: ctxTenantID,
              operation: "create",
            });
          }
        }

        if (webhookService) {
          webhookService
            .trigger(getWebhookEvent(slug, "create"), {
              collection: slug,
              operation: "create",
              data: doc,
              user: ctxUser
                ? { id: ctxUser.id, email: ctxUser.email, role: ctxUser.role }
                : undefined,
              tenantId: ctxTenantID,
            })
            .catch((err) => console.error(`[Webhook] Failed to trigger:`, err));
        }

        if (ctxUser) {
          sessionAuthAdapter?.createAuditLog({
            action: "document_create",
            userId: ctxUser.id,
            resource: slug,
            resourceId: (doc as any).id,
            success: true,
          });
        }
        return c.json({ data: doc, message: "Created successfully" }, 201);
      } catch (error: any) {
        if (error.name === "ZodError") {
          return c.json(
            { error: `Validation failed: ${formatZodErrors(error.errors)}`, details: error.errors },
            400,
          );
        }
        return c.json({ error: error.message }, 500);
      }
    });

    // PATCH /api/:collection/:id - Update
    app.patch(`${basePath}/:id`, async (c) => {
      try {
        const {
          user: ctxUser,
          tenantId: ctxTenantID,
          apiKeyContext,
        } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);

        const access = await checkCollectionAccess(
          collection,
          "update",
          c.req.raw,
          ctxUser,
          ctxTenantID,
          apiKeyContext,
          enablePublicAccess,
          defaultCollectionAccess,
        );
        if (!access.allowed) {
          return c.json({ error: access.error }, (access.status || 403) as any);
        }

        const id = c.req.param("id");
        const body = await c.req.json();
        const baseUpdatedAt = readBaseUpdatedAt(body);


        const originalDoc = await db.findByID<Record<string, any>>({
          collection: slug,
          id,
          tenantId: ctxTenantID,
          draft: true,
        });

        if (!originalDoc) {
          return c.json({ error: "Document not found" }, 404);
        }

        if (baseUpdatedAt && originalDoc.updatedAt && baseUpdatedAt !== originalDoc.updatedAt) {
          return c.json(buildConflictResponse(baseUpdatedAt, originalDoc), 409);
        }

        let validated = Object.fromEntries(
          Object.entries(omitRevisionFields(body)).filter(
            ([_, v]) => v !== "null" && v !== undefined,
          ),
        );

        // Convert empty strings to null for non-textual field types (recursive)
        normalizeEmptyStrings(validated, collection.fields);

        // Convert legacy string values to richtext format; unwrap TipTap doc objects
        convertRichtextFields(collection.fields, validated);

        const hookReq = c.req.raw as unknown as KyroRequest;

        if (collection.hooks?.beforeValidate) {
          for (const hook of collection.hooks.beforeValidate) {
            const hookResult = await hook({
              collection: slug,
              data: validated,
              originalDoc,
              req: hookReq,
              user: ctxUser,
              tenantId: ctxTenantID,
              operation: "update",
            });
            if (hookResult && typeof hookResult === "object" && !Array.isArray(hookResult)) Object.assign(validated, hookResult);
          }
        }

        const schema = registry.getUpdateZodSchema(slug);
        validated = schema.parse(validated);

        if (collection.hooks?.beforeChange) {
          for (const hook of collection.hooks.beforeChange) {
            const hookResult = await hook({
              collection: slug,
              data: validated,
              originalDoc,
              req: hookReq,
              user: ctxUser,
              tenantId: ctxTenantID,
              operation: "update",
            });
            if (hookResult && typeof hookResult === "object" && !Array.isArray(hookResult)) Object.assign(validated, hookResult);
          }
        }

        const isDraft = c.req.header("X-Draft") === "true";
        const isDraftEnabled = collection.versions?.drafts === true;
        const isAutosave = c.req.query("autosave") === "true";

        let doc;
        if (isDraftEnabled && isDraft) {
          // Draft save: versions table only, don't touch main doc
          // Autosave reuses a single version slot; manual draft creates a new version
          await db.createVersion({
            collection: slug,
            documentId: id,
            data: validated,
            status: 'draft',
            autosave: isAutosave,
            createdBy: ctxUser?.id,
            changeDescription: isAutosave ? 'Autosave' : 'Draft saved',
            tenantId: ctxTenantID,
          });
        } else if (isDraftEnabled) {
          // Publish: main doc + versions table
          await db.update({
            collection: slug,
            id,
            data: { ...validated, status: 'published' },
            tenantId: ctxTenantID,
          });
          await db.createVersion({
            collection: slug,
            documentId: id,
            data: validated,
            status: 'published',
            createdBy: ctxUser?.id,
            changeDescription: 'Published',
            tenantId: ctxTenantID,
          });
        } else {
          // No versions: direct update
          await db.update({
            collection: slug,
            id,
            data: validated,
            tenantId: ctxTenantID,
          });
        }

        // Refetch with draft: true to ensure we return the latest merged data
        doc = await db.findByID({
          collection: slug,
          id,
          tenantId: ctxTenantID,
          draft: true,
        });

        if (collection.hooks?.afterChange) {
          for (const hook of collection.hooks.afterChange) {
            await hook({
              collection: slug,
              doc,
              data: validated,
              originalDoc,
              req: hookReq,
              user: ctxUser,
              tenantId: ctxTenantID,
              operation: "update",
            });
          }
        }

        if (webhookService && !isAutosave) {
          webhookService
            .trigger(getWebhookEvent(slug, "update"), {
              collection: slug,
              operation: "update",
              data: doc,
              previousData: originalDoc,
              user: ctxUser
                ? { id: ctxUser.id, email: ctxUser.email, role: ctxUser.role }
                : undefined,
              tenantId: ctxTenantID,
            })
            .catch((err) => console.error(`[Webhook] Failed to trigger:`, err));
        }

        auditApiKeyUsage(sessionAuthAdapter, apiKeyContext, `${basePath}/${id}`, "PATCH", c.req.raw);

        if (ctxUser) {
          sessionAuthAdapter?.createAuditLog({
            action: "document_update",
            userId: ctxUser.id,
            resource: slug,
            resourceId: id,
            success: true,
          });
        }
        return c.json({ data: doc, message: isDraftEnabled ? "Draft saved" : "Updated successfully" });
      } catch (error: any) {
        if (error.name === "ZodError") {
          console.error(`[PATCH ${basePath}/:id] Validation failed:`, error.errors);
          return c.json(
            { error: `Validation failed: ${formatZodErrors(error.errors)}`, details: error.errors },
            400,
          );
        }
        console.error(`[PATCH ${basePath}/:id] ERROR:`, error.message, `CAUSE:`, error.cause?.message || error.cause, `QUERY:`, error.query);
        return c.json({ error: error.message }, 500);
      }
    });

// DELETE /api/:collection/:id - Delete
app.delete(`${basePath}/:id`, async (c) => {
  try {
    const {
      user: ctxUser,
      tenantId: ctxTenantID,
      apiKeyContext,
    } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);

    const access = await checkCollectionAccess(
      collection,
      "delete",
      c.req.raw,
      ctxUser,
      ctxTenantID,
      apiKeyContext,
      enablePublicAccess,
      defaultCollectionAccess,
    );
    if (!access.allowed) {
      return c.json({ error: access.error }, (access.status || 403) as any);
    }

    if (ctxTenantID) {
      db.setTenantContext({ tenantId: ctxTenantID, userId: ctxUser?.id ?? '', role: ctxUser?.role, isSuperAdmin: ctxUser?.role === 'super_admin' });
    }

    const id = c.req.param("id");


    const hookReq = c.req.raw as unknown as KyroRequest;

    const originalDoc = await db.findByID({
      collection: slug,
      id,
      tenantId: ctxTenantID,
      draft: true,
    });

    if (!originalDoc) {
      return c.json({ error: "Document not found" }, 404);
    }

    if (collection.hooks?.beforeDelete) {
      for (const hook of collection.hooks.beforeDelete) {
        await hook({
          collection: slug,
          doc: originalDoc,
          req: hookReq,
          user: ctxUser,
          tenantId: ctxTenantID,
          operation: "delete",
        });
      }
    }

    const doc = await db.delete({
      collection: slug,
      id,
      tenantId: ctxTenantID,
    });

    if (collection.hooks?.afterDelete) {
      for (const hook of collection.hooks.afterDelete) {
        await hook({
          collection: slug,
          doc,
          originalDoc,
          req: hookReq,
          user: ctxUser,
          tenantId: ctxTenantID,
          operation: "delete",
        });
      }
    }

    if (webhookService) {
      webhookService
        .trigger(getWebhookEvent(slug, "delete"), {
          collection: slug,
          operation: "delete",
          data: doc,
          previousData: originalDoc,
          user: ctxUser
            ? { id: ctxUser.id, email: ctxUser.email, role: ctxUser.role }
            : undefined,
          tenantId: ctxTenantID,
        })
        .catch((err) => console.error(`[Webhook] Failed to trigger:`, err));
    }

    auditApiKeyUsage(sessionAuthAdapter, apiKeyContext, `${basePath}/${id}`, "DELETE", c.req.raw);

    if (ctxUser) {
      sessionAuthAdapter?.createAuditLog({
        action: "document_delete",
        userId: ctxUser.id,
        resource: slug,
        resourceId: id,
        success: true,
      });
    }
    return c.json({ data: doc, message: "Deleted successfully" });
  } catch (error: any) {
    console.error(`[DELETE] Error deleting ${slug}:`, error);
    return c.json({ error: error.message || String(error) }, 500);
  }
});

// POST /api/:collection/:id/duplicate - Duplicate document
app.post(`${basePath}/:id/duplicate`, async (c) => {
  try {


    const {
      user: ctxUser,
      tenantId: ctxTenantID,
      apiKeyContext,
    } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);

    const access = await checkCollectionAccess(
      collection,
      "create",
      c.req.raw,
      ctxUser,
      ctxTenantID,
      apiKeyContext,
      enablePublicAccess,
      defaultCollectionAccess,
    );
    if (!access.allowed) {

      return c.json({ error: access.error }, (access.status || 403) as any);
    }

    const id = c.req.param("id");


    // Get the original document
    const originalDoc = await db.findByID<any>({
      collection: slug,
      id,
      tenantId: ctxTenantID,
      draft: true,
    });

    if (!originalDoc) {

      return c.json({ error: "Document not found" }, 404);
    }


    // Create a copy with new ID and modified slug
    const { id: _oldId, createdAt: _oldCreated, updatedAt: _oldUpdated, ...docData } = originalDoc as any;

    clearUniqueFields(collection.fields, docData);

    const timestamp = Date.now().toString(36);
    if ('slug' in docData && typeof docData.slug === 'string') {
      docData.slug = `${docData.slug || "document"}-copy-${timestamp}`;
    }
    if ('title' in docData && typeof docData.title === 'string') {
      docData.title = `${docData.title || "Copy"} (Copy)`;
    } else if ('name' in docData && typeof docData.name === 'string') {
      docData.name = `${docData.name || "Copy"} (Copy)`;
    }

    // Create the duplicate
    const newDoc = await db.create({
      collection: slug,
      data: {
        ...docData,
        status: "draft",
      },
      tenantId: ctxTenantID,
    });


    return c.json({ data: newDoc, message: "Document duplicated successfully" });
  } catch (error: any) {
    console.error("[Duplicate] Error:", error);
    return c.json({ error: error.message || String(error) }, 500);
  }
});

// POST /api/:collection/:id/versions/:versionId/restore - Restore version (RESTful)
app.post(`${basePath}/:id/versions/:versionId/restore`, async (c) => {
  try {
    const {
      user: ctxUser,
      tenantId: ctxTenantID,
      apiKeyContext,
    } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);

    const access = await checkCollectionAccess(
      collection,
      "update",
      c.req.raw,
      ctxUser,
      ctxTenantID,
      apiKeyContext,
      enablePublicAccess,
      defaultCollectionAccess,
    );
    if (!access.allowed) {
      return c.json({ error: access.error }, (access.status || 403) as any);
    }

    const id = c.req.param("id");
    const versionId = c.req.param("versionId");

    const version = await db.findVersionByID({
      collection: slug,
      versionId,
      tenantId: ctxTenantID,
    });

    if (!version) {
      return c.json({ error: "Version not found" }, 404);
    }

    const doc = await db.update({
      collection: slug,
      id,
      data: { ...version.data, status: 'draft' },
      tenantId: ctxTenantID,
    });

    return c.json({
      data: doc,
      message: "Version restored successfully",
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/:collection/:id/versions - Restore version (Legacy)
app.post(`${basePath}/:id/versions`, async (c) => {
  try {
    const {
      user: ctxUser,
      tenantId: ctxTenantID,
      apiKeyContext,
    } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);

    const access = await checkCollectionAccess(
      collection,
      "update",
      c.req.raw,
      ctxUser,
      ctxTenantID,
      apiKeyContext,
      enablePublicAccess,
      defaultCollectionAccess,
    );
    if (!access.allowed) {
      return c.json({ error: access.error }, (access.status || 403) as any);
    }

    const body = await c.req.json();
    const { versionId, action } = body;

    if (action === "restore" && versionId) {
      const version = await db.findVersionByID({
        collection: slug,
        versionId,
        tenantId: ctxTenantID,
      });

      if (!version) {
        return c.json({ error: "Version not found" }, 404);
      }

      const doc = await db.update({
        collection: slug,
        id: c.req.param("id"),
        data: { ...version.data, status: 'draft' },
        tenantId: ctxTenantID,
      });

      return c.json({
        data: doc,
        message: "Version restored successfully",
      });
    }

    return c.json({ error: "Invalid action" }, 400);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/:collection/:id/publish - Publish document
app.post(`${basePath}/:id/publish`, async (c) => {
  try {
    const {
      user: ctxUser,
      tenantId: ctxTenantID,
      apiKeyContext,
    } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);

    const access = await checkCollectionAccess(
      collection,
      "update",
      c.req.raw,
      ctxUser,
      ctxTenantID,
      apiKeyContext,
      enablePublicAccess,
      defaultCollectionAccess,
    );
    if (!access.allowed) {
      return c.json({ error: access.error }, (access.status || 403) as any);
    }

    if (ctxTenantID) {
      db.setTenantContext({ tenantId: ctxTenantID, userId: ctxUser?.id ?? '', role: ctxUser?.role, isSuperAdmin: ctxUser?.role === 'super_admin' });
    }

    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const baseUpdatedAt = readBaseUpdatedAt(body);

    // Fetch the current doc regardless of status (bypass public filter)
    const originalDoc = await db.findByID<Record<string, any>>({
      collection: slug,
      id,
      tenantId: ctxTenantID,
      draft: true,
    });

    if (!originalDoc) {
      return c.json({ error: "Document not found" }, 404);
    }

    if (baseUpdatedAt && originalDoc.updatedAt && baseUpdatedAt !== originalDoc.updatedAt) {
      return c.json(buildConflictResponse(baseUpdatedAt, originalDoc), 409);
    }

    // Determine what data to publish — merge latest version data if available
    let publishData: Record<string, any> = { status: 'published' };
    let finalContent = originalDoc;

    // If drafts enabled, merge latest draft version into the published content
    if (collection.versions?.drafts) {
      const versions = await db.findVersions({
        collection: slug,
        documentId: id,
        limit: 1,
        sort: '-createdAt',
        tenantId: ctxTenantID,
      });
      if (versions.docs.length > 0) {
        const latestVersion = versions.docs[0];
        finalContent = { ...originalDoc, ...latestVersion.data };
        publishData = { ...latestVersion.data, ...publishData };
      }
    }

    // Update main doc
    const doc = await db.update({
      collection: slug,
      id,
      data: publishData,
      tenantId: ctxTenantID,
    });

    // Create a formal 'published' version record
    if (collection.versions?.drafts) {
      await db.createVersion({
        collection: slug,
        documentId: id,
        data: { ...finalContent, status: 'published' },
        status: 'published',
        createdBy: ctxUser?.id,
        changeDescription: 'Published',
        tenantId: ctxTenantID,
      });
    }

    if (webhookService) {
      webhookService
        .trigger(getWebhookEvent(slug, "update"), {
          collection: slug,
          operation: "update",
          data: doc,
          user: ctxUser
            ? { id: ctxUser.id, email: ctxUser.email, role: ctxUser.role }
            : undefined,
          tenantId: ctxTenantID,
        })
        .catch((err) => console.error(`[Webhook] Failed to trigger:`, err));
    }

    return c.json({ data: doc, message: "Published successfully" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/:collection/:id/unpublish - Unpublish document
app.post(`${basePath}/:id/unpublish`, async (c) => {
  try {
    const {
      user: ctxUser,
      tenantId: ctxTenantID,
      apiKeyContext,
    } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);

    const access = await checkCollectionAccess(
      collection,
      "update",
      c.req.raw,
      ctxUser,
      ctxTenantID,
      apiKeyContext,
      enablePublicAccess,
      defaultCollectionAccess,
    );
    if (!access.allowed) {
      return c.json({ error: access.error }, (access.status || 403) as any);
    }

    const id = c.req.param("id");
    // Fetch current doc bypassing status filter
    const currentDoc = await db.findByID<Record<string, any>>({
      collection: slug,
      id,
      tenantId: ctxTenantID,
      draft: true,
    });
    if (!currentDoc) {
      return c.json({ error: "Document not found" }, 404);
    }

    const doc = await db.update({
      collection: slug,
      id,
      data: { status: 'draft' },
      tenantId: ctxTenantID,
    });

    if (webhookService) {
      webhookService
        .trigger(getWebhookEvent(slug, "update"), {
          collection: slug,
          operation: "update",
          data: doc,
          user: ctxUser
            ? { id: ctxUser.id, email: ctxUser.email, role: ctxUser.role }
            : undefined,
          tenantId: ctxTenantID,
        })
        .catch((err) => console.error(`[Webhook] Failed to trigger:`, err));
    }

    return c.json({ data: doc, message: "Unpublished successfully" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
  }

// Dynamic global routes
for (const globalConfig of registry.getGlobals()) {
  const slug = globalConfig.slug;
  const basePath = `/api/globals/${slug}`;

  // POST /api/globals/:slug/dynamic-options/:fieldName
  app.post(`${basePath}/dynamic-options/:fieldName`, async (c) => {
    try {
      const { user: ctxUser, tenantId: ctxTenantID } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      const access = await checkGlobalAccess(globalConfig, "read", c.req.raw, ctxUser, ctxTenantID, enablePublicAccess);
      if (!access.allowed) {
        return c.json({ error: access.error }, (access.status || 403) as any);
      }

      const fieldName = c.req.param("fieldName");
      const body = await c.req.json();
      const { data, siblingData } = body;

      const field = findFieldByName(globalConfig.fields, fieldName);
      if (!field) return c.json({ error: "Field not found" }, 404);
      if (field.type !== "select") return c.json({ error: "Field is not a select field" }, 400);

      let options: any = [];
      if (typeof field.options === "function") {
        options = await field.options({ data: data || {}, siblingData: siblingData || {} });
      } else if (Array.isArray(field.options)) {
        options = field.options;
      }

      return c.json({ options });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /api/globals/:slug
  app.get(basePath, async (c) => {
    try {
      const { user: ctxUser, tenantId: ctxTenantID } =
        await resolveAuthContext(c.req.raw, authMw, user, tenantId);

      const url = new URL(c.req.url);
      const kyroToken = url.searchParams.get("kyroToken");
      const draftParam = url.searchParams.get("draft");

      let previewAllowed = false;
      if (draftParam === "true" && kyroToken && authSecret) {
        try {
          const decoded = await verify(kyroToken, authSecret, "HS256");
          if (decoded && decoded.type === "preview" && decoded.collection === `_globals_${globalConfig.slug}`) {
            previewAllowed = true;
          }
        } catch (e) {
          console.warn("Invalid preview token", e);
        }
      }

      if (!previewAllowed) {
        const access = await checkGlobalAccess(
          globalConfig,
          "read",
          c.req.raw,
          ctxUser,
          ctxTenantID,
          enablePublicAccess,
        );
        if (!access.allowed) {
          return c.json({ error: access.error }, (access.status || 403) as any);
        }
      }

      const isDraftRequest = draftParam === "true" ? true : draftParam === "false" ? false : !!ctxUser;
      const depth = parseInt(url.searchParams.get("depth") || "0");

      const result = await db.find({
        collection: `_globals_${slug}`,
        where: {},
        tenantId: ctxTenantID,
        draft: isDraftRequest,
        depth,
        limit: 1,
      });
      let doc: any = result.docs[0];

      if (doc && depth > 0) {
        await populateRelationships([doc], globalConfig.fields, db as BaseAdapter, registry, 1, depth);
      }

      if (slug === "system") {
        const newSecret = crypto.randomBytes(32).toString("hex");
        if (!doc) {
          doc = await db.create({
            collection: `_globals_${slug}`,
            data: { id: slug, appSecret: newSecret },
            tenantId: ctxTenantID,
          });
        } else if (!doc.appSecret) {
          await db.update({
            collection: `_globals_${slug}`,
            id: slug,
            data: { appSecret: newSecret },
            tenantId: ctxTenantID,
          });
          doc.appSecret = newSecret;
        }
      }

      return c.json({ data: doc || {} });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // POST & PATCH /api/globals/:slug - Update
  const upsertGlobal = async (c: any) => {
    try {
      const { user: ctxUser, tenantId: ctxTenantID } =
        await resolveAuthContext(c.req.raw, authMw, user, tenantId);

      const access = await checkGlobalAccess(
        globalConfig,
        "update",
        c.req.raw,
        ctxUser,
        ctxTenantID,
        enablePublicAccess,
      );
      if (!access.allowed) {
        return c.json({ error: access.error }, (access.status || 403) as any);
      }

      const url = new URL(c.req.url);
      const depth = parseInt(url.searchParams.get("depth") || "0");
      const rawBody = await c.req.json();
      const baseUpdatedAt = readBaseUpdatedAt(rawBody);
      const body = omitRevisionFields(rawBody);
      const cleaned = Object.fromEntries(
        Object.entries(body).filter(([_, v]) => v !== null && v !== "null" && v !== undefined),
      );

      // Convert empty strings to null for non-textual field types (recursive)
      normalizeEmptyStrings(cleaned, globalConfig.fields);

      // Convert legacy string values to richtext format; unwrap TipTap doc objects
      convertRichtextFields(globalConfig.fields, cleaned);

      const schema = registry.getUpdateZodSchema(slug);

      let validated;
      try {
        validated = schema.parse(cleaned);
      } catch (zodErr: any) {
        return c.json({ error: `Validation failed: ${formatZodErrors(zodErr.errors)}`, details: zodErr.errors }, 400);
      }

      // Strip system-managed fields — they are auto-set by the database
      const SYSTEM_FIELDS = new Set(["id", "createdAt", "updatedAt", "status", "baseUpdatedAt", "_baseUpdatedAt"]);
      const userData = Object.fromEntries(
        Object.entries(validated).filter(([k]) => !SYSTEM_FIELDS.has(k)),
      );

      const collectionSlug = `_globals_${slug}`;
      const originalDoc = await db.findOne({
        collection: collectionSlug,
        where: {},
        tenantId: ctxTenantID,
        draft: true,
      });

      // Optimistic Concurrency Control — reject if document was modified since client last fetched it
      if (originalDoc && baseUpdatedAt && originalDoc.updatedAt && baseUpdatedAt !== originalDoc.updatedAt) {
        return c.json(buildConflictResponse(baseUpdatedAt, originalDoc), 409);
      }

      const isDraft = c.req.header("X-Draft") === "true";
      const isDraftEnabled = globalConfig.versions?.drafts === true;
      const isAutosave = c.req.query("autosave") === "true";

      let doc: any;
      if (isDraftEnabled && isDraft) {
        // Draft save: versions only (matches collection behavior)
        await db.createVersion({
          collection: collectionSlug,
          documentId: slug,
          data: userData,
          status: 'draft',
          autosave: isAutosave,
          createdBy: ctxUser?.id,
          changeDescription: isAutosave ? 'Autosave' : 'Manual save',
          tenantId: ctxTenantID,
        });

        if (!originalDoc) {
          doc = await db.create({
            collection: collectionSlug,
            data: { ...userData, id: slug, status: 'draft' },
            tenantId: ctxTenantID,
          });
        } else {
          doc = originalDoc;
        }
      } else if (isDraftEnabled && !isDraft) {
        // Publish: update main doc + create published version
        const publishStatus = 'published';
        if (originalDoc) {
          doc = await db.update({
            collection: collectionSlug,
            id: slug,
            data: { ...userData, status: publishStatus },
            tenantId: ctxTenantID,
          });
        } else {
          doc = await db.create({
            collection: collectionSlug,
            data: { ...userData, id: slug, status: publishStatus },
            tenantId: ctxTenantID,
          });
        }
        await db.createVersion({
          collection: collectionSlug,
          documentId: slug,
          data: userData,
          status: publishStatus,
          autosave: false,
          createdBy: ctxUser?.id,
          changeDescription: 'Published',
          tenantId: ctxTenantID,
        });
      } else {
        // No versions: direct update/create
        if (originalDoc) {
          doc = await db.update({
            collection: collectionSlug,
            id: slug,
            data: userData,
            tenantId: ctxTenantID,
          });
        } else {
          doc = await db.create({
            collection: collectionSlug,
            data: { ...userData, id: slug },
            tenantId: ctxTenantID,
          });
        }
      }

      if (slug === "storage-settings") {
        mediaService = null;
        mediaServiceInitError = null;
      }
      if (slug === "email-settings") {
        const newEmailTransport = await EmailTransport.fromConfig(db);
        (authRoutes as any).email = newEmailTransport || undefined;
      }
      if (slug === "system") {
        await loadSecrets();
      }

      if (ctxUser) {
        sessionAuthAdapter?.createAuditLog({
          action: "settings_change",
          userId: ctxUser.id,
          resource: `global:${slug}`,
          resourceId: slug,
          success: true,
        });
      }
      if (doc && depth > 0) {
        await populateRelationships([doc], globalConfig.fields, db as BaseAdapter, registry, 1, depth);
      }
      return c.json({ data: doc, message: "Updated successfully" });
    } catch (error: any) {
      console.error(`[API] Save global "${slug}" failed:`, error);
      return c.json({
        error: error.message || "Save failed",
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 500);
    }
  };

  app.post(basePath, upsertGlobal);
  app.patch(basePath, upsertGlobal);

  // POST /api/globals/:slug/preview-url
  app.post(`${basePath}/preview-url`, async (c) => {
    try {
      const { user: ctxUser, tenantId: ctxTenantID } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      
      const access = await checkGlobalAccess(globalConfig, "read", c.req.raw, ctxUser, ctxTenantID);
      if (!access.allowed) {
        return c.json({ error: access.error || "Forbidden" }, (access.status || 403) as any);
      }

      const body = await c.req.json().catch(() => ({}));
      
      let token = "";
      if (authSecret) {
        token = await sign({
          type: "preview",
          collection: `_globals_${globalConfig.slug}`,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour expiration
        }, authSecret, "HS256");
      }

      let finalUrl = "";
      if (globalConfig.admin?.preview) {
        finalUrl = await globalConfig.admin.preview(body, { req: c.req.raw, token });
      } else {
        let siteUrl = "";
        try {
          const settings = await db.findOne({ collection: "_globals_site-settings", where: {} });
          if (settings?.siteUrl) siteUrl = settings.siteUrl;
        } catch(e) {}

        if (!siteUrl) {
          return c.json({ error: "No site URL configured in settings, and no custom preview function defined." }, 400);
        }
        siteUrl = siteUrl.replace(/\/$/, "");
        finalUrl = `${siteUrl}/?preview=true&kyroToken=${token}`;
      }

      return c.json({ url: finalUrl });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // POST /api/globals/:slug/publish
  app.post(`${basePath}/publish`, async (c) => {
    try {
      const { user: ctxUser, tenantId: ctxTenantID } =
        await resolveAuthContext(c.req.raw, authMw, user, tenantId);

      const access = await checkGlobalAccess(globalConfig, "update", c.req.raw, ctxUser, ctxTenantID, enablePublicAccess);
      if (!access.allowed) return c.json({ error: access.error }, 403);

      const collectionSlug = `_globals_${slug}`;
      const originalDoc = await db.findOne({
        collection: collectionSlug,
        where: {},
        tenantId: ctxTenantID,
        draft: true,
      });

      if (!originalDoc) return c.json({ error: "Global not found" }, 404);

      let publishData: Record<string, any> = { status: 'published' };
      let finalContent = originalDoc;

      if (globalConfig.versions?.drafts) {
        const versions = await db.findVersions({
          collection: collectionSlug,
          documentId: slug,
          limit: 1,
          sort: '-createdAt',
          tenantId: ctxTenantID,
        });
        if (versions.docs.length > 0) {
          finalContent = { ...originalDoc, ...versions.docs[0].data };
          publishData = { ...versions.docs[0].data, ...publishData };
        }
      }

      const doc = await db.update({
        collection: collectionSlug,
        id: slug,
        data: publishData,
        tenantId: ctxTenantID,
      });

      if (globalConfig.versions?.drafts) {
        await db.createVersion({
          collection: collectionSlug,
          documentId: slug,
          data: { ...finalContent, status: 'published' },
          status: 'published',
          createdBy: ctxUser?.id,
          changeDescription: 'Published',
          tenantId: ctxTenantID,
        });
      }

      return c.json({ data: doc, message: "Published successfully" });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // POST /api/globals/:slug/unpublish
  app.post(`${basePath}/unpublish`, async (c) => {
    try {
      const { user: ctxUser, tenantId: ctxTenantID } =
        await resolveAuthContext(c.req.raw, authMw, user, tenantId);

      const access = await checkGlobalAccess(globalConfig, "update", c.req.raw, ctxUser, ctxTenantID, enablePublicAccess);
      if (!access.allowed) return c.json({ error: access.error }, 403);

      const doc = await db.update({
        collection: `_globals_${slug}`,
        id: slug,
        data: { status: 'draft' },
        tenantId: ctxTenantID,
      });

      return c.json({ data: doc, message: "Unpublished successfully" });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /api/globals/:slug/versions
  app.get(`${basePath}/versions`, async (c) => {
    try {
      const { user: ctxUser, tenantId: ctxTenantID } =
        await resolveAuthContext(c.req.raw, authMw, user, tenantId);

      const access = await checkGlobalAccess(globalConfig, "read", c.req.raw, ctxUser, ctxTenantID, enablePublicAccess);
      if (!access.allowed) return c.json({ error: access.error }, 403);

      const limit = parseInt(c.req.query("limit") || "10");
      const page = parseInt(c.req.query("page") || "1");

      const versions = await db.findVersions({
        collection: `_globals_${slug}`,
        documentId: slug,
        limit,
        page,
        tenantId: ctxTenantID,
      });

      return c.json(versions);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /api/globals/:slug/versions/:id
  app.get(`${basePath}/versions/:versionId`, async (c) => {
    try {
      const versionId = c.req.param("versionId");
      const { user: ctxUser, tenantId: ctxTenantID } =
        await resolveAuthContext(c.req.raw, authMw, user, tenantId);

      const access = await checkGlobalAccess(globalConfig, "read", c.req.raw, ctxUser, ctxTenantID, enablePublicAccess);
      if (!access.allowed) return c.json({ error: access.error }, 403);

      const version = await db.findVersionByID({
        collection: `_globals_${slug}`,
        versionId,
        tenantId: ctxTenantID,
      });

      if (!version) return c.json({ error: "Version not found" }, 404);
      return c.json({ data: version });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // POST /api/globals/:slug/versions/:id/restore
  app.post(`${basePath}/versions/:versionId/restore`, async (c) => {
    try {
      const versionId = c.req.param("versionId");
      const { user: ctxUser, tenantId: ctxTenantID } =
        await resolveAuthContext(c.req.raw, authMw, user, tenantId);

      const access = await checkGlobalAccess(globalConfig, "update", c.req.raw, ctxUser, ctxTenantID, enablePublicAccess);
      if (!access.allowed) return c.json({ error: access.error }, 403);

      const collectionSlug = `_globals_${slug}`;
      const version = await db.findVersionByID({
        collection: collectionSlug,
        versionId,
        tenantId: ctxTenantID,
      });

      if (!version) return c.json({ error: "Version not found" }, 404);

      const doc = await db.update({
        collection: collectionSlug,
        id: slug,
        data: { ...version.data, status: 'draft' },
        tenantId: ctxTenantID,
      });

      return c.json({
        data: doc,
        message: "Version restored successfully",
      });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // Special handler for email settings test
  if (slug === "email-settings") {
    app.post(`${basePath}/test`, async (c) => {
      try {
        const { user: ctxUser, tenantId: ctxTenantID } =
          await resolveAuthContext(c.req.raw, authMw, user, tenantId);

        const access = await checkGlobalAccess(
          globalConfig,
          "update",
          c.req.raw,
          ctxUser,
          ctxTenantID,
          enablePublicAccess,
        );
        if (!access.allowed) {
          return c.json(
            { error: access.error },
            (access.status || 403) as any,
          );
        }

        const body = await c.req.json();

        // Map the raw body to the EmailConfig structure
        // AutoForm sends the same structure as defined in email.ts
        const transportConfig: any = {
          provider: body.provider,
          from: body.fromEmail || body.from,
          fromName: body.fromName,
          replyTo: body.replyTo,
          smtp: body.smtp
            ? {
              host: body.smtp.host,
              port: body.smtp.port,
              secure: body.smtp.secure,
              auth: {
                user: body.smtp.username || body.smtp.user,
                pass: body.smtp.password || body.smtp.pass,
              },
            }
            : undefined,
          resend: body.resend,
          sendgrid: body.sendgrid,
          mailgun: body.mailgun,
          ses: body.ses,
        };

        const transport = new EmailTransport(transportConfig);

        // Attempt to send a test email
        // The recipient is taken from the form body (testEmailSection.testEmail or testEmail)
        const recipient =
          body.email ||
          body.testEmail ||
          (body.testEmailSection && body.testEmailSection.testEmail);

        if (!recipient) {
          return c.json({ error: "No test recipient email provided" }, 400);
        }

        const providerName = body.provider
          ? body.provider.charAt(0).toUpperCase() + body.provider.slice(1)
          : "SMTP";
        const fromSender = body.fromName
          ? `${body.fromName} <${body.fromEmail || body.from || "default"}>`
          : (body.fromEmail || body.from || "Configured Sender");
        const timestampStr = new Date().toUTCString();

        await transport.send({
          to: recipient,
          subject: "Kyro CMS — Email Connection Test",
          html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Kyro CMS Test Email</title>
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    @media (prefers-color-scheme: dark) {
      .email-body { background-color: #09090b !important; color: #f4f4f5 !important; }
      .email-card { background-color: #121215 !important; border-color: #27272a !important; box-shadow: none !important; }
      .email-header { background-color: #18181b !important; border-color: #27272a !important; }
      .email-brand-text { color: #ffffff !important; }
      .email-title { color: #ffffff !important; }
      .email-text { color: #a1a1aa !important; }
      .email-strong { color: #ffffff !important; }
      .email-table { background-color: #18181b !important; border-color: #27272a !important; }
      .email-td-border { border-color: #27272a !important; }
      .email-label { color: #a1a1aa !important; }
      .email-value { color: #f4f4f5 !important; }
      .email-btn-primary { background-color: #ffffff !important; color: #09090b !important; }
      .email-btn-secondary { background-color: #18181b !important; border-color: #27272a !important; color: #f4f4f5 !important; }
      .email-footer { background-color: #09090b !important; border-color: #27272a !important; }
      .email-footer-text { color: #71717a !important; }
      .email-footer-link { color: #a1a1aa !important; }
      .logo-light { display: none !important; }
      .logo-dark { display: inline-block !important; }
      .badge-status { background-color: #064e3b !important; border-color: #047857 !important; color: #34d399 !important; }
    }
  </style>
</head>
<body class="email-body" style="margin: 0; padding: 36px 16px; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #09090b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-card" style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
    <!-- Header Bar -->
    <tr>
      <td class="email-header" style="padding: 22px 28px; border-bottom: 1px solid #f4f4f5; background-color: #ffffff;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="left" valign="middle">
              <a href="https://kyro-cms.com" target="_blank" style="text-decoration: none; display: inline-flex; align-items: center; gap: 10px;">
                <!-- Light Mode Logo -->
                <img src="https://kyro-cms.com/logo.svg" alt="Kyro Logo" class="logo-light" height="24" style="display: inline-block; border: 0; max-height: 24px; vertical-align: middle;" />
                <!-- Dark Mode Logo -->
                <img src="https://kyro-cms.com/logo-white.svg" alt="Kyro Logo" class="logo-dark" height="24" style="display: none; border: 0; max-height: 24px; vertical-align: middle;" />
                <span class="email-brand-text" style="font-size: 16px; font-weight: 700; color: #09090b; letter-spacing: -0.3px; vertical-align: middle;">Kyro CMS</span>
              </a>
            </td>
            <td align="right" valign="middle">
              <span class="badge-status" style="display: inline-block; padding: 4px 10px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 9999px; font-size: 11px; font-weight: 500; color: #047857;">
                ✓ Active Connection
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body Section -->
    <tr>
      <td style="padding: 28px;">
        <h1 class="email-title" style="margin: 0 0 10px; font-size: 20px; font-weight: 600; color: #09090b; letter-spacing: -0.3px;">
          Test Email Dispatch Successful
        </h1>
        <p class="email-text" style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #52525b;">
          Your email transport configuration in <strong class="email-strong" style="color: #09090b;">Kyro CMS</strong> is active and successfully delivering messages. Below are the connection diagnostics.
        </p>

        <!-- Compact Metadata Grid -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-table" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; margin-bottom: 24px; border-collapse: separate; overflow: hidden;">
          <tr>
            <td class="email-label email-td-border" style="padding: 10px 14px; border-bottom: 1px solid #e4e4e7; border-right: 1px solid #e4e4e7; width: 30%; font-size: 12px; font-weight: 500; color: #71717a;">
              Provider
            </td>
            <td class="email-value email-td-border" style="padding: 10px 14px; border-bottom: 1px solid #e4e4e7; font-size: 13px; font-weight: 600; color: #09090b;">
              ${providerName}
            </td>
          </tr>
          <tr>
            <td class="email-label email-td-border" style="padding: 10px 14px; border-bottom: 1px solid #e4e4e7; border-right: 1px solid #e4e4e7; font-size: 12px; font-weight: 500; color: #71717a;">
              Recipient
            </td>
            <td class="email-value email-td-border" style="padding: 10px 14px; border-bottom: 1px solid #e4e4e7; font-size: 13px; color: #18181b; font-family: monospace;">
              ${recipient}
            </td>
          </tr>
          <tr>
            <td class="email-label email-td-border" style="padding: 10px 14px; border-bottom: 1px solid #e4e4e7; border-right: 1px solid #e4e4e7; font-size: 12px; font-weight: 500; color: #71717a;">
              From Sender
            </td>
            <td class="email-value email-td-border" style="padding: 10px 14px; border-bottom: 1px solid #e4e4e7; font-size: 13px; color: #18181b;">
              ${fromSender}
            </td>
          </tr>
          <tr>
            <td class="email-label email-td-border" style="padding: 10px 14px; border-right: 1px solid #e4e4e7; font-size: 12px; font-weight: 500; color: #71717a;">
              Timestamp
            </td>
            <td class="email-value" style="padding: 10px 14px; font-size: 12px; color: #52525b;">
              ${timestampStr}
            </td>
          </tr>
        </table>

        <!-- Action Links -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="left">
              <a href="https://kyro-cms.com" target="_blank" class="email-btn-primary" style="display: inline-block; padding: 10px 18px; background-color: #09090b; color: #ffffff; font-size: 13px; font-weight: 500; text-decoration: none; border-radius: 6px;">
                Visit Website →
              </a>
              <a href="https://kyro-cms.com/docs" target="_blank" class="email-btn-secondary" style="display: inline-block; padding: 10px 16px; margin-left: 8px; background-color: #ffffff; border: 1px solid #e4e4e7; color: #09090b; font-size: 13px; font-weight: 500; text-decoration: none; border-radius: 6px;">
                Documentation
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td class="email-footer" style="padding: 18px 28px; border-top: 1px solid #f4f4f5; background-color: #fafafa; text-align: center;">
        <p class="email-footer-text" style="margin: 0 0 8px; font-size: 12px; color: #71717a;">
          Automated test message dispatched from <strong>Kyro CMS Engine</strong>.
        </p>
        <p style="margin: 0; font-size: 12px; color: #71717a;">
          <a href="https://kyro-cms.com" target="_blank" class="email-footer-link" style="color: #09090b; text-decoration: none; font-weight: 500;">kyro-cms.com</a> &nbsp;•&nbsp; 
          <a href="https://kyro-cms.com/docs" target="_blank" class="email-footer-link" style="color: #09090b; text-decoration: none; font-weight: 500;">Docs</a> &nbsp;•&nbsp; 
          <a href="https://github.com/danielDozie/kyro-cms" target="_blank" class="email-footer-link" style="color: #09090b; text-decoration: none; font-weight: 500;">GitHub</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`,
          text: `Success! Your email settings in Kyro CMS are working correctly.\n\nProvider: ${providerName}\nRecipient: ${recipient}\nTimestamp: ${timestampStr}\nWebsite: https://kyro-cms.com`,
        });

        return c.json({ message: "Test email sent successfully!" });
      } catch (error: any) {
        console.error("[Email Test] Failed:", error);
        return c.json(
          { error: error.message || "Failed to send test email" },
          500,
        );
      }
    });
  }
  }

  // Centralized error handling
  app.onError((err, c) => {
    console.error(`[API Error] ${c.req.method} ${c.req.path}:`, err);
    return c.json(
      { error: err.message || "Internal server error", code: "INTERNAL_ERROR" },
      500,
    );
  });

  return app;
}

// ============================================================================
// Factory
// ============================================================================

export function createRESTAPI(
  registry: Registry,
  db: BaseAdapter,
  options?: {
    authSecret?: string;
    user?: User;
    req?: Request;
    tenantId?: string;
    cors?: {
      origins?: string[];
      credentials?: boolean;
    };
    webhookService?: ReturnType<typeof createWebhookService>;
  },
): Hono {
  return createHonoApp({
    registry,
    db,
    authSecret: options?.authSecret,
    user: options?.user,
    req: options?.req,
    tenantId: options?.tenantId,
    cors: options?.cors,
    webhookService: options?.webhookService,
  });
}
