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

  for (const slug of Object.keys(registry.getCollections())) {
    const collection = registry.getCollection(slug);
    if (!collection) continue;
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
          throw new ApiError(400, "Invalid where clause JSON");
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
      
      return c.json({
        data: (findRes.docs || []).map(sanitizeDoc),
        meta: { total: totalDocs, page, limit, totalPages: Math.ceil(totalDocs / limit) },
      });
    });

  }
}
