import { Hono } from "hono";
import type { KyroAppOptions } from "../kyro-app.js";
import { resolveAuthContext, checkCollectionAccess } from "../utils/api-helpers.js";
import { hasPermission } from "../../../auth/rbac/checker.js";
import { ApiError } from "../../../utils/errors.js";
import { populateRelationships } from "../../../utils/populate.js";
import type { BaseAdapter } from "../../../registry/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { AuthMiddlewareResult } from "../auth-middleware.js";

export function mountSystemRoutes(
  app: Hono,
  options: KyroAppOptions,
  authMw: (req: Request) => Promise<AuthMiddlewareResult>,
): void {
  const { registry, db, user, tenantId, webhookService, settings, authAdapter: sessionAuthAdapter } = options;
  const enablePublicAccess = settings?.access?.enablePublicAccess ?? false;
  const defaultCollectionAccess = settings?.access?.defaultCollectionAccess ?? "none";

  // Webhook management
  app.get("/api/webhooks/actions", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser || !hasPermission(ctxUser as any, "users:read")) {
      throw new ApiError(403, "Forbidden");
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
  });

  app.get("/api/webhooks", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser || !hasPermission(ctxUser as any, "users:read")) {
      throw new ApiError(403, "Forbidden");
    }
    if (!webhookService) throw new ApiError(503, "Webhook service not available");
    const webhooks = await webhookService.getWebhooks();
    return c.json({ docs: webhooks });
  });

  app.post("/api/webhooks", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser || !hasPermission(ctxUser as any, "users:admin")) {
      throw new ApiError(403, "Forbidden");
    }
    if (!webhookService) throw new ApiError(503, "Webhook service not available");
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
  });

  app.get("/api/webhooks/:id", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser || !hasPermission(ctxUser as any, "users:read")) {
      throw new ApiError(403, "Forbidden");
    }
    if (!webhookService) throw new ApiError(503, "Webhook service not available");
    const id = c.req.param("id");
    const webhook = await webhookService.getWebhookById(id);
    if (!webhook) throw new ApiError(404, "Webhook not found");
    return c.json(webhook);
  });

  app.patch("/api/webhooks/:id", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser || !hasPermission(ctxUser as any, "users:admin")) {
      throw new ApiError(403, "Forbidden");
    }
    if (!webhookService) throw new ApiError(503, "Webhook service not available");
    const id = c.req.param("id");
    const body = await c.req.json();
    const updated = await webhookService.updateWebhook(id, body);
    if (!updated) throw new ApiError(404, "Webhook not found");
    await sessionAuthAdapter?.createAuditLog({
      action: "webhook_update",
      userId: ctxUser.id,
      resource: "webhook",
      resourceId: id,
      success: true,
      metadata: { name: updated.name },
    });
    return c.json(updated);
  });

  app.delete("/api/webhooks/:id", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser || !hasPermission(ctxUser as any, "users:admin")) {
      throw new ApiError(403, "Forbidden");
    }
    if (!webhookService) throw new ApiError(503, "Webhook service not available");
    const id = c.req.param("id");
    const existing = await webhookService.getWebhookById(id);
    if (!existing) throw new ApiError(404, "Webhook not found");
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
  });

  app.post("/api/webhooks/:id/test", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser || !hasPermission(ctxUser as any, "users:admin")) {
      throw new ApiError(403, "Forbidden");
    }
    if (!webhookService) throw new ApiError(503, "Webhook service not available");
    const id = c.req.param("id");
    const result = await webhookService.testWebhook(id);
    if (!result) throw new ApiError(404, "Webhook not found");
    return c.json(result);
  });

  app.get("/api/webhooks/:id/history", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser || !hasPermission(ctxUser as any, "users:read")) {
      throw new ApiError(403, "Forbidden");
    }
    if (!webhookService) throw new ApiError(503, "Webhook service not available");
    const id = c.req.param("id");
    const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
    const history = await webhookService.getDeliveryHistory(id, limit);
    return c.json({ docs: history });
  });

  // E-Commerce Analytics (admin only)
  app.get("/api/analytics", async (c) => {
    const { user: ctxUser, tenantId: ctxTenantID } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser) throw new ApiError(401, "Authentication required");
    const isAdmin = ctxUser.role === "admin" || ctxUser.role === "super_admin";
    if (!isAdmin) throw new ApiError(403, "Unauthorized");
    const result = await db.find({ collection: "orders", where: {}, limit: 1000, page: 1, tenantId: ctxTenantID });
    const orders = result.docs || [];
    const storeSettings = await db.findOne({ collection: "_globals_store-settings", where: {}, tenantId: ctxTenantID });
    const currencyCode = storeSettings?.currency?.code || storeSettings?.currency || "USD";
    const revenueByDate: Record<string, number> = {};
    const ordersByDate: Record<string, number> = {};
    const ordersByStatus: Record<string, number> = {};
    orders.forEach((order: any) => {
      const rawDate = order.createdAt || order.updatedAt;
      const date = rawDate ? new Date(rawDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
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
  });

  // Global search
  app.get("/api/search", async (c) => {
    const query = c.req.query("q") || "";
    const collectionsParam = c.req.query("collections") || "";
    const limit = Math.min(parseInt(c.req.query("limit") || "10"), 50);
    if (!query || query.length < 2) {
      return c.json({ results: [], message: "Query too short" });
    }
    const { user: ctxUser, tenantId: ctxTenantID } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
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
        const orConditions: Record<string, any>[] = searchableFields.map((field) => ({
          [field]: { like: `%${query}%` }
        }));

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
            searchableFields.find((f) => f === "title" || f === "name" || f === "heading" || f === "slug");
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
  });

  // Schema introspection endpoints
  app.get("/api/kyro/schema", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser) throw new ApiError(401, "Authentication required");

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

  app.get("/api/collections", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser) throw new ApiError(401, "Authentication required");
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
}

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

function extractFields(fields: any[]): any[] {
  return fields.map((f: any) => {
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

    if ((f.type === "group" || f.type === "row" || f.type === "collapsible") && f.fields) {
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
}
