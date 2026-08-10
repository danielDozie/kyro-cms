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

    // GET /api/globals/:slug/versions - List versions or compare 2 versions for a global
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
      const compareA = c.req.query("compareA");
      const compareB = c.req.query("compareB");

      if (compareA && compareB && typeof (db as any).findVersionByID === "function") {
        try {
          const vA = await (db as any).findVersionByID({ collection: collectionSlug, versionId: compareA, tenantId: ctxTenantID });
          const vB = await (db as any).findVersionByID({ collection: collectionSlug, versionId: compareB, tenantId: ctxTenantID });
          if (!vA || !vB) {
            return c.json({ error: "One or both comparison versions were not found" }, 404);
          }
          const dataA = typeof vA.data === "string" ? JSON.parse(vA.data) : (vA.data || {});
          const dataB = typeof vB.data === "string" ? JSON.parse(vB.data) : (vB.data || {});
          const diffs: any[] = [];
          const allKeys = new Set([...Object.keys(dataA), ...Object.keys(dataB)]);
          for (const key of allKeys) {
            if (["id", "createdAt", "updatedAt", "publishedAt"].includes(key)) continue;
            if (JSON.stringify(dataA[key]) !== JSON.stringify(dataB[key])) {
              diffs.push({
                field: key,
                oldValue: dataA[key] ?? null,
                newValue: dataB[key] ?? null,
              });
            }
          }
          return c.json({ diffs, versionA: vA, versionB: vB });
        } catch (e) {
          console.warn(`[compareVersions] Error comparing global versions for ${slug}:`, e);
          return c.json({ diffs: [] });
        }
      }

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

    // GET /api/globals/:slug/versions/:versionId - Get specific version of a global
    app.get(`${basePath}/versions/:versionId`, async (c) => {
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
      const versionId = c.req.param("versionId");
      let doc: any = null;

      if (typeof (db as any).findVersionByID === "function") {
        doc = await (db as any).findVersionByID({
          collection: collectionSlug,
          versionId,
          tenantId: ctxTenantID,
        });
      }

      if (!doc) {
        return c.json({ error: `Global version '${versionId}' not found` }, 404);
      }

      return c.json({ doc, data: doc });
    });

    // POST /api/globals/:slug/versions/:versionId/restore - Restore global version
    app.post(`${basePath}/versions/:versionId/restore`, async (c) => {
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

      const collectionSlug = `_globals_${slug}`;
      const versionId = c.req.param("versionId");

      if (typeof (db as any).findVersionByID === "function") {
        const versionRec = await (db as any).findVersionByID({
          collection: collectionSlug,
          versionId,
          tenantId: ctxTenantID,
        });

        if (!versionRec) {
          return c.json({ error: `Global version '${versionId}' not found` }, 404);
        }

        const versionData = typeof versionRec.data === "string" ? JSON.parse(versionRec.data) : versionRec.data;
        const { id: _ignoreId, createdAt: _ignoreCreated, updatedAt: _ignoreUpdated, ...restoreFields } = versionData;

        let existing = await db.findOne({
          collection: collectionSlug,
          where: {},
          tenantId: ctxTenantID,
        });

        let restored;
        if (existing) {
          restored = await db.update({
            collection: collectionSlug,
            id: existing.id,
            data: restoreFields,
            tenantId: ctxTenantID,
          });
        } else {
          restored = await db.create({
            collection: collectionSlug,
            data: { id: slug, ...restoreFields },
            tenantId: ctxTenantID,
          });
        }

        if (globalConfig.versions && typeof (db as any).createVersion === "function") {
          await (db as any).createVersion({
            collection: collectionSlug,
            documentId: slug,
            data: restored || restoreFields,
            status: "published",
            autosave: false,
            createdBy: ctxUser?.id,
            changeDescription: `Restored from version ${versionRec.version || versionId}`,
            tenantId: ctxTenantID,
          });
        }

        const sanitized = sanitizeDoc(restored);
        return c.json({ doc: sanitized, data: sanitized, message: "Global version restored successfully" });
      }

      return c.json({ error: "Version restoration not supported by database adapter" }, 501);
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
      const url = new URL(c.req.url);
      const isAutosave = url.searchParams.get("autosave") === "true" || c.req.header("x-autosave") === "true" || body.autosave === true;
      const isDraft = url.searchParams.get("draft") === "true" || c.req.header("x-draft") === "true" || body.draft === true;
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

      // Automatically create a version record if versions are configured for global
      if (globalConfig.versions && typeof (db as any).createVersion === "function") {
        try {
          await (db as any).createVersion({
            collection: collectionSlug,
            documentId: slug,
            data: updated || body,
            status: isDraft ? "draft" : "published",
            autosave: isAutosave,
            createdBy: ctxUser?.id,
            changeDescription: body.changeDescription || (isAutosave ? "Auto-saved" : "Updated snapshot"),
            tenantId: ctxTenantID,
          });
        } catch (e) {
          console.warn(`[createVersion] Failed creating version for global ${slug}:`, e);
        }
      }

      const sanitized = sanitizeDoc(updated);
      return c.json({ doc: sanitized, data: sanitized, message: "Global updated successfully" });
    };

    app.post(basePath, handleSaveGlobal);
    app.patch(basePath, handleSaveGlobal);
    app.put(basePath, handleSaveGlobal);
  }
}
