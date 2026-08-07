import { Hono } from "hono";
import type { KyroAppOptions } from "../kyro-app.js";
import { resolveAuthContext, auditApiKeyUsage, checkCollectionAccess } from "../utils/api-helpers.js";
import { generateApiKey, generateApiKeyPrefix, API_KEY_COLLECTION } from "../../../auth/api-key.js";
import { hasPermission } from "../../../auth/rbac/checker.js";
import { ApiError } from "../../../utils/errors.js";
import type { AuthMiddlewareResult } from "../auth-middleware.js";

export function mountUserRoutes(
  app: Hono,
  options: KyroAppOptions,
  authMw: (req: Request) => Promise<AuthMiddlewareResult>,
): void {
  const { db, user, tenantId, authAdapter: sessionAuthAdapter } = options;

  // GET /api/keys — List API keys (users:read permission)
  app.get("/api/keys", async (c) => {
    const { user: ctxUser, tenantId: ctxTenantID } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser || !hasPermission(ctxUser as any, "users:read")) {
      throw new ApiError(403, "Forbidden");
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
  });

  // POST /api/keys — Create API key (users:admin permission)
  app.post("/api/keys", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser || !hasPermission(ctxUser as any, "users:admin")) {
      throw new ApiError(403, "Forbidden");
    }
    const body = await c.req.json();
    if (!body.name || typeof body.name !== "string") {
      throw new ApiError(400, "name is required");
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
  });

  // DELETE /api/keys/:id — Delete API key
  app.delete("/api/keys/:id", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser || !hasPermission(ctxUser as any, "users:admin")) {
      throw new ApiError(403, "Forbidden");
    }
    const id = c.req.param("id");
    const existing = await db.findByID({ collection: API_KEY_COLLECTION, id });
    if (!existing) throw new ApiError(404, "API key not found");
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
  });

  // PATCH /api/keys/:id — Update API key metadata
  app.patch("/api/keys/:id", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser || !hasPermission(ctxUser as any, "users:admin")) {
      throw new ApiError(403, "Forbidden");
    }
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await db.findByID({ collection: API_KEY_COLLECTION, id });
    if (!existing) throw new ApiError(404, "API key not found");
    const updateData: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) updateData.name = body.name.trim();
    if (Array.isArray(body.permissions)) updateData.permissions = body.permissions;
    if (body.expiresAt !== undefined) updateData.expiresAt = body.expiresAt || null;
    if (Object.keys(updateData).length === 0) throw new ApiError(400, "Nothing to update");
    const updated = await db.update({ collection: API_KEY_COLLECTION, id, data: updateData });
    return c.json({ ...(updated as any), keyPrefix: (existing as any).keyPrefix });
  });

  // POST /api/keys/:id/rotate — Rotate API key
  app.post("/api/keys/:id/rotate", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser || !hasPermission(ctxUser as any, "users:admin")) {
      throw new ApiError(403, "Forbidden");
    }
    const id = c.req.param("id");
    const existing = await db.findByID({ collection: API_KEY_COLLECTION, id });
    if (!existing) throw new ApiError(404, "API key not found");
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
  });
}
