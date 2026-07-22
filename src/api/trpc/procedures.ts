import type {
  FindArgs,
  CreateArgs,
  UpdateArgs,
  DeleteArgs,
} from "../../registry/types.js";
import { runHooks } from "../../hooks/types.js";
import { checkCollectionAccess, checkGlobalAccess } from "../../access/checker.js";
import type { KyroContext } from "./context.js";
import type { Field } from "../../fields/types.js";
import { WEBHOOK_EVENTS, type WebhookEvent } from "../../webhooks/types.js";
import { populateRelationships } from "../../utils/populate.js";

const COLLECTION_EVENT_MAP: Record<
  string,
  { create: WebhookEvent; update: WebhookEvent; delete: WebhookEvent }
> = {
  _media: {
    create: WEBHOOK_EVENTS.MEDIA_UPLOAD,
    update: WEBHOOK_EVENTS.MEDIA_UPLOAD,
    delete: WEBHOOK_EVENTS.MEDIA_DELETE,
  },
};

function getWebhookEvent(
  collection: string,
  operation: "create" | "update" | "delete",
): WebhookEvent {
  const mapped = COLLECTION_EVENT_MAP[collection];
  if (mapped) return mapped[operation];
  return `collection.${operation}` as WebhookEvent;
}

async function triggerWebhook(
  ctx: KyroContext,
  event: WebhookEvent,
  payload: {
    collection: string;
    data: unknown;
    previousData?: unknown;
    operation: "create" | "update" | "delete";
  },
) {
  if (!ctx.webhookService) return;
  try {
    await ctx.webhookService.trigger(event, {
      collection: payload.collection,
      operation: payload.operation,
      data: payload.data,
      previousData: payload.previousData,
      user: ctx.user
        ? { id: ctx.user.id, email: ctx.user.email, role: ctx.user.role }
        : undefined,
      tenantId: ctx.tenantId,
    });
  } catch (err) {
    console.error(`[Webhook] Failed to trigger ${event}:`, err);
  }
}

// ============================================================================
// Data normalization helpers
// ============================================================================

function normalizeEmptyStrings(data: any, fields: Field[]): void {
  if (!data || typeof data !== 'object') return;
  for (const field of fields) {
    if (!field.name || !(field.name in data)) continue;
    const val = data[field.name];
    if (val === "") {
      const isTextual = field.type === 'text' || field.type === 'textarea' || field.type === 'code' || field.type === 'markdown' || field.type === 'email' || field.type === 'password' || field.type === 'color';
      if (!isTextual) data[field.name] = null;
    }
    if (field.type === 'tabs' && field.name && Array.isArray((field as any).tabs) && data[field.name] && typeof data[field.name] === 'object') {
      for (const tab of (field as any).tabs) {
        if (Array.isArray(tab.fields)) normalizeEmptyStrings(data[field.name], tab.fields as Field[]);
      }
    } else if ((field.type === 'group' || field.type === 'collapsible') && field.name && Array.isArray((field as any).fields) && data[field.name] && typeof data[field.name] === 'object') {
      normalizeEmptyStrings(data[field.name], (field as any).fields as Field[]);
    } else if (field.type === 'array' && field.name && Array.isArray((field as any).fields) && Array.isArray(data[field.name])) {
      for (const item of data[field.name]) {
        if (item && typeof item === 'object') normalizeEmptyStrings(item, (field as any).fields as Field[]);
      }
    } else if (field.type === 'blocks' && field.name && Array.isArray((field as any).blocks) && Array.isArray(data[field.name])) {
      for (const item of data[field.name]) {
        if (!item || typeof item !== 'object') continue;
        const blockTypeStr = item.type || item.blockType;
        if (!blockTypeStr) continue;
        const blockDef = (field as any).blocks.find((b: any) => b.slug === blockTypeStr);
        if (!blockDef || !Array.isArray(blockDef.fields)) continue;
        const target = item.data && typeof item.data === 'object' ? item.data : item;
        normalizeEmptyStrings(target, blockDef.fields as Field[]);
      }
    }
  }
}

