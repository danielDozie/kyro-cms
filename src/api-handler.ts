import type { APIRoute } from "astro";
import { createKyro } from "./createKyro.js";
import { autoBootstrap } from "./auth/bootstrap.js";
import { DrizzleAdapter } from "./database/drizzle/adapter.js";
import { PostgresAuthAdapter } from "./database/drizzle/postgres-auth-adapter.js";
import { LocalAdapter } from "./database/local/adapter.js";
import { SQLiteAuthAdapter } from "./auth/sqlite-adapter.js";
import { MongoDBAdapter } from "./database/mongodb/adapter.js";
import { MongoDBAuthAdapter } from "./database/mongodb/mongo-auth-adapter.js";
// @ts-ignore - handled by vite alias
import projectConfig from "kyro:config";

declare var __KYRO_API_PATH__: string;

export let kyroInstance: any = null;
let initPromise: Promise<void> | null = null;

async function doInit(): Promise<void> {
  if (kyroInstance) return;

  // Shut down old instance from previous HMR
  if ((globalThis as any).__KYRO_INSTANCE__) {
    try {
      await (globalThis as any).__KYRO_INSTANCE__.shutdown();
    } catch (e) {
      // Ignore
    }
  }

  try {
    const config = projectConfig.default || projectConfig;
    kyroInstance = createKyro(config);
    await kyroInstance.init();
    await kyroInstance.loadSettings();

    const db = kyroInstance.db;
    let bootstrapAuthAdapter: any = undefined;
    
    if (db instanceof DrizzleAdapter) {
      if (db.dialect === "postgres") {
        bootstrapAuthAdapter = new PostgresAuthAdapter({ db: db.client });
      } else if (db.dialect === "sqlite") {
        const authDbPath = process.env.KYRO_AUTH_DB_PATH || "./data/auth.db";
        bootstrapAuthAdapter = new SQLiteAuthAdapter({ path: authDbPath });
      }
    } else if (db instanceof LocalAdapter) {
      const authDbPath = process.env.KYRO_AUTH_DB_PATH || "./data/auth.db";
      bootstrapAuthAdapter = new SQLiteAuthAdapter({ path: authDbPath });
    } else if (db instanceof MongoDBAdapter) {
      bootstrapAuthAdapter = new MongoDBAuthAdapter({ db: db.db });
    }

    if (bootstrapAuthAdapter?.connect) {
      await bootstrapAuthAdapter.connect();
    }

    const result = await autoBootstrap(bootstrapAuthAdapter);
    if (result?.success) {
    }

    // Auto-start WebSocket (checks settings.access.apiAccess.wsEnabled internally)
    if (typeof kyroInstance.startWebSocket === "function") {
      kyroInstance.startWebSocket().catch((err: any) => {
        console.error("[Kyro] WebSocket auto-start failed:", err);
      });
    }

    // Expose instance globally so admin SSR can read DB directly
    (globalThis as any).__KYRO_INSTANCE__ = kyroInstance;

  } catch (err) {
    kyroInstance = null;
    initPromise = null;
    console.error("[Kyro API] Init failed, will retry:", err);
    throw err;
  }
}

export async function warmKyroInstance(): Promise<void> {
  if (!initPromise) {
    initPromise = doInit();
  }
  await initPromise;
}

const ACCESS_DEFAULTS: Record<string, boolean> = {
  graphqlEnabled: false,
  trpcEnabled: false,
  wsEnabled: false,
  requireAuth: false,
};

async function checkAccessEnabled(key: string): Promise<boolean> {
  try {
    const doc = await kyroInstance!.db.findOne({
      collection: "_globals_access-settings",
      where: {},
      draft: true,
    });
    return doc?.apiAccess?.[key] ?? ACCESS_DEFAULTS[key] ?? true;
  } catch {
    return true;
  }
}

export const ALL: APIRoute = async (context) => {
  if (!kyroInstance) {
    if (!initPromise) {
      initPromise = doInit();
    }

    try {
      await Promise.race([
        initPromise,
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("Initialization timeout")), 30000)
        ),
      ]);
    } catch {
      return new Response(JSON.stringify({
        error: "Service Unavailable",
        message: "Kyro CMS is still starting up. Please try again in a moment.",
      }), {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "5",
        },
      });
    }
  }

  const url = new URL(context.request.url);
  const path = url.pathname;
  const p = __KYRO_API_PATH__;

  if (path === `${p}/graphql` && typeof kyroInstance.getGraphQL === "function") {
    if (!(await checkAccessEnabled("graphqlEnabled"))) {
      return new Response(JSON.stringify({ error: "GraphQL is disabled" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
    const yoga = kyroInstance.getGraphQL();
    const res = await yoga.fetch(context.request, context.locals);
    return new Response(res.body, res);
  }

  if (path.startsWith(`${p}/trpc/`) && typeof kyroInstance.getTRPC === "function") {
    if (!(await checkAccessEnabled("trpcEnabled"))) {
      return new Response(JSON.stringify({ error: "tRPC is disabled" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
    const trpc = kyroInstance.getTRPC();
    const res = await trpc.fetch(context.request, context.locals);
    return new Response(res.body, res);
  }

  const app = kyroInstance.getREST();
  return app.fetch(context.request, context.locals);
};
