import { Hono } from "hono";
import type { KyroAppOptions } from "../kyro-app.js";
import { resolveAuthContext, checkCollectionAccess } from "../utils/api-helpers.js";
import { ApiError } from "../../../utils/errors.js";
import {
  getStudioSiteCapabilities,
  resolvePagePreviewUrl,
  createPreviewToken,
} from "../../../studio/capabilities.js";
import { resolveStudioReferencesServer } from "../../../studio/references.js";
import { handleFormSubmission } from "../../../studio/forms.js";
import { getDeliveryCoordinator } from "../../../studio/delivery.js";

export function mountStudioRoutes(app: Hono, options: KyroAppOptions, authMw: any) {
  const { registry, db, authSecret, user, tenantId, settings } = options;
  const studioConfig = (options as any).studio || (settings as any)?.studio;
  app.use("/api/studio/*", async (c, next) => {
    if (studioConfig?.enabled !== true && c.req.path !== "/api/studio/capabilities") throw new ApiError(403, "Studio is disabled");
    return next();
  });
  const jwtSecret =
    authSecret ||
    process.env.KYRO_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "kyro-preview-secret-key-12345";

  const deliveryCoordinator = getDeliveryCoordinator({
    mode: studioConfig?.deployment?.mode || settings?.deployment?.mode || "ssr",
    webhookUrl: studioConfig?.deployment?.webhookUrl || settings?.deployment?.webhookUrl || process.env.DEPLOY_WEBHOOK_URL,
    webhookSecret: studioConfig?.deployment?.webhookSecret || settings?.deployment?.webhookSecret || process.env.DEPLOY_WEBHOOK_SECRET,
    cachePurgeUrl: studioConfig?.deployment?.cachePurgeUrl || settings?.deployment?.cachePurgeUrl || process.env.CACHE_PURGE_URL,
    cachePurgeTags: studioConfig?.deployment?.cachePurgeTags || settings?.deployment?.cachePurgeTags,
  });

  // 1. GET /api/studio/capabilities
  app.get("/api/studio/capabilities", async (c) => {
    const host = c.req.header("host") || undefined;
    const capabilities = getStudioSiteCapabilities({
      registry,
      settings,
      studioConfig,
      host,
    });
    return c.json(capabilities);
  });

  // 2. POST /api/studio/preview-session
  app.post("/api/studio/preview-session", async (c) => {
    const { user: ctxUser, tenantId: ctxTenantId, apiKeyContext } = await resolveAuthContext(
      c.req.raw,
      authMw,
      user,
      tenantId
    );

    const body = await c.req.json().catch(() => ({}));
    const collectionSlug = body.collection || "pages";
    const documentId = body.documentId || body.id;

    if (!documentId) {
      throw new ApiError(400, "documentId is required for preview session");
    }

    const collection = registry.getCollection(collectionSlug);
    if (!collection) {
      throw new ApiError(404, `Collection "${collectionSlug}" not found`);
    }

    const access = await checkCollectionAccess(
      collection,
      "read",
      c.req.raw,
      ctxUser,
      ctxTenantId,
      apiKeyContext
    );
    if (!access.allowed) {
      throw new ApiError(403, access.error || "Permission denied to preview this document");
    }

    let doc = await db.findByID({
      collection: collectionSlug,
      id: documentId,
      tenantId: ctxTenantId,
      draft: true,
    });

    if (!doc) {
      // Allow previewing newly drafted unsaved documents if body payload contains draft state
      if (body.doc) {
        doc = { ...body.doc, id: documentId };
      } else {
        throw new ApiError(404, `Document "${documentId}" not found in "${collectionSlug}"`);
      }
    }

    if (!doc) throw new ApiError(404, "Document not found");
    const token = await createPreviewToken(collectionSlug, documentId, jwtSecret, 900);
    const host = c.req.header("host") || "localhost:4321";
    const previewOrigin = c.req.header("origin") || `http://${host}`;
    const previewUrl = await resolvePagePreviewUrl(doc, collection, previewOrigin, token, c.req.raw);

    return c.json({
      success: true,
      token,
      previewUrl,
      expiresIn: 900,
    });
  });

  // 3. POST /api/studio/resolve-references
  app.post("/api/studio/resolve-references", async (c) => {
    const { user: ctxUser, tenantId: ctxTenantId } = await resolveAuthContext(
      c.req.raw,
      authMw,
      user,
      tenantId
    );

    const body = await c.req.json().catch(() => ({}));
    const references = Array.isArray(body.references) ? body.references : [];

    const result = await resolveStudioReferencesServer(registry, db, references, {
      tenantId: ctxTenantId,
      user: ctxUser,
    });

    return c.json(result);
  });

  // 4. POST /api/forms/:id/submit & POST /api/forms/submit
  const formSubmitHandler = async (c: any) => {
    const formId = c.req.param("id") || (await c.req.json().catch(() => ({}))).formId;
    if (!formId) {
      throw new ApiError(400, "Form identifier is required");
    }

    const body = await c.req.json().catch(() => ({}));
    const ipAddress =
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";
    const userAgent = c.req.header("user-agent") || undefined;

    const result = await handleFormSubmission({
      db,
      registry,
      formIdOrSlug: formId,
      data: body,
      ipAddress,
      userAgent,
      tenantId,
    });

    return c.json(result);
  };

  app.post("/api/forms/:id/submit", formSubmitHandler);
  app.post("/api/forms/submit", formSubmitHandler);

  // 5. POST /api/studio/delivery/trigger
  app.post("/api/studio/delivery/trigger", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser || (ctxUser.role !== "admin" && ctxUser.role !== "super_admin")) {
      throw new ApiError(403, "Admin privileges required to trigger publish delivery");
    }

    const body = await c.req.json().catch(() => ({}));
    const { collection, documentId, revision, slug } = body;

    if (!collection || !documentId || !revision) {
      throw new ApiError(400, "collection, documentId, and revision are required");
    }

    const record = await deliveryCoordinator.triggerPublishDelivery({
      collection,
      documentId,
      revision,
      slug,
      docData: body.docData,
    });

    return c.json({ success: true, delivery: record });
  });

  // 6. GET /api/studio/delivery/status/:deliveryId
  app.get("/api/studio/delivery/status/:deliveryId", async (c) => {
    const deliveryId = c.req.param("deliveryId");
    const record = deliveryCoordinator.getDeliveryStatus(deliveryId);
    if (!record) {
      throw new ApiError(404, `Delivery record "${deliveryId}" not found`);
    }
    return c.json({ delivery: record });
  });

  // 7. POST /api/studio/delivery/retry
  app.post("/api/studio/delivery/retry", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser || (ctxUser.role !== "admin" && ctxUser.role !== "super_admin")) {
      throw new ApiError(403, "Admin privileges required to retry delivery");
    }

    const body = await c.req.json().catch(() => ({}));
    const deliveryId = body.deliveryId;
    if (!deliveryId) {
      throw new ApiError(400, "deliveryId is required");
    }

    const updated = await deliveryCoordinator.retryDelivery(deliveryId);
    return c.json({ success: true, delivery: updated });
  });
}