// ============================================================================
// Access Check Helper
// ============================================================================

async function checkTRPCAccess(
  config: { access?: any; slug: string },
  operation: "read" | "create" | "update" | "delete",
  ctx: KyroContext,
): Promise<void> {
  const result = await checkCollectionAccess(config, operation, {
    user: ctx.user,
    req: ctx.req,
    tenantId: ctx.tenantId,
    apiKey: ctx.apiKey,
  });
  if (!result.allowed) {
    throw new Error(result.error || "Access denied");
  }

  // Set tenant context
  if (ctx.tenantId) {
    ctx.db.setTenantContext({ tenantId: ctx.tenantId, userId: ctx.user?.id ?? '', role: ctx.user?.role, isSuperAdmin: ctx.user?.role === 'super_admin' });
  }
}

// ============================================================================
// CRUD Procedure Builders
// ============================================================================

export function createFindProcedure(ctx: KyroContext) {
  return async (input: {
    collection: string;
    where?: Record<string, any>;
    sort?: string;
    limit?: number;
    page?: number;
    depth?: number;
    select?: string[];
    draft?: boolean;
  }) => {
    const { collection, where, sort, limit, page, depth, select, draft } = input;
    const config = ctx.registry.getCollection(collection);

    await checkTRPCAccess(config, "read", ctx);

    // Run beforeRead hooks
    if (config.hooks?.beforeRead) {
      for (const hook of config.hooks.beforeRead) {
        await hook({
          collection,
          req: ctx.req,
          user: ctx.user,
          tenantId: ctx.tenantId,
          operation: "read",
          where,
        });
      }
    }

    const isDraft = draft ?? !!ctx.user;

    // Execute query
    const result = await ctx.db.find({
      collection,
      where: where || {},
      sort,
      limit: limit || 10,
      page: page || 1,
      depth: depth || 0,
      tenantId: ctx.tenantId,
      select,
      draft: isDraft,
    });

    // Run afterRead hooks
    if (config.hooks?.afterRead) {
      for (const doc of result.docs) {
        for (const hook of config.hooks.afterRead) {
          await hook({
            collection,
            doc,
            req: ctx.req,
            user: ctx.user,
            tenantId: ctx.tenantId,
            operation: "read",
          });
        }
      }
    }

    await populateRelationships(result.docs as any[], config.fields, ctx.db, ctx.registry, 1, depth || 0);

    return result;
  };
}

export function createFindByIDProcedure(ctx: KyroContext) {
  return async (input: {
    collection: string;
    id: string;
    depth?: number;
    select?: string[];
    draft?: boolean;
  }) => {
    const { collection, id, depth, select, draft } = input;
    const config = ctx.registry.getCollection(collection);

    await checkTRPCAccess(config, "read", ctx);

    const isDraft = draft ?? !!ctx.user;

    const doc = await ctx.db.findByID({
      collection,
      id,
      depth: depth || 0,
      tenantId: ctx.tenantId,
      select,
      draft: isDraft,
    });

    if (!doc) throw new Error(`Document not found: ${collection}/${id}`);

    // Run afterRead hooks
    if (config.hooks?.afterRead) {
      for (const hook of config.hooks.afterRead) {
        await hook({
          collection,
          doc,
          req: ctx.req,
          user: ctx.user,
          tenantId: ctx.tenantId,
          operation: "read",
          id,
        });
      }
    }

    await populateRelationships([doc as any], config.fields, ctx.db, ctx.registry, 1, depth || 0);

    return doc;
  };
}

