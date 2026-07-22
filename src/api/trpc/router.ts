import type { KyroContext } from "./context.js";
import {
  createFindProcedure,
  createFindByIDProcedure,
  createCreateProcedure,
  createUpdateProcedure,
  createDeleteProcedure,
  createCountProcedure,
} from "./procedures.js";
import { checkGlobalAccess as checkGlobalAccessShared } from "../../access/checker.js";

// ============================================================================
// Global Access Check Helper
// ============================================================================

async function checkGlobalAccessTRPC(
  global: { access?: any; slug: string },
  operation: "read" | "update",
  ctx: KyroContext,
): Promise<void> {
  const result = await checkGlobalAccessShared(global, operation, {
    user: ctx.user,
    req: ctx.req,
    tenantId: ctx.tenantId,
  });
  if (!result.allowed) {
    throw new Error(result.error || "Access denied");
  }

  if (ctx.tenantId) {
    ctx.db.setTenantContext({ tenantId: ctx.tenantId, userId: ctx.user?.id ?? '', role: ctx.user?.role, isSuperAdmin: ctx.user?.role === 'super_admin' });
  }
}

// ============================================================================
// Dynamic Router Generator
// ============================================================================

export function createDynamicRouter(ctx: KyroContext) {
  const router: Record<string, any> = {};
  const collections = ctx.registry.getCollections();

  for (const collection of collections) {
    const slug = collection.slug;

    router[slug] = {
      find: createFindProcedure(ctx),
      findByID: createFindByIDProcedure(ctx),
      create: createCreateProcedure(ctx),
      update: createUpdateProcedure(ctx),
      delete: createDeleteProcedure(ctx),
      count: createCountProcedure(ctx),
    };
  }

  // Add globals
  const globals = ctx.registry.getGlobals();
  for (const global of globals) {
    const slug = global.slug;

    router[`_globals_${slug}`] = {
      get: async () => {
        await checkGlobalAccessTRPC(global, "read", ctx);

        const doc = await ctx.db.findOne({
          collection: `_globals_${slug}`,
          where: {},
          tenantId: ctx.tenantId,
        });
        return doc;
      },
      update: async (input: { data: Record<string, any> }) => {
        await checkGlobalAccessTRPC(global, "update", ctx);

        const schema = ctx.registry.getZodSchema(slug);
        const validated = schema.parse(input.data);

        const existing = await ctx.db.findOne({
          collection: `_globals_${slug}`,
          where: {},
          tenantId: ctx.tenantId,
          draft: true,
        });

        let doc;
        if (existing) {
          doc = await ctx.db.update({
            collection: `_globals_${slug}`,
            id: existing.id,
            data: validated,
            tenantId: ctx.tenantId,
          });
        } else {
          doc = await ctx.db.create({
            collection: `_globals_${slug}`,
            data: { ...validated, id: slug },
            tenantId: ctx.tenantId,
          });
        }

        return doc;
      },
    };
  }

  return router;
}

// ============================================================================
// Typed Router Interface
// ============================================================================

export interface KyroRouter {
  [collectionSlug: string]: {
    find: (input: {
      where?: Record<string, any>;
      sort?: string;
      limit?: number;
      page?: number;
      depth?: number;
      select?: string[];
      draft?: boolean;
    }) => Promise<{
      docs: any[];
      totalDocs: number;
      limit: number;
      totalPages: number;
      page: number;
      pagingCounter: number;
      hasPrevPage: boolean;
      hasNextPage: boolean;
      prevPage: number | null;
      nextPage: number | null;
    }>;
    findByID: (input: {
      id: string;
      depth?: number;
      select?: string[];
      draft?: boolean;
    }) => Promise<any>;
    create: (input: {
      data: Record<string, any>;
      depth?: number;
      select?: string[];
    }) => Promise<{ doc: any }>;
    update: (input: {
      id: string;
      data: Record<string, any>;
      depth?: number;
      select?: string[];
      baseUpdatedAt?: string;
    }) => Promise<{ doc: any }>;
    delete: (input: { id: string }) => Promise<{ doc: any; message: string }>;
    count: (input: {
      where?: Record<string, any>;
    }) => Promise<{ totalDocs: number }>;
  };
}

// ============================================================================
// Server Entry
// ============================================================================

export function createKyroServer(ctx: KyroContext): KyroRouter {
  // Check if tRPC is disabled in settings
  const apiAccess = ctx.settings?.access?.apiAccess;
  if (apiAccess?.trpcEnabled === false) {
    throw new Error("tRPC API is disabled");
  }

  return createDynamicRouter(ctx) as KyroRouter;
}
