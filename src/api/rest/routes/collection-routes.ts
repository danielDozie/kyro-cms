import { Hono } from "hono";
import { verify } from "hono/jwt";
import type { KyroAppOptions } from "../kyro-app.js";
import {
  checkCollectionAccess,
  resolveAuthContext
} from "../utils/api-helpers.js";
import { populateRelationships } from "../../../utils/populate.js";
import { sanitizeDoc } from "../../../utils/sanitize.js";
import { ApiError } from "../../../utils/errors.js";
import { HookPipeline } from "../../../hooks/HookPipeline.js";
import type { BaseAdapter } from "../../../registry/types.js";

export function mountCollectionRoutes(app: Hono, options: KyroAppOptions, authMw: any) {
  const {
    registry,
    db,
    authSecret,
    user,
    tenantId,
    settings,
  } = options;

  const enablePublicAccess = settings?.access?.enablePublicAccess ?? true;
  const defaultCollectionAccess = settings?.access?.defaultCollectionAccess ?? "none";

  for (const collection of registry.getCollections()) {
    const slug = collection.slug;
    const basePath = `/api/${slug}`;

    // POST /api/:collection/dynamic-options/:fieldName
    app.post(`${basePath}/dynamic-options/:fieldName`, async (c) => {
      const { user: ctxUser, tenantId: ctxTenantID, apiKeyContext } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
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
        throw new ApiError((access.status || 403) as number, access.error || "Access denied");
      }

      const fieldName = c.req.param("fieldName");
      const field = collection.fields.find((f: any) => f.name === fieldName);
      if (!field || field.type !== "relationship" || !field.relationTo) {
        throw new ApiError(400, "Invalid field for dynamic options");
      }

      const relationSlug = Array.isArray(field.relationTo) ? field.relationTo[0] : field.relationTo;
      const searchReq = await c.req.json();
      const findRes = await db.find({
        collection: relationSlug,
        where: searchReq.where,
        limit: 20,
        tenantId: ctxTenantID,
      });

      const relatedCollection = registry.getCollection(relationSlug);
      const labelField = relatedCollection?.admin?.useAsTitle || "id";

      const options = (findRes.docs || []).map((doc: any) => ({
        label: doc[labelField] || doc.id,
        value: doc.id,
      }));

      return c.json({ data: options });
    });

    // GET /api/:collection - List
    app.get(basePath, async (c) => {
      const { user: ctxUser, tenantId: ctxTenantID, apiKeyContext } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
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
          throw new ApiError((access.status || 403) as number, access.error || "Access denied");
        }
      }

      const limit = parseInt(url.searchParams.get("limit") || "10");
      const page = parseInt(url.searchParams.get("page") || "1");
      const sort = url.searchParams.get("sort") || undefined;
      const depth = parseInt(url.searchParams.get("depth") || "0");
      const select = url.searchParams.get("select")?.split(",") || undefined;
      const whereParam = url.searchParams.get("where");
      let where;
      if (whereParam) {
        try {
          where = JSON.parse(decodeURIComponent(whereParam));
        } catch (e) {
          throw new ApiError(400, "Invalid JSON in where clause");
        }
      }

      const isDraftRequest = draftParam === "true" ? true : draftParam === "false" ? false : !!ctxUser;
      const findRes = await db.find({
        collection: slug,
        where,
        limit,
        page,
        sort,
        tenantId: ctxTenantID,
        select,
        draft: isDraftRequest,
      });

      const totalDocs = await db.count({ collection: slug, where, tenantId: ctxTenantID } as any);
      await populateRelationships(findRes.docs || [], collection.fields, db as BaseAdapter, registry, 1, depth);
      
      const docs = (findRes.docs || []).map(sanitizeDoc);
      return c.json({
        docs,
        totalDocs,
        limit,
        page,
        totalPages: Math.ceil(totalDocs / limit),
        data: docs,
        meta: { total: totalDocs, page, limit, totalPages: Math.ceil(totalDocs / limit) },
      });
    });

    // GET /api/:collection/:id/versions - List versions or compare 2 versions
    app.get(`${basePath}/:id/versions`, async (c) => {
      const { user: ctxUser, tenantId: ctxTenantID, apiKeyContext } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
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
        throw new ApiError((access.status || 403) as number, access.error || "Access denied");
      }

      const id = c.req.param("id");
      const page = parseInt(c.req.query("page") || "1");
      const limit = Math.min(parseInt(c.req.query("limit") || "30"), 100);
      const compareA = c.req.query("compareA");
      const compareB = c.req.query("compareB");

      if (compareA && compareB && typeof (db as any).findVersionByID === "function") {
        try {
          const vA = await (db as any).findVersionByID({ collection: slug, versionId: compareA, tenantId: ctxTenantID });
          const vB = await (db as any).findVersionByID({ collection: slug, versionId: compareB, tenantId: ctxTenantID });
          if (!vA || !vB) {
            throw new ApiError(404, "One or both comparison versions were not found");
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
          if (e instanceof ApiError) throw e;
          console.warn(`[compareVersions] Error comparing versions for ${slug}/${id}:`, e);
          return c.json({ diffs: [] });
        }
      }

      let docs: any[] = [];
      let totalDocs = 0;

      if (typeof (db as any).findVersions === "function") {
        try {
          const result = await (db as any).findVersions({
            collection: slug,
            documentId: id,
            page,
            limit,
            tenantId: ctxTenantID,
          });
          docs = result.docs || [];
          totalDocs = result.totalDocs || docs.length;
        } catch (e) {
          console.warn(`[findVersions] Error fetching versions for ${slug}/${id}:`, e);
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

    // POST /api/:collection/:id/versions - Fallback action handler for restore
    app.post(`${basePath}/:id/versions`, async (c) => {
      const { user: ctxUser, tenantId: ctxTenantID, apiKeyContext } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
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
        throw new ApiError((access.status || 403) as number, access.error || "Access denied");
      }

      const id = c.req.param("id");
      const body = await c.req.json().catch(() => ({}));
      const versionId = body.versionId;

      if (body.action === "restore" && versionId && typeof (db as any).findVersionByID === "function") {
        const versionRec = await (db as any).findVersionByID({ collection: slug, versionId, tenantId: ctxTenantID });
        if (!versionRec) {
          throw new ApiError(404, `Version '${versionId}' not found`);
        }
        const versionData = typeof versionRec.data === "string" ? JSON.parse(versionRec.data) : versionRec.data;
        const { id: _ignoreId, createdAt: _ignoreCreated, updatedAt: _ignoreUpdated, ...restoreFields } = versionData;

        if (collection.versions && typeof (db as any).createVersion === "function") {
          await (db as any).createVersion({
            collection: slug,
            documentId: id,
            data: restoreFields,
            status: restoreFields.status || "published",
            autosave: false,
            createdBy: ctxUser?.id,
            changeDescription: `Restored from version ${versionRec.version || versionId}`,
            tenantId: ctxTenantID,
          });
        }

        const restored = await db.update({
          collection: slug,
          id,
          data: restoreFields,
          tenantId: ctxTenantID,
        });

        const sanitized = sanitizeDoc(restored);
        return c.json({ doc: sanitized, data: sanitized, message: "Version restored successfully" });
      }

      throw new ApiError(400, "Invalid action for version management");
    });

    // GET /api/:collection/:id/versions/:versionId - Get specific version
    app.get(`${basePath}/:id/versions/:versionId`, async (c) => {
      const { user: ctxUser, tenantId: ctxTenantID, apiKeyContext } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
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
        throw new ApiError((access.status || 403) as number, access.error || "Access denied");
      }

      const versionId = c.req.param("versionId");
      let doc: any = null;

      if (typeof (db as any).findVersionByID === "function") {
        doc = await (db as any).findVersionByID({
          collection: slug,
          versionId,
          tenantId: ctxTenantID,
        });
      }

      if (!doc) {
        throw new ApiError(404, `Version '${versionId}' not found`);
      }

      return c.json({ doc, data: doc });
    });

    // POST /api/:collection/:id/versions/:versionId/restore - Restore version
    app.post(`${basePath}/:id/versions/:versionId/restore`, async (c) => {
      const { user: ctxUser, tenantId: ctxTenantID, apiKeyContext } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
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
        throw new ApiError((access.status || 403) as number, access.error || "Access denied");
      }

      const id = c.req.param("id");
      const versionId = c.req.param("versionId");

      if (typeof (db as any).restoreVersion === "function") {
        try {
          const restored = await (db as any).restoreVersion({
            collection: slug,
            documentId: id,
            versionId,
            tenantId: ctxTenantID,
          });
          return c.json({ doc: restored, data: restored, message: "Version restored successfully" });
        } catch (e) {
          console.warn("[restoreVersion] Adapter restore failed, falling back to manual restore:", e);
        }
      }

      if (typeof (db as any).findVersionByID === "function") {
        const versionRec = await (db as any).findVersionByID({ collection: slug, versionId, tenantId: ctxTenantID });
        if (!versionRec) {
          throw new ApiError(404, `Version '${versionId}' not found`);
        }
        const versionData = typeof versionRec.data === "string" ? JSON.parse(versionRec.data) : versionRec.data;
        const { id: _ignoreId, createdAt: _ignoreCreated, updatedAt: _ignoreUpdated, ...restoreFields } = versionData;

        if (collection.versions && typeof (db as any).createVersion === "function") {
          await (db as any).createVersion({
            collection: slug,
            documentId: id,
            data: restoreFields,
            status: restoreFields.status || "published",
            autosave: false,
            createdBy: ctxUser?.id,
            changeDescription: `Restored from version ${versionRec.version || versionId}`,
            tenantId: ctxTenantID,
          });
        }

        const restored = await db.update({
          collection: slug,
          id,
          data: restoreFields,
          tenantId: ctxTenantID,
        });

        const sanitized = sanitizeDoc(restored);
        return c.json({ doc: sanitized, data: sanitized, message: "Version restored successfully" });
      }

      throw new ApiError(501, "Version restoration not supported by database adapter");
    });

    // GET /api/:collection/:id - Single document
    app.get(`${basePath}/:id`, async (c) => {
      const { user: ctxUser, tenantId: ctxTenantID, apiKeyContext } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
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
          throw new ApiError((access.status || 403) as number, access.error || "Access denied");
        }
      }

      const id = c.req.param("id");
      const depth = parseInt(url.searchParams.get("depth") || "1");
      const isDraftRequest = draftParam === "true" ? true : draftParam === "false" ? false : !!ctxUser;

      const doc = await db.findByID({
        collection: slug,
        id,
        tenantId: ctxTenantID,
        draft: isDraftRequest,
      });

      if (!doc) {
        throw new ApiError(404, `Document '${id}' not found in '${slug}'`);
      }

      await populateRelationships([doc], collection.fields, db as BaseAdapter, registry, 1, depth);
      const sanitized = sanitizeDoc(doc);
      return c.json({ doc: sanitized, data: sanitized });
    });

    // POST /api/:collection - Create document
    app.post(basePath, async (c) => {
      const { user: ctxUser, tenantId: ctxTenantID, apiKeyContext } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
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
        throw new ApiError((access.status || 403) as number, access.error || "Access denied");
      }

      let body = await c.req.json();

      // Execute beforeChange collection hooks
      if (collection.hooks?.beforeChange && collection.hooks.beforeChange.length > 0) {
        const pipeline = new HookPipeline(collection.hooks.beforeChange);
        body = await pipeline.execute({
          data: body,
          collection: slug,
          operation: 'create',
          req: c.req.raw as any,
          user: ctxUser,
        });
      }

      const created = await db.create({
        collection: slug,
        data: body,
        tenantId: ctxTenantID,
      });

      // Save initial version if versioning is configured
      if (collection.versions && typeof (db as any).createVersion === "function") {
        try {
          await (db as any).createVersion({
            collection: slug,
            documentId: (created as any)?.id || body.id,
            data: created,
            status: body.status || "published",
            autosave: false,
            createdBy: ctxUser?.id,
            changeDescription: body.changeDescription || "Initial version",
            tenantId: ctxTenantID,
          });
        } catch (e) {
          console.warn(`[createVersion] Failed creating initial version for ${slug}:`, e);
        }
      }

      // Execute afterChange collection hooks
      if (collection.hooks?.afterChange && collection.hooks.afterChange.length > 0) {
        const pipeline = new HookPipeline(collection.hooks.afterChange);
        await pipeline.execute({
          data: created,
          collection: slug,
          operation: 'create',
          req: c.req.raw as any,
          user: ctxUser,
        });
      }

      const sanitized = sanitizeDoc(created);
      return c.json({ doc: sanitized, data: sanitized, message: "Document created successfully" }, 201);
    });

    // PATCH /api/:collection/:id - Update document
    app.patch(`${basePath}/:id`, async (c) => {
      const { user: ctxUser, tenantId: ctxTenantID, apiKeyContext } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
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
        throw new ApiError((access.status || 403) as number, access.error || "Access denied");
      }

      const id = c.req.param("id");
      let body = await c.req.json();
      const url = new URL(c.req.url);
      const isAutosave = url.searchParams.get("autosave") === "true" || c.req.header("x-autosave") === "true" || body.autosave === true;
      const isDraft = url.searchParams.get("draft") === "true" || c.req.header("x-draft") === "true" || body.draft === true;
      const isDraftEnabled = collection.versions?.drafts === true;

      // Execute beforeChange collection hooks
      if (collection.hooks?.beforeChange && collection.hooks.beforeChange.length > 0) {
        const originalDoc = await db.findByID({ collection: slug, id, tenantId: ctxTenantID });
        const pipeline = new HookPipeline(collection.hooks.beforeChange);
        body = await pipeline.execute({
          data: body,
          originalDoc: originalDoc || undefined,
          collection: slug,
          operation: 'update',
          req: c.req.raw as any,
          user: ctxUser,
        });
      }

      let updated: any;
      if (isDraftEnabled && isDraft) {
        if (typeof (db as any).createVersion === "function") {
          await (db as any).createVersion({
            collection: slug,
            documentId: id,
            data: body,
            status: "draft",
            autosave: isAutosave,
            createdBy: ctxUser?.id,
            changeDescription: body.changeDescription || (isAutosave ? "Auto-saved draft" : "Draft snapshot"),
            tenantId: ctxTenantID,
          });
        }
        updated = await db.findByID({ collection: slug, id, tenantId: ctxTenantID, draft: true });
      } else {
        const existing = await db.findByID({ collection: slug, id, tenantId: ctxTenantID, draft: true });
        if (!existing) {
          throw new ApiError(404, `Document '${id}' not found in '${slug}'`);
        }
        const mergedData = { ...existing, ...body };

        if (collection.versions && typeof (db as any).createVersion === "function") {
          try {
            await (db as any).createVersion({
              collection: slug,
              documentId: id,
              data: mergedData,
              status: body.status || (existing as any).status || "published",
              autosave: isAutosave,
              createdBy: ctxUser?.id,
              changeDescription: body.changeDescription || (isAutosave ? "Auto-saved" : "Updated snapshot"),
              tenantId: ctxTenantID,
            });
          } catch (e) {
            console.warn(`[createVersion] Failed creating version for ${slug}/${id}:`, e);
          }
        }

        updated = await db.update({
          collection: slug,
          id,
          data: body,
          tenantId: ctxTenantID,
        });

        if (!updated) {
          throw new ApiError(404, `Document '${id}' not found in '${slug}'`);
        }
      }

      // Execute afterChange collection hooks
      if (collection.hooks?.afterChange && collection.hooks.afterChange.length > 0) {
        const pipeline = new HookPipeline(collection.hooks.afterChange);
        await pipeline.execute({
          data: updated,
          collection: slug,
          operation: 'update',
          req: c.req.raw as any,
          user: ctxUser,
        });
      }

      const sanitized = sanitizeDoc(updated);
      return c.json({ doc: sanitized, data: sanitized, message: "Document updated successfully" });
    });

    // DELETE /api/:collection/:id - Delete document
    app.delete(`${basePath}/:id`, async (c) => {
      const { user: ctxUser, tenantId: ctxTenantID, apiKeyContext } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
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
        throw new ApiError((access.status || 403) as number, access.error || "Access denied");
      }

      const id = c.req.param("id");
      const deleted = await db.delete({
        collection: slug,
        id,
        tenantId: ctxTenantID,
      });

      if (!deleted) {
        throw new ApiError(404, `Document '${id}' not found in '${slug}'`);
      }

      return c.json({ success: true, message: `Document '${id}' deleted successfully` });
    });

  }
}
