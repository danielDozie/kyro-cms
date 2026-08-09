import type { Hono } from "hono";
import type { AuthRoutes } from "../auth-routes.js";
import type { BaseAdapter } from "../../../registry/types.js";
import type { Registry } from "../../../registry/index.js";
import { resolveAuthContext, checkCollectionAccess, checkGlobalAccess, jsonError } from "../utils/api-helpers.js";
import { ApiError } from "../../../utils/errors.js";

export function mountAuthEndpoints(
  app: Hono,
  authRoutes: AuthRoutes,
  db: BaseAdapter,
  registry: Registry,
  authMw: any,
  optionsUser?: any,
  optionsTenantId?: string,
  enablePublicAccess?: boolean,
  defaultCollectionAccess?: any
): void {
  app.post("/api/auth/login", async (c) => authRoutes.login(c.req.raw));

  app.post("/api/auth/register", async (c) => {
    try {
      const systemDoc = await db.findOne({ collection: "_globals_system", where: {} });
      if (systemDoc && systemDoc.enableRegistration === false) {
        throw new ApiError(403, "User registration is currently disabled by administrator.");
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
  app.post("/api/auth/magic-link", async (c) => authRoutes.requestMagicLink(c.req.raw));
  app.get("/api/auth/magic-link", async (c) => authRoutes.verifyMagicLink(c.req.raw));
  app.post("/api/auth/invite", async (c) => authRoutes.inviteUser(c.req.raw));

  // Session management
  app.get("/api/auth/sessions", async (c) => authRoutes.listSessions(c.req.raw));
  app.post("/api/auth/sessions/refresh", async (c) => authRoutes.refreshSession(c.req.raw));
  app.delete("/api/auth/sessions", async (c) => authRoutes.revokeOtherSessions(c.req.raw));
  app.delete("/api/auth/sessions/:id", async (c) => authRoutes.revokeSession(c.req.raw, c.req.param("id")));
  app.put("/api/auth/sessions/:id/name", async (c) => authRoutes.renameSession(c.req.raw, c.req.param("id")));

  // Access rights introspection
  app.get("/api/auth/access", async (c) => {
    try {
      const { user: ctxUser, tenantId: ctxTenantID } = await resolveAuthContext(
        c.req.raw,
        authMw,
        optionsUser,
        optionsTenantId
      );
      if (!ctxUser) {
        throw new ApiError(401, "Not authenticated");
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
              defaultCollectionAccess
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
              defaultCollectionAccess
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
              defaultCollectionAccess
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
              defaultCollectionAccess
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
              enablePublicAccess
            )
          ).allowed,
          update: (
            await checkGlobalAccess(
              globalConfig,
              "update",
              c.req.raw,
              ctxUser,
              ctxTenantID,
              enablePublicAccess
            )
          ).allowed,
        };
        globals[globalConfig.slug] = permissions;
      }
      return c.json({ collections, globals });
    } catch (err: any) {
      return jsonError(c, err);
    }
  });
}