export function createCreateProcedure(ctx: KyroContext) {
  return async (input: {
    collection: string;
    data: Record<string, any>;
    depth?: number;
    select?: string[];
  }) => {
    const { collection, data, depth, select } = input;
    const config = ctx.registry.getCollection(collection);

    await checkTRPCAccess(config, "create", ctx);

    // Validate with Zod
    const schema = ctx.registry.getCreateZodSchema(collection);
    const validated = schema.parse(data);

    // Add tenantId if scoped
    if (config.tenantScoped && ctx.tenantId) {
      validated.tenantId = ctx.tenantId;
    }

    // Run beforeValidate hooks
    if (config.hooks?.beforeValidate) {
      for (const hook of config.hooks.beforeValidate) {
        const hookResult = await hook({
          collection,
          data: validated,
          req: ctx.req,
          user: ctx.user,
          tenantId: ctx.tenantId,
          operation: "create",
        });
        if (hookResult) Object.assign(validated, hookResult);
      }
    }

    // Run beforeChange hooks
    if (config.hooks?.beforeChange) {
      for (const hook of config.hooks.beforeChange) {
        const hookResult = await hook({
          collection,
          data: validated,
          req: ctx.req,
          user: ctx.user,
          tenantId: ctx.tenantId,
          operation: "create",
        });
        if (hookResult) Object.assign(validated, hookResult);
      }
    }

    // Execute create
    const doc = await ctx.db.create({
      collection,
      data: validated,
      depth: depth || 0,
      tenantId: ctx.tenantId,
      select,
    });

    // Run afterChange hooks
    if (config.hooks?.afterChange) {
      for (const hook of config.hooks.afterChange) {
        await hook({
          collection,
          doc,
          data: validated,
          req: ctx.req,
          user: ctx.user,
          tenantId: ctx.tenantId,
          operation: "create",
        });
      }
    }

    await triggerWebhook(ctx, getWebhookEvent(collection, "create"), {
      collection,
      data: doc,
      operation: "create",
    });

    return { doc };
  };
}

export function createUpdateProcedure(ctx: KyroContext) {
  return async (input: {
    collection: string;
    id: string;
    data: Record<string, any>;
    depth?: number;
    select?: string[];
    baseUpdatedAt?: string;
  }) => {
    const { collection, id, data, depth, select, baseUpdatedAt } = input;
    const config = ctx.registry.getCollection(collection);

    await checkTRPCAccess(config, "update", ctx);

    // Get original doc for hooks + conflict detection
    const originalDoc = await ctx.db.findByID({
      collection,
      id,
      tenantId: ctx.tenantId,
      draft: true,
    });

    if (!originalDoc)
      throw new Error(`Document not found: ${collection}/${id}`);

    // Revision conflict detection
    if (baseUpdatedAt && (originalDoc as Record<string, any>).updatedAt && baseUpdatedAt !== (originalDoc as Record<string, any>).updatedAt) {
      throw new Error(`Revision conflict: document has changed since ${baseUpdatedAt}. Current updatedAt: ${(originalDoc as Record<string, any>).updatedAt}`);
    }

    // Normalize empty strings for non-textual field types
    normalizeEmptyStrings(data as any, config.fields as any);

    // Validate with Zod
    const schema = ctx.registry.getUpdateZodSchema(collection);
    const validated = schema.parse(data);

    // Add tenantId if scoped
    if (config.tenantScoped && ctx.tenantId) {
      validated.tenantId = ctx.tenantId;
    }

    // Run beforeValidate hooks
    if (config.hooks?.beforeValidate) {
      for (const hook of config.hooks.beforeValidate) {
        const hookResult = await hook({
          collection,
          data: validated,
          originalDoc,
          req: ctx.req,
          user: ctx.user,
          tenantId: ctx.tenantId,
          operation: "update",
          id,
        });
        if (hookResult) Object.assign(validated, hookResult);
      }
    }

    // Run beforeChange hooks
    if (config.hooks?.beforeChange) {
      for (const hook of config.hooks.beforeChange) {
        const hookResult = await hook({
          collection,
          data: validated,
          originalDoc,
          req: ctx.req,
          user: ctx.user,
          tenantId: ctx.tenantId,
          operation: "update",
          id,
        });
        if (hookResult) Object.assign(validated, hookResult);
      }
    }

    // Determine if this is a draft save vs publish
    const isDraft = (ctx.req && typeof (ctx.req as any).headers?.get === "function" && (ctx.req as any).headers.get("x-draft") === "true") || (input as any).draft === true;
    const isDraftEnabled = config.versions?.drafts === true;
    const isAutosave = ((ctx.req as any)?.query?.autosave === "true") || ((ctx.req as any)?.url?.includes("autosave=true")) || (input as any).autosave === true;

    let doc;
    if (isDraftEnabled && isDraft) {
      // Draft save: versions table only
      // Autosave reuses a single version slot; manual draft creates a new version
      await ctx.db.createVersion({
        collection,
        documentId: id,
        data: validated,
        status: 'draft',
        autosave: isAutosave,
        createdBy: ctx.user?.id,
        tenantId: ctx.tenantId,
      });
      // Refetch merged doc
      doc = await ctx.db.findByID({ collection, id, tenantId: ctx.tenantId, draft: true });
    } else if (isDraftEnabled) {
      // Publish: main doc + versions table
      doc = await ctx.db.update({
        collection,
        id,
        data: { ...validated, status: 'published' },
        depth: depth || 0,
        tenantId: ctx.tenantId,
        select,
      });
      await ctx.db.createVersion({
        collection,
        documentId: id,
        data: validated,
        status: 'published',
        createdBy: ctx.user?.id,
        tenantId: ctx.tenantId,
      });
    } else {
      // No versions: direct update
      doc = await ctx.db.update({
        collection,
        id,
        data: validated,
        depth: depth || 0,
        tenantId: ctx.tenantId,
        select,
      });
    }

    // Run afterChange hooks
    if (config.hooks?.afterChange) {
      for (const hook of config.hooks.afterChange) {
        await hook({
          collection,
          doc,
          data: validated,
          originalDoc,
          req: ctx.req,
          user: ctx.user,
          tenantId: ctx.tenantId,
          operation: "update",
          id,
        });
      }
    }

    await triggerWebhook(ctx, getWebhookEvent(collection, "update"), {
      collection,
      data: doc,
      previousData: originalDoc,
      operation: "update",
    });

    return { doc };
  };
}

