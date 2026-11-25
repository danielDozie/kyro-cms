import type { Hono } from "hono";
import type { KyroAppOptions } from "../kyro-app.js";
import { resolveAuthContext, checkCollectionAccess } from "../utils/api-helpers.js";
import { ApiError } from "../../../utils/errors.js";
import { contentRepresentation, layoutSummary } from "../../../studio/representation.js";
import { createHash } from "node:crypto";

const revision = (data: any) => createHash("sha256").update(JSON.stringify(data)).digest("hex");

async function assertEditable(fields: any[], before: any, after: any, user: any, req: any): Promise<void> {
  for (const field of fields) {
    if (field.type === "tabs") {
      for (const tab of field.tabs || [])
        await assertEditable(
          tab.fields || [],
          tab.name ? before?.[tab.name] : before,
          tab.name ? after?.[tab.name] : after,
          user,
          req,
        );
      continue;
    }
    if (!field.name) {
      if (field.fields) await assertEditable(field.fields, before, after, user, req);
      continue;
    }
    const changed = JSON.stringify(before?.[field.name]) !== JSON.stringify(after?.[field.name]);
    if (!changed) continue;
    if (
      field.readOnly ||
      field.admin?.readOnly ||
      (field.access?.update && !(await field.access.update({ user, req, doc: before, data: after })))
    )
      throw new ApiError(403, `Field ${field.label || field.name} cannot be changed by this action`);
    if (field.fields && field.type === "group")
      await assertEditable(field.fields, before?.[field.name], after?.[field.name], user, req);
  }
}

export function mountCompositionRoutes(app: Hono, options: KyroAppOptions, authMw: any) {
  const { registry, db } = options;
  for (const collection of registry.getCollections()) {
    if (!collection.versions?.drafts) continue;
    const path = `/api/${collection.slug}/:id/composition`;
    const authorize = async (c: any) => {
      const ctx = await resolveAuthContext(c.req.raw, authMw, options.user, options.tenantId);
      if (!ctx.user) throw new ApiError(401, "Sign in to manage document composition");
      for (const operation of ["read", "update"] as const) {
        const access = await checkCollectionAccess(
          collection,
          operation,
          c.req.raw,
          ctx.user,
          ctx.tenantId,
          ctx.apiKeyContext,
          options.settings?.access?.enablePublicAccess ?? true,
          options.settings?.access?.defaultCollectionAccess ?? "none",
        );
        if (!access.allowed) throw new ApiError(403, "Access denied");
        const extraWhere = (access as any).extraWhere;
        if (extraWhere) {
          const allowed = await db.find({
            collection: collection.slug,
            tenantId: ctx.tenantId,
            where: { AND: [extraWhere, { id: { equals: c.req.param("id") } }] },
            limit: 1,
          });
          if (!allowed.docs.length) throw new ApiError(403, "Access denied for this document");
        }
      }
      const doc = await db.findByID({
        collection: collection.slug,
        id: c.req.param("id"),
        tenantId: ctx.tenantId,
        draft: true,
      });
      if (!doc) throw new ApiError(404, "Document not found");
      return { ...ctx, doc };
    };
    app.get(path, async (c) => {
      const { doc, tenantId } = await authorize(c);
      const summary = layoutSummary(doc);
      const page = 1;
      const history = await db.findVersions({
        collection: collection.slug,
        documentId: doc.id,
        tenantId,
        recoveryOnly: true,
        limit: 1,
        page,
      });
      const recoveries = history.docs.map((v: any) => ({ id: v.id, createdAt: v.createdAt || v.created_at }));
      return c.json({
        ...summary,
        recoveries,
        recoveryHasNextPage: false,
        recoveryPage: page,
        revision: revision(doc),
        recoverable: db.supportsProtectedRecovery === true,
        mode: (options.studio || options.settings?.studio)?.enabled === true ? "studio" : "headless",
      });
    });
    app.post(path, async (c) => {
      const { doc, user, tenantId } = await authorize(c);
      const body = await c.req.json();
      if (!body.revision || body.revision !== revision(doc))
        throw new ApiError(409, "The document changed. Review the conversion again.");
      if (!db.supportsProtectedRecovery || typeof db.createVersion !== "function")
        throw new ApiError(409, "This adapter does not support recovery versions");
      let next: any;
      if (body.action === "convert") {
        const summary = layoutSummary(doc);
        if (!summary.layouts && !summary.settings) throw new ApiError(400, "This document is already content only");
        next = contentRepresentation(doc);
        await assertEditable(collection.fields, doc, next, user, c.req.raw);
        // Snapshot is durable before we touch the editable draft. A failed draft write leaves recovery intact.
        const snapshot = await db.createVersion({
          collection: collection.slug,
          documentId: doc.id,
          tenantId,
          data: doc,
          status: "archived",
          recovery: true,
          createdBy: user?.id,
          changeDescription: "Protected recovery: before content-only conversion",
        });
        await db.createVersion({
          collection: collection.slug,
          documentId: doc.id,
          tenantId,
          data: { ...next, status: "draft" },
          status: "draft",
          createdBy: user?.id,
          changeDescription: `Converted to content only; recovery ${snapshot.id}`,
        });
        return c.json({
          success: true,
          recoveryVersionId: snapshot.id,
          message: "Converted draft saved. Publish when ready.",
        });
      }
      if (body.action === "recover" && body.versionId) {
        const snapshot = await db.findVersionByID({ collection: collection.slug, versionId: body.versionId, tenantId });
        if (
          !snapshot ||
          !(snapshot as any).recovery ||
          String((snapshot as any).documentId ?? (snapshot as any).document_id) !== String(doc.id)
        )
          throw new ApiError(404, "Recovery snapshot not found for this document");
        next = typeof snapshot.data === "string" ? JSON.parse(snapshot.data) : snapshot.data;
        next = { ...next };
        for (const key of ["id", "createdAt", "updatedAt", "status", "_version", "_hasUnpublishedChanges"]) {
          if (key in doc) next[key] = doc[key];
          else delete next[key];
        }
        await assertEditable(collection.fields, doc, next, user, c.req.raw);
        await db.createVersion({
          collection: collection.slug,
          documentId: doc.id,
          tenantId,
          data: { ...next, status: "draft" },
          status: "draft",
          createdBy: user?.id,
          changeDescription: `Recovered layout snapshot ${snapshot.id}`,
        });
        return c.json({
          success: true,
          message: "Layout snapshot restored as a draft. Published content is unchanged.",
        });
      }
      throw new ApiError(400, "Choose convert or recover");
    });
  }
}
