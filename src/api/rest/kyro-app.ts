import { Hono } from "hono";
import { resolve } from "node:path";
import type { BaseAdapter } from "../../registry/types.js";
import { Registry } from "../../registry/index.js";
import { formatZodErrors } from "../../utils/field-helpers.js";
import type { User } from "../../hooks/types.js";
import { createAuthMiddleware } from "./auth-middleware.js";
import { createWebhookService } from "../../webhooks/index.js";
import { EmailTransport } from "../../auth/nodemailer-transport.js";
import { InMemoryRateLimiter } from "../../auth/security/in-memory-rate-limit.js";
import { AuthRoutes } from "./auth-routes.js";
import { SQLiteAuthAdapter } from "../../auth/sqlite-adapter.js";
import { PostgresAuthAdapter } from "../../database/drizzle/postgres-auth-adapter.js";
import { mountCollectionRoutes, mountGlobalRoutes, mountMediaRoutes, mountUserRoutes, mountSystemRoutes, mountAuthEndpoints } from "./routes/index.js";
import { D1AuthAdapter } from "../../database/drizzle/d1-auth-adapter.js";
import { MongoDBAdapter } from "../../database/mongodb/adapter.js";
import { MongoDBAuthAdapter } from "../../database/mongodb/mongo-auth-adapter.js";
import { hasPermission } from "../../auth/rbac/checker.js";
import { JWTPayload } from "../../auth/types.js";
import { usersCollection as defaultUsersCollection } from "../../templates/auth.js";
import { API_KEY_COLLECTION } from "../../auth/api-key.js";
import { ApiError } from "../../utils/errors.js";

// ============================================================================
// REST API Factory
// ============================================================================