export function createDeleteProcedure(ctx: KyroContext) {
  return async (input: { collection: string; id: string }) => {
    const { collection, id } = input;
    const config = ctx.registry.getCollection(collection);

    await checkTRPCAccess(config, "delete", ctx);

    // Get original doc for hooks
    const originalDoc = await ctx.db.findByID({
      collection,
      id,
      tenantId: ctx.tenantId,
      draft: true,
    });

    if (!originalDoc)
      throw new Error(`Document not found: ${collection}/${id}`);

    // Run beforeDelete hooks
    if (config.hooks?.beforeDelete) {
      for (const hook of config.hooks.beforeDelete) {
        await hook({
          collection,
          doc: originalDoc,
          req: ctx.req,
          user: ctx.user,
          tenantId: ctx.tenantId,
          operation: "delete",
          id,
        });
      }
    }

    // Execute delete
    const doc = await ctx.db.delete({
      collection,
      id,
      tenantId: ctx.tenantId,
    });

    // Run afterDelete hooks
    if (config.hooks?.afterDelete) {
      for (const hook of config.hooks.afterDelete) {
        await hook({
          collection,
          doc,
          req: ctx.req,
          user: ctx.user,
          tenantId: ctx.tenantId,
          operation: "delete",
          id,
        });
      }
    }

    await triggerWebhook(ctx, getWebhookEvent(collection, "delete"), {
      collection,
      data: doc,
      previousData: originalDoc,
      operation: "delete",
    });

    return { doc, message: "Deleted successfully" };
  };
}

export function createCountProcedure(ctx: KyroContext) {
  return async (input: { collection: string; where?: Record<string, any> }) => {
    const { collection, where } = input;
    const config = ctx.registry.getCollection(collection);

    await checkTRPCAccess(config, "read", ctx);

    const totalDocs = await ctx.db.count({
      collection,
      where: where || {},
      tenantId: ctx.tenantId,
    });

    return { totalDocs };
  };
}
