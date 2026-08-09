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
      const sanitized = sanitizeDoc(doc);
      return c.json({ doc: sanitized, data: sanitized });
    });

    // GET /api/globals/:slug/versions - List versions for a global
    app.get(`${basePath}/versions`, async (c) => {
      const { user: ctxUser, tenantId: ctxTenantID } =
        await resolveAuthContext(c.req.raw, authMw, user, tenantId);

      await ensureGlobalAccess(
        globalConfig,
        "read",
        c.req.raw,
        ctxUser,
        ctxTenantID,
        enablePublicAccess,
      );

      const collectionSlug = `_globals_${slug}`;
      const page = parseInt(c.req.query("page") || "1");
      const limit = Math.min(parseInt(c.req.query("limit") || "30"), 100);

      let docs: any[] = [];
      let totalDocs = 0;

      if (typeof (db as any).findVersions === "function") {
        try {
          const result = await (db as any).findVersions({
            collection: collectionSlug,
            documentId: slug,
            page,
            limit,
            tenantId: ctxTenantID,
          });
          docs = result.docs || [];
          totalDocs = result.totalDocs || docs.length;
        } catch (e) {
          console.warn(`[findVersions] Error fetching global versions for ${slug}:`, e);
        }
      }

      return c.json({
        docs,
        totalDocs,
        page,
        limit,
        totalPages: Math.ceil(totalDocs / limit) || 1,
        data: docs,
        meta: { total: totalDocs, page, limit, totalPages: Math.ceil(totalDocs / limit) || 1 },
      });
    });

    // POST, PATCH, PUT /api/globals/:slug - Save / Update global
    const handleSaveGlobal = async (c: any) => {
      const { user: ctxUser, tenantId: ctxTenantID } =
        await resolveAuthContext(c.req.raw, authMw, user, tenantId);

      await ensureGlobalAccess(
        globalConfig,
        "update",
        c.req.raw,
        ctxUser,
        ctxTenantID,
        enablePublicAccess,
      );

      const body = await c.req.json();
      const collectionSlug = `_globals_${slug}`;

      let existing = await db.findOne({
        collection: collectionSlug,
        where: {},
        tenantId: ctxTenantID,
      });

      let updated;
      if (existing) {
        updated = await db.update({
          collection: collectionSlug,
          id: existing.id,
          data: body,
          tenantId: ctxTenantID,
        });
      } else {
        updated = await db.create({
          collection: collectionSlug,
          data: { id: slug, ...body },
          tenantId: ctxTenantID,
        });
      }

      const sanitized = sanitizeDoc(updated);
      return c.json({ doc: sanitized, data: sanitized, message: "Global updated successfully" });
    };

    app.post(basePath, handleSaveGlobal);
    app.patch(basePath, handleSaveGlobal);
    app.put(basePath, handleSaveGlobal);
  }
}