export interface KyroAppOptions {
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

import {
  checkCollectionAccess,
  checkGlobalAccess,
  resolveAuthContext
} from "./utils/api-helpers.js";

// ============================================================================
// Auth Adapter Factory (auto-detect dialect)
// ============================================================================

async function createDefaultAuthAdapter(
  db: BaseAdapter,
  rootDir: string,
): Promise<any> {
  if ('dialect' in db && (db as any).dialect === "postgres") {
    return new PostgresAuthAdapter({ db: (db as any).client });
  }
  if ('dialect' in db && (db as any).dialect === "sqlite") {
    return new D1AuthAdapter({ db: (db as any).client });
  }
  if ('dialect' in db && (db as any).dialect === "mongodb") {
    const mongoDb = db as MongoDBAdapter;
    return new MongoDBAuthAdapter({ db: () => mongoDb.db, adapter: mongoDb });
  }
  const defaultAuthDbPath = resolve(rootDir, "data", "auth.db");
  return new SQLiteAuthAdapter({
    path: process.env.KYRO_AUTH_DB_PATH || defaultAuthDbPath,
  });
}

// ============================================================================
// Hono App Factory
// ============================================================================

export async function createKyroApp(options: KyroAppOptions): Promise<Hono> {
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

    if (!isKyroAdmin && c.res.status < 400) {
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

  // Global Error Handler
  app.onError((err, c) => {
    if (err instanceof ApiError || (err && typeof (err as any).statusCode === "number")) {
      return c.json({ error: err.message, ...(err as any).metadata }, ((err as any).statusCode || (err as any).status || 500) as any);
    }

    if (err.name === "ZodError") {
      return c.json(
        { error: `Validation failed: ${formatZodErrors((err as any).errors)}`, details: (err as any).errors },
        400,
      );
    }

    // Fallback for unexpected errors
    console.error("[Kyro API Error]", err);
    return c.json({ error: err.message || "Internal Server Error" }, 500);
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
  const sessionAuthAdapter = authAdapter || (await createDefaultAuthAdapter(db, rootDir));

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
        throw new ApiError(403, "Origin not allowed");
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

    mountAuthEndpoints(
      app,
      authRoutes,
      db,
      registry,
      authMw,
      user,
      tenantId,
      enablePublicAccess,
      defaultCollectionAccess
    );

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
      throw new ApiError((access.status || 403) as number, access.error || "Access denied");
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
  });

  app.get("/api/users/:id", async (c) => {
    const { user: ctxUser, tenantId: ctxTenantID } = await resolveAuthContext(
      c.req.raw,
      authMw,
      user,
      tenantId,
    );
    const id = c.req.param("id");
    const found = await sessionAuthAdapter.findUserById(id);
    if (!found) {
      throw new ApiError(404, "User not found");
    }
    return c.json({ data: found });
  });

  app.post("/api/users", async (c) => {
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
      throw new ApiError((access.status || 403) as number, access.error || "Access denied");
    }
    const body = await c.req.json();
    if (!body.email || !body.password) {
      throw new ApiError(400, "Email and password are required");
    }
    const existing = await sessionAuthAdapter.findUserByEmail(body.email);
    if (existing) {
      throw new ApiError(400, "Email already in use");
    }
    const targetRole = body.role || "customer";
    if (targetRole !== "customer" && ctxUser?.role !== "super_admin") {
      throw new ApiError(403, "Forbidden: Only super_admin can assign administrative roles");
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
  });

  app.patch("/api/users/:id", async (c) => {
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
      throw new ApiError((access.status || 403) as number, access.error || "Access denied");
    }
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await sessionAuthAdapter.findUserById(id);
    if (!existing) {
      throw new ApiError(404, "User not found");
    }
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.role !== undefined && body.role !== existing.role) {
      if (ctxUser?.role !== "super_admin") {
        throw new ApiError(403, "Forbidden: Only super_admin can modify user roles");
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
      throw new ApiError(500, "User update failed");
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
  });

  app.delete("/api/users/:id", async (c) => {
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
      throw new ApiError((access.status || 403) as number, access.error || "Access denied");
    }
    const id = c.req.param("id");
    if (ctxUser && ctxUser.id === id) {
      throw new ApiError(403, "You cannot delete your own account");
    }
    const existing = await sessionAuthAdapter.findUserById(id);
    if (!existing) {
      throw new ApiError(404, "User not found");
    }
    const deleted = await sessionAuthAdapter.deleteUser(id);
    if (!deleted) {
      throw new ApiError(500, "User deletion failed");
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
  });

  // Audit Logs Route (backed by auth adapter)
  app.get("/api/auth/audit-logs", async (c) => {
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
        throw new ApiError((access.status || 403) as number, access.error || "Access denied");
      }
    } else if (!ctxUser) {
      throw new ApiError(401, "Authentication required");
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
  });

  // ============================================================================
  // Media Routes (Delegated to modular router)
  // ============================================================================
  mountMediaRoutes(app, options, authMw);

  // Storage status endpoint
  app.get("/api/storage-status", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser) throw new ApiError(401, "Authentication required");
    const hasR2Binding = typeof (globalThis as any).STORAGE_BUCKET !== "undefined" || typeof (c.env as any)?.STORAGE_BUCKET !== "undefined";
    let configured = hasR2Binding;
    let provider = hasR2Binding ? "cloudflare_r2" : "local";
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
  });

  // GET /api/plugins — list all registered plugins with enabled state
  app.get("/api/plugins", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser) throw new ApiError(401, "Authentication required");
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
        } catch { }

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
  });

  // PUT /api/plugins/:name/toggle — toggle plugin enabled state
  app.put("/api/plugins/:name/toggle", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser) throw new ApiError(401, "Authentication required");
    const pluginName = c.req.param("name");
    const storageRegistry = registry.storageProviders;
    const currentEnabled = storageRegistry.isPluginEnabled(pluginName);
    const newEnabled = !currentEnabled;
    const affectedProviders: string[] = [];
    if (!newEnabled) {
      for (const p of storageRegistry.getAll()) {
        if (p.pluginName === pluginName) {
          affectedProviders.push(p.type);
        }
      }
    }
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
        } catch { }
      }

      if (affectedProviders.includes(activeProvider)) {
        return c.json({
          error: `Cannot disable "${pluginName}" — storage provider "${activeProvider}" is currently active. Switch to Local storage first.`,
          requiresAction: true,
          activeProvider,
        }, 409);
      }
    }
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
  });

  // Health check (public)
  app.get("/api/health", (c) => {
    return c.json({
      status: "ok",
      version: "0.12.68",
      collections: registry.getCollectionSlugs(),
      timestamp: new Date().toISOString(),
    });
  });

  // CMS Metrics (admin only)
  app.get("/api/metrics", async (c) => {
    const { user: ctxUser, tenantId: ctxTenantID } = await resolveAuthContext(
      c.req.raw,
      authMw,
      user,
      tenantId,
    );
    if (!ctxUser) throw new ApiError(401, "Authentication required");
    const isAdmin = ctxUser.role === "admin" || ctxUser.role === "super_admin";
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
    let totalMedia = 0;
    try {
      const mediaResult = await db.find({ collection: "media", where: {}, limit: 1, page: 1, tenantId: ctxTenantID });
      totalMedia = mediaResult.totalDocs ?? 0;
    } catch { }
    let totalUsers = 0;
    try {
      const usersResult = await db.find({ collection: "users", where: {}, limit: 1, page: 1, tenantId: ctxTenantID });
      totalUsers = usersResult.totalDocs ?? 0;
    } catch { }
    let totalWebhooks = 0;
    try {
      if (webhookService) {
        const webhooks = await webhookService.getWebhooks();
        totalWebhooks = Array.isArray(webhooks) ? webhooks.length : 0;
      }
    } catch { }
    let totalApiKeys = 0;
    try {
      const apiKeyResult = await db.find({ collection: API_KEY_COLLECTION, where: {}, limit: 1, page: 1, tenantId: ctxTenantID });
      totalApiKeys = apiKeyResult.totalDocs ?? 0;
    } catch { }
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
  });

  // User & API Key routes (Delegated to modular router)
  mountUserRoutes(app, options, authMw);

  // System, Webhook & Search routes (Delegated to modular router)
  mountSystemRoutes(app, options, authMw);

  // Dynamic collection routes (Delegated to modular router)
  mountCollectionRoutes(app, options, authMw);

  // Dynamic global routes (Delegated to modular router)
  mountGlobalRoutes(app, options, authMw);
  // Centralized error handling
  app.onError((err, c) => {
    const status = Number((err as any)?.statusCode || (err as any)?.status || 500);
    if (status >= 500) {
      console.error(`[API Error] ${c.req.method} ${c.req.path}:`, err);
    }
    return c.json(
      { error: err.message || "Internal server error", code: status >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST" },
      status as any,
    );
  });

  return app;
}

// ============================================================================
// Factory
// ============================================================================

export async function createRESTAPI(
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
): Promise<Hono> {
  return createKyroApp({
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
