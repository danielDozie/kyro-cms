import { contentRepresentation, representationMode } from "../../../studio/representation.js";
import { mountCompositionRoutes } from "./composition-routes.js";
import { Hono } from "hono";
import { verify, sign } from "hono/jwt";
import type { KyroAppOptions } from "../kyro-app.js";
import {
  checkCollectionAccess,
  resolveAuthContext
} from "../utils/api-helpers.js";
import { populateRelationships } from "../../../utils/populate.js";
import { sanitizeDoc } from "../../../utils/sanitize.js";
import { maskRestrictedFields } from "../../../utils/field-helpers.js";
import { ApiError } from "../../../utils/errors.js";
import { HookPipeline } from "../../../hooks/HookPipeline.js";
import type { BaseAdapter } from "../../../registry/types.js";
import { enforceStudioValidation } from "../../../studio/validation.js";
import { checkOptimisticConcurrency } from "../../../studio/occ.js";
import { getDeliveryCoordinator } from "../../../studio/delivery.js";
import { randomUUID } from "crypto";

export function mountCollectionRoutes(app: Hono, options: KyroAppOptions, authMw: any) {
  const {
    registry,
    db,
    authSecret,
    user,
    tenantId,
    settings,
  } = options;

  const studioEnabled = (options.studio || settings?.studio)?.enabled === true;
  mountCompositionRoutes(app, options, authMw);
  // Delivery defaults change with mode; canonical editor data requires an authenticated session.
  app.use("/api/*", async (c, next) => {
    const slug = c.req.path.split("/")[2];
    if (!registry.hasCollection(slug) && slug !== "globals") return next();
    const ctx = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    const editor = c.req.header("x-kyro-admin") === "true" && !!ctx.user && !ctx.apiKeyContext;
    let mode: "full" | "content";
    try { mode = representationMode(studioEnabled, c.req.query("representation")); }
    catch (error) { throw new ApiError(400, (error as Error).message); }
    await next();
    if (c.res.status < 400 && c.res.headers.get("content-type")?.includes("application/json")) {
      c.header("Vary", "Cookie, Authorization, x-kyro-admin");
      if (mode === "content" && (!editor || c.req.query("representation") === "content")) {
        const body = await c.res.json();
        c.res = new Response(JSON.stringify(contentRepresentation(body)), { status: c.res.status, headers: c.res.headers });
        c.res.headers.delete("Content-Length");
      }
    }
  });

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

    // ALL /api/:collection/semantic-search
    app.all(`${basePath}/semantic-search`, async (c) => {
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

      let queryVector: number[] = [];
      let queryText = "";
      let limit = 10;
      let threshold = 0.4;

      if (c.req.method === "POST") {
        const body = await c.req.json().catch(() => ({}));
        queryVector = body.vector || [];
        queryText = body.q || body.query || "";
        limit = body.limit ? parseInt(String(body.limit)) : 10;
        threshold = body.threshold ? parseFloat(String(body.threshold)) : 0.4;
      } else {
        const url = new URL(c.req.url);
        queryText = url.searchParams.get("q") || url.searchParams.get("query") || "";
        limit = parseInt(url.searchParams.get("limit") || "10");
        threshold = parseFloat(url.searchParams.get("threshold") || "0.4");
      }

      const findRes = await db.find({
        collection: slug,
        limit: 200,
        tenantId: ctxTenantID,
      });

      const docs = findRes.docs || [];
      const embeddingFields = collection.fields.filter((f: any) => f.type === "embedding");
      const embFieldName = embeddingFields[0]?.name || "embedding";

      const scoredDocs = docs.map((doc: any) => {
        const docVector = doc[embFieldName];
        let score = 0;
        if (Array.isArray(docVector) && Array.isArray(queryVector) && queryVector.length > 0) {
          let dotProduct = 0;
          let normA = 0;
          let normB = 0;
          for (let i = 0; i < Math.min(docVector.length, queryVector.length); i++) {
            dotProduct += docVector[i] * queryVector[i];
            normA += docVector[i] * docVector[i];
            normB += queryVector[i] * queryVector[i];
          }
          score = normA && normB ? dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
        } else if (queryText) {
          const title = String(doc.title || doc.name || "").toLowerCase();
          const content = String(doc.content || doc.description || "").toLowerCase();
          const q = queryText.toLowerCase();
          if (title.includes(q)) score = 0.9;
          else if (content.includes(q)) score = 0.7;
          else score = 0.1;
        }
        return { doc, score };
      });

      const matched = await Promise.all(
        scoredDocs
          .filter((item) => item.score >= threshold)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .map(async (item) => {
            const masked = await maskRestrictedFields(item.doc, collection.fields, ctxUser, c.req.raw, "read");
            return { ...masked, _similarity: Math.round(item.score * 1000) / 1000 };
          })
      );

      return c.json({
        docs: matched,
        totalDocs: matched.length,
        query: queryText || undefined,
      });
    });

    // GET /api/:collection - List
    app.get(basePath, async (c) => {
      const { user: ctxUser, tenantId: ctxTenantID, apiKeyContext } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      const url = new URL(c.req.url);
      const draftParam = url.searchParams.get("draft");
      const kyroToken = url.searchParams.get("kyroToken");
      let previewAllowed = false;
      const jwtSecret = authSecret || process.env.KYRO_AUTH_SECRET || process.env.AUTH_SECRET || "kyro-preview-secret";

      if (draftParam === "true" && kyroToken && jwtSecret) {
        try {
          const decoded = await verify(kyroToken, jwtSecret, "HS256");
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
      let where: Record<string, any> | undefined;
      if (whereParam) {
        try {
          where = JSON.parse(decodeURIComponent(whereParam));
        } catch (e) {
          throw new ApiError(400, "Invalid JSON in where clause");
        }
      }

      const searchParam = url.searchParams.get("search") || url.searchParams.get("q");
      if (searchParam && searchParam.trim()) {
        const queryTerm = searchParam.trim();
        const searchableFields = (collection.fields || [])
          .filter(
            (f) =>
              f.name &&
              f.name !== "id" &&
              (f.type === "text" ||
                f.type === "email" ||
                f.type === "textarea" ||
                f.type === "select" ||
                f.type === "radio" ||
                f.indexed) &&
              !f.admin?.hidden,
          )
          .map((f) => f.name!);

        if (searchableFields.length > 0) {
          const searchOr = searchableFields.map((f) => ({ [f]: { contains: queryTerm } }));
          if (where) {
            where = { AND: [where, { OR: searchOr }] };
          } else {
            where = { OR: searchOr };
          }
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
        if (versionRec.recovery) throw new ApiError(400, "Use composition recovery to restore this protected snapshot as a draft");
        if (!studioEnabled) {
          const existingDoc = await db.findByID({ collection: slug, id, tenantId: ctxTenantID, draft: true });
          const restoreData = typeof versionRec.data === "string" ? JSON.parse(versionRec.data) : versionRec.data;
          enforceStudioValidation(restoreData, collection, { studioEnabled: false, originalDoc: existingDoc as any });
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

      const targetVersion = await db.findVersionByID({ collection: slug, versionId, tenantId: ctxTenantID });
      if (targetVersion?.recovery) throw new ApiError(400, "Use composition recovery to restore this protected snapshot as a draft");
      if (!studioEnabled && targetVersion) {
        const existingDoc = await db.findByID({ collection: slug, id, tenantId: ctxTenantID, draft: true });
        enforceStudioValidation(targetVersion.data as any, collection, { studioEnabled: false, originalDoc: existingDoc as any });
      }
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
        if (versionRec.recovery) throw new ApiError(400, "Use composition recovery to restore this protected snapshot as a draft");
        if (!studioEnabled) {
          const existingDoc = await db.findByID({ collection: slug, id, tenantId: ctxTenantID, draft: true });
          const restoreData = typeof versionRec.data === "string" ? JSON.parse(versionRec.data) : versionRec.data;
          enforceStudioValidation(restoreData, collection, { studioEnabled: false, originalDoc: existingDoc as any });
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

    // POST /api/:collection/preview-url - Generate preview URL for draft/live viewing
    app.post(`${basePath}/preview-url`, async (c) => {
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

      const body = await c.req.json().catch(() => ({}));
      let doc: Record<string, any> = body || {};

      if (doc.id && !doc.slug) {
        try {
          const existing = await db.findByID({ collection: collection.slug, id: doc.id, tenantId: ctxTenantID });
          if (existing) {
            doc = { ...existing, ...doc };
          }
        } catch {
          // fallback to body
        }
      }

      let token: string | undefined;
      const jwtSecret = authSecret || process.env.KYRO_AUTH_SECRET || process.env.AUTH_SECRET || "kyro-preview-secret";
      if (jwtSecret) {
        try {
          token = await sign(
            {
              type: "preview",
              collection: collection.slug,
              id: doc.id,
              exp: Math.floor(Date.now() / 1000) + 60 * 60,
            },
            jwtSecret,
            "HS256"
          );
        } catch (e) {
          console.warn("Failed to sign preview token:", e);
        }
      }

      let previewUrl = "";
      if (typeof collection.admin?.preview === "function") {
        try {
          previewUrl = await collection.admin.preview(doc, { req: c.req.raw, token });
        } catch (err) {
          console.error(`[Kyro Preview] Error in custom preview function for ${collection.slug}:`, err);
        }
      }

      if (!previewUrl) {
        const identifier = doc.slug || doc.id || "";
        previewUrl = identifier ? `/${collection.slug}/${identifier}` : `/${collection.slug}`;
        if (token) {
          const separator = previewUrl.includes("?") ? "&" : "?";
          previewUrl += `${separator}draft=true&kyroToken=${token}`;
        }
      }

      return c.json({ url: previewUrl });
    });

    // GET /api/:collection/:id - Single document
    app.get(`${basePath}/:id`, async (c) => {
      const { user: ctxUser, tenantId: ctxTenantID, apiKeyContext } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
      const url = new URL(c.req.url);
      const draftParam = url.searchParams.get("draft");
      const kyroToken = url.searchParams.get("kyroToken");
      let previewAllowed = false;
      const jwtSecret = authSecret || process.env.KYRO_AUTH_SECRET || process.env.AUTH_SECRET || "kyro-preview-secret";

      if (draftParam === "true" && kyroToken && jwtSecret) {
        try {
          const decoded = await verify(kyroToken, jwtSecret, "HS256");
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

      if (!body.id) {
        body.id = randomUUID();
      }

      // Enforce Studio recursive schema, layout grammar, and resource limits
      body = enforceStudioValidation(body, collection, {
        studioEnabled: studioEnabled,
        isPublish: body.status === "published",
        user: ctxUser,
        req: c.req.raw as any,
      });

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

      const docToReturn = collection.versions
        ? (await db.findByID({ collection: slug, id: (created as any)?.id || body.id, tenantId: ctxTenantID, draft: true })) || created
        : created;
      const sanitized = sanitizeDoc(docToReturn);
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

      const existing = await db.findByID({ collection: slug, id, tenantId: ctxTenantID, draft: true });
      if (!existing) {
        throw new ApiError(404, `Document '${id}' not found in '${slug}'`);
      }

      // Concurrency check (OCC)
      const baseUpdatedAt = body.baseUpdatedAt || c.req.header("x-base-updated-at") || c.req.header("if-match") || null;
      const baseRevision = body.baseRevision || c.req.header("x-base-revision") || null;
      const force = body.force === true || c.req.header("x-force") === "true";

      checkOptimisticConcurrency({
        existingDoc: existing,
        baseUpdatedAt,
        baseRevision,
        force,
      });

      // Remove internal OCC / transient parameters from persisting payload
      delete body.baseUpdatedAt;
      delete body.baseRevision;
      delete body.force;
      delete body.updatedAt;
      delete body.createdAt;

      const isPublishing = body.status === "published" || (!isDraft && body.status !== "draft" && (existing.status === "draft" || body.status === "published"));

      // Enforce Studio recursive schema, layout grammar, and resource limits
      body = enforceStudioValidation(body, collection, {
        studioEnabled: studioEnabled,
        isPublish: isPublishing,
        user: ctxUser,
        req: c.req.raw as any,
        originalDoc: existing,
      });

      // Execute beforeChange collection hooks
      if (collection.hooks?.beforeChange && collection.hooks.beforeChange.length > 0) {
        const pipeline = new HookPipeline(collection.hooks.beforeChange);
        body = await pipeline.execute({
          data: body,
          originalDoc: existing,
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

        if (!isAutosave && (body.status === "published" || isPublishing)) {
          if (typeof (db as any).clearAutosave === "function") {
            try {
              await (db as any).clearAutosave(slug, id, ctxTenantID);
            } catch (e) {
              console.warn(`[clearAutosave] Failed clearing autosave for ${slug}/${id}:`, e);
            }
          }
        }
      }

      // If published, trigger delivery coordinator
      if (isPublishing) {
        try {
          const coordinator = getDeliveryCoordinator();
          await coordinator.triggerPublishDelivery({
            collection: slug,
            documentId: id,
            revision: String(updated?.updatedAt || Date.now()),
            slug: updated?.slug,
            docData: updated,
          });
        } catch (e) {
          console.warn(`[PublishDelivery] Trigger failed for ${slug}/${id}:`, e);
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
