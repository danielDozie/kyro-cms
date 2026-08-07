import { Hono } from "hono";
import { verify } from "hono/jwt";
import type { KyroAppOptions } from "../kyro-app.js";
import {
  ensureGlobalAccess,
  resolveAuthContext,
} from "../utils/api-helpers.js";
import { populateRelationships } from "../../../utils/populate.js";
import { sanitizeDoc } from "../../../utils/sanitize.js";
import type { BaseAdapter } from "../../../registry/types.js";

export function mountGlobalRoutes(
  app: Hono,
  options: KyroAppOptions,
  authMw: any
) {
  const {
    registry,
    db,
    authSecret,
    user,
    tenantId,
    settings,
  } = options;

  const enablePublicAccess = settings?.access?.enablePublicAccess ?? true;

  for (const globalConfig of registry.getGlobals()) {
    const slug = globalConfig.slug;
    const basePath = `/api/globals/${slug}`;

    // GET /api/globals/:slug
    app.get(basePath, async (c) => {
      const { user: ctxUser, tenantId: ctxTenantID } =
        await resolveAuthContext(c.req.raw, authMw, user, tenantId);

      const url = new URL(c.req.url);
      const draftParam = url.searchParams.get("draft");
      const kyroToken = url.searchParams.get("kyroToken");

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
        await ensureGlobalAccess(
          globalConfig,
          "read",
          c.req.raw,
          ctxUser,
          ctxTenantID,
          enablePublicAccess,
        );
      }

      const depth = parseInt(url.searchParams.get("depth") || "0");
      const collectionSlug = `_globals_${slug}`;

      let doc = await db.findOne({
        collection: collectionSlug,
        where: {},
        depth,
        tenantId: ctxTenantID,
        draft: draftParam === "true" ? true : draftParam === "false" ? false : !!ctxUser,
      });

      if (!doc) {
        doc = { id: slug };
      }

      await populateRelationships([doc], globalConfig.fields, db as BaseAdapter, registry, 1, depth);
      return c.json({ data: sanitizeDoc(doc) });
    });
  }
}
