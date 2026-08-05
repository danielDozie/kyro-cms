import type { APIRoute } from "astro";
import { createKyro } from "./createKyro.js";
import { autoBootstrap } from "./auth/bootstrap.js";
import { DrizzleAdapter } from "./database/drizzle/adapter.js";
import { PostgresAuthAdapter } from "./database/drizzle/postgres-auth-adapter.js";
import { D1AuthAdapter } from "./database/drizzle/d1-auth-adapter.js";
import { LocalAdapter } from "./database/local/adapter.js";
import { SQLiteAuthAdapter } from "./auth/sqlite-adapter.js";
import { MongoDBAdapter } from "./database/mongodb/adapter.js";
import { MongoDBAuthAdapter } from "./database/mongodb/mongo-auth-adapter.js";
import { logger } from "./utils/logger.js";
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
    
    // Check adapter types robustly against minification
    const dbAdapter = config.adapter;
    const isLocalAdapter = dbAdapter && !dbAdapter.dialect && typeof dbAdapter.connect === 'function';
    
    // Hot-swap to D1 on Cloudflare BEFORE initialization.
    // The project config (kyro:config) is evaluated at module load time, before the
    // D1 binding is available on globalThis, so config.adapter may be null here.
    // When the D1 binding is present and no explicit remote adapter was configured,
    // override to a D1-backed DrizzleAdapter.
    if ((globalThis as any).DB && (!dbAdapter || isLocalAdapter)) {
      const d1Client = (globalThis as any).DB;
      
      // Override adapter to DrizzleAdapter with D1
      config.adapter = new DrizzleAdapter({ type: 'sqlite', client: d1Client });
      
      logger.info("Hot-swapped to D1 DrizzleAdapter");
    }
    
    kyroInstance = createKyro(config);
    await kyroInstance.init();

    // Check if we need to hot-swap the auth adapter as well
    const activeDb = config.adapter;
    const isDrizzleAdapter = activeDb && activeDb.dialect && (activeDb.dialect === "postgres" || activeDb.dialect === "sqlite");
    const isMongoAdapter = activeDb && activeDb.dialect === "mongodb";
    
    let bootstrapAuthAdapter;
    
    if (isDrizzleAdapter) {
      if ((activeDb as any).dialect === "postgres") {
        bootstrapAuthAdapter = new PostgresAuthAdapter({ db: (activeDb as any).client });
      } else if ((activeDb as any).dialect === "sqlite") {
        bootstrapAuthAdapter = new D1AuthAdapter({ db: (activeDb as any).rawClient || (activeDb as any).client });
      }
    } else if (isLocalAdapter && !(globalThis as any).DB) {
      const authDbPath = process.env.KYRO_AUTH_DB_PATH || "./data/auth.db";
      bootstrapAuthAdapter = new SQLiteAuthAdapter({ path: authDbPath });
    } else if (isMongoAdapter) {
      bootstrapAuthAdapter = new MongoDBAuthAdapter({ adapter: activeDb });
    }

    if (bootstrapAuthAdapter?.connect) {
      try { await bootstrapAuthAdapter.connect(); } catch (e) { logger.warn("Auth connect warning:", e); }
    }

    try { await kyroInstance.loadSettings(); } catch (e) { logger.warn("loadSettings warning:", e); }
    try { await autoBootstrap(bootstrapAuthAdapter); } catch (e) { logger.warn("autoBootstrap warning:", e); }

    // Expose instance globally so admin SSR can read DB directly
    (globalThis as any).__KYRO_INSTANCE__ = kyroInstance;

  } catch (err) {
    kyroInstance = null;
    initPromise = null;
    logger.error("Init failed, will retry:", err);
    throw err;
  }
}

export async function warmKyroInstance(context?: any) {
  let runtimeEnv: any = (globalThis as any).DB ? globalThis : null;

  // Astro 7 / @astrojs/cloudflare v14: locals.runtime.env throws (removed in v6),
  // and locals.cfContext is the ExecutionContext, not the bindings.
  // The canonical way to read bindings in workerd is `import { env } from "cloudflare:workers"`.
  // Dynamic import + try/catch keeps this safe on the Node runtime too.
  try {
    const { env: cfEnv } = await import("cloudflare:workers");
    if (cfEnv) runtimeEnv = cfEnv;
  } catch {}

  if (context) {
    try {
      runtimeEnv = (context.locals as any)?.cfContext?.env || (context as any)?.env || runtimeEnv;
    } catch (err: any) {
      // Ignore Astro v6 error: Astro.locals.runtime.env has been removed
    }
  }

  if (!runtimeEnv) {
    try {
      runtimeEnv = process.env;
    } catch {}
  }

  if (runtimeEnv?.DB) {
    (globalThis as any).DB = runtimeEnv.DB;
  }
  
  if (runtimeEnv?.STORAGE_BUCKET) {
    (globalThis as any).STORAGE_BUCKET = runtimeEnv.STORAGE_BUCKET;
  }

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

function checkAccessEnabled(key: keyof typeof ACCESS_DEFAULTS): boolean {
  if (!kyroInstance) return ACCESS_DEFAULTS[key] ?? true;
  return kyroInstance.settings?.access?.apiAccess?.[key] ?? ACCESS_DEFAULTS[key] ?? true;
}

export const ALL: APIRoute = async (context) => {
  if (!kyroInstance) {
    try {
      await Promise.race([
        warmKyroInstance(context),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("Initialization timeout")), 30000)
        ),
      ]);
    } catch (err: any) {
      console.error("[Kyro API] Warm error:", err?.stack || err?.message || err);
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

  try {
    const url = new URL(context.request.url);
    const path = url.pathname;
    const p = __KYRO_API_PATH__;

    if (path === `${p}/graphql` && typeof kyroInstance.getGraphQL === "function") {
      if (!checkAccessEnabled("graphqlEnabled")) {
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
      if (!checkAccessEnabled("trpcEnabled")) {
        return new Response(JSON.stringify({ error: "tRPC is disabled" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
      const trpc = kyroInstance.getTRPC();
      const res = await trpc.fetch(context.request, context.locals);
      return new Response(res.body, res);
    }

    const app = await kyroInstance.getREST();
    return await app.fetch(context.request, context.locals);
  } catch (err: any) {
    console.error("[Kyro API Execution Error]:", err?.stack || err?.message || err);
    return new Response(JSON.stringify({
      error: "Internal Server Error",
      message: err?.message || String(err),
      stack: err?.stack,
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
