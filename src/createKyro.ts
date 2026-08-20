import { Registry, createRegistry } from "./registry/index.js";
import type {
  KyroConfig,
  CollectionConfig,
  GlobalConfig,
  BaseAdapter,
} from "./registry/types.js";
import { PluginManager, type KyroPlugin } from "./plugins/index.js";
import {
  KyroPubSub,
  createWSServer,
  type KyroWSServer,
} from "./api/ws/index.js";
import { createKyroApp } from "./api/rest/index.js";
import { buildGraphQLSchema, RelationLoader, depthLimit } from "./api/graphql/index.js";
import { createYoga } from "graphql-yoga";
import { createKyroServer, createContext } from "./api/trpc/index.js";
import type { User, Request } from "./hooks/types.js";
import {
  API_KEY_COLLECTION,
  validateApiKey,
  extractApiKeyFromRequest,
  createApiKeyContext,
} from "./auth/api-key.js";
import { DrizzleAdapter } from "./database/drizzle/index.js";
import { apiKeys } from "./database/drizzle/schema/auth.js";
import {
  createWebhookService,
  type WebhookService,
  WEBHOOK_COLLECTION,
  WEBHOOK_DELIVERY_COLLECTION,
} from "./webhooks/index.js";
import { s3StoragePlugin } from "./plugins/storage-s3.js";
import { cloudinaryStoragePlugin } from "./plugins/storage-cloudinary.js";
import { storageSettingsGlobal } from "./templates/settings/storage.js";

const builtinStoragePlugins: KyroPlugin[] = [
  s3StoragePlugin,
  cloudinaryStoragePlugin,
];

export {
  FIELD_DEFINITION_KEYS,
  isFieldOverrideDefinition,
  flattenFieldOverrides,
  updateFieldByPath,
  applyBlocksOverrides,
  applyTabsOverrides,
  applyCollectionOverrides,
  applyGlobalOverrides,
} from "./utils/schemaOverrides.js";

import {
  applyCollectionOverrides,
  applyGlobalOverrides,
} from "./utils/schemaOverrides.js";

// ============================================================================
// Kyro Instance
// ============================================================================

export class Kyro {
  public registry: Registry;
  public db: BaseAdapter;
  public pubsub: KyroPubSub;
  public webhookService: WebhookService;
  public settings?: Record<string, any>;
  public pluginManager: PluginManager;
  private wsServer?: KyroWSServer;
  private config: KyroConfig;

  constructor(config: KyroConfig) {
    this.config = config;
    this.registry = createRegistry();
    this.db = config.adapter || (config as KyroConfig & { db?: BaseAdapter }).db!;
    this.pubsub = new KyroPubSub(this.registry);
    this.webhookService = createWebhookService(this.db);

    this.pluginManager = new PluginManager();

    // Register built-in storage plugins first
    for (const plugin of builtinStoragePlugins) {
      this.pluginManager.register(plugin);
      this.registry.addPlugin(plugin);
    }

    // Register user plugins (overrides/adds to built-in)
    if (config.plugins) {
      for (const plugin of config.plugins) {
        this.pluginManager.register(plugin);
        this.registry.addPlugin(plugin);
      }
    }

    // Apply collection and global overrides before registering them
    if (config.collections && config.admin?.collectionOverrides) {
      applyCollectionOverrides(config.collections, config.admin.collectionOverrides);
    }
    if (config.globals && config.admin?.globalOverrides) {
      applyGlobalOverrides(config.globals, config.admin.globalOverrides);
    }

    // Register collections
    if (config.collections) {
      this.registry.addCollections(config.collections);
    }

    // Register globals
    if (config.globals) {
      this.registry.addGlobals(config.globals);
    }
  }

  async init(): Promise<void> {
    // Trigger beforeInit hook
    await this.pluginManager.executeHook("beforeInit", { kyro: this });

    // Initialize registry (runs plugin init hooks)
    await this.registry.init(this);

    // Trigger afterInit hook
    await this.pluginManager.executeHook("afterInit", { kyro: this });

    // Build storage settings global AFTER all plugins have registered their providers
    // but BEFORE db.init() so the table schema includes it
    this.registry.addGlobalPostInit(storageSettingsGlobal);

    const pluginSettingsGlobal: GlobalConfig = {
      slug: "plugin-settings",
      admin: { hidden: true },
      fields: [{ name: "states", type: "json" }],
    };
    this.registry.addGlobalPostInit(pluginSettingsGlobal);

    // Initialize database adapter
    if (!this.db) {
      throw new Error(
        `Database adapter is null — failed to load at startup. ` +
        `Check the server console for the exact error.`
      );
    }

    const systemCollection: CollectionConfig = {
      slug: API_KEY_COLLECTION,
      fields: [
        { name: "userId", type: "text", required: true },
        { name: "name", type: "text", required: true },
        { name: "key", type: "text", required: true },
        { name: "keyPrefix", type: "text", required: true },
        { name: "permissions", type: "json" },
        { name: "lastUsedAt", type: "date" },
        { name: "expiresAt", type: "date" },
      ],
    };

    const webhookCollection: CollectionConfig = {
      slug: WEBHOOK_COLLECTION,
      fields: [
        { name: "name", type: "text", required: true },
        { name: "url", type: "text", required: true },
        { name: "events", type: "json", required: true },
        { name: "collections", type: "json" },
        { name: "status", type: "text", required: true },
        { name: "secret", type: "text" },
        { name: "headers", type: "json" },
        { name: "action", type: "text" },
        { name: "config", type: "json" },
        { name: "lastTriggered", type: "date" },
        { name: "lastError", type: "text" },
      ],
    };

    const webhookDeliveryCollection: CollectionConfig = {
      slug: WEBHOOK_DELIVERY_COLLECTION,
      fields: [
        { name: "webhookId", type: "text", required: true },
        { name: "event", type: "text", required: true },
        { name: "payload", type: "json", required: true },
        { name: "attempt", type: "number", required: true },
        { name: "status", type: "text", required: true },
        { name: "responseStatus", type: "number" },
        { name: "responseBody", type: "text" },
        { name: "error", type: "text" },
        { name: "duration", type: "number" },
        { name: "deliveredAt", type: "date" },
        { name: "nextRetryAt", type: "date" },
      ],
    };

    const allGlobals = this.registry.getGlobals();

    // Register pre-defined Drizzle auth tables so the adapter queries
    // the real table instead of creating one from the collection config.
    // Only for Postgres — SQLite uses the auto-generated table.
    if (this.db instanceof DrizzleAdapter && this.db.dialect === 'postgres') {
      const drizzle = this.db as unknown as { schema?: Record<string, unknown> };
      const tableName = API_KEY_COLLECTION.replace(/-/g, '_');
      if (drizzle.schema && !drizzle.schema[tableName]) {
        drizzle.schema[tableName] = apiKeys;
      }
    }

    await this.db.init(
      [
        ...this.registry.getCollections(),
        systemCollection,
        webhookCollection,
        webhookDeliveryCollection,
      ],
      allGlobals,
    );

    // Load plugin enable/disable state from database
    await this.loadPluginState();

    // Auto-register PubSub hooks
    this.pubsub.autoRegisterHooks();


  }

  // ============================================================================
  // API Methods
  // ============================================================================

  // Load settings from globals if not already loaded
  async loadSettings() {
    if (this.settings) return this.settings;

    try {
      const doc = await this.db.findOne({
        collection: "_globals_access-settings",
        where: {},
        draft: true,
      });

      if (doc) {
        // wrap so consumers read settings.access.apiAccess
        this.settings = { access: doc };
      }
    } catch (e) {
      // Settings not found - use defaults

    }

    return this.settings || {};
  }

  async loadPluginState(): Promise<void> {
    const storageRegistry = this.registry.storageProviders;
    const pluginNames = storageRegistry.getAllPluginNames();

    let pluginStates: Record<string, boolean> = {};
    try {
      const doc = await this.db.findOne({
        collection: "_globals_plugin-settings",
        where: {},
        draft: true,
      });
      if (doc && doc.states) {
        pluginStates = doc.states;
      }
    } catch (e) {
      // Not initialized yet or empty
    }

    for (const name of pluginNames) {
      if (pluginStates[name] !== undefined) {
        storageRegistry.setPluginEnabled(name, pluginStates[name]);
      }
    }
  }

  async getREST(options?: { user?: User; req?: Request; tenantId?: string }) {
    const authObj =
      typeof this.config.auth === "object" ? this.config.auth : null;
    const authSecret = authObj?.secret;
    const checkSession = authObj?.checkSession !== false;

    return createKyroApp({
      registry: this.registry,
      db: this.db,
      authSecret,
      authAdapter: this.config.authAdapter,
      checkSession,
      ...options,
      cors: this.config.cors,
      webhookService: this.webhookService,
      settings: this.settings,
    });
  }

  getGraphQL(options?: { user?: User; req?: Request; tenantId?: string }): { fetch: (request: any, locals?: any) => Promise<Response>; schema: any } {
    const schema = buildGraphQLSchema({
      registry: this.registry,
      db: this.db,
      settings: this.settings,
    });

    // Store schema for direct access
    const yoga = createYoga({
      schema,
      context: async ({ request }) => {
        const apiKeyRaw = extractApiKeyFromRequest(request);
        let gqlUser: User | undefined;
        let apiKeyCtx: ReturnType<typeof createApiKeyContext> | undefined;

        if (apiKeyRaw && this.db) {
          const apiKeyResult = await validateApiKey(apiKeyRaw, this.db);
          if (apiKeyResult.user) {
            gqlUser = apiKeyResult.user as User;
            apiKeyCtx = createApiKeyContext(apiKeyResult);
          }
        }

        const tenantId = options?.tenantId;

        return {
          db: this.db,
          registry: this.registry,
          user: gqlUser,
          req: request,
          tenantId,
          apiKey: apiKeyCtx,
          relationLoader: new RelationLoader({ db: this.db, tenantId, user: gqlUser }),
        };
      },
      graphiql: this.config.graphQL?.disablePlayground !== true,
      plugins: [],
    });

    return {
      fetch: yoga.fetch as (request: any, locals?: any) => Promise<Response>,
      schema,
    };
  }

  getTRPC(options?: { user?: User; req?: Request; tenantId?: string }): { fetch: (request: any, locals?: any) => Promise<Response>; router: any } {
    return {
      fetch: async (request: any, locals?: any) => {
        const url = new URL(request.url);
        const path = url.pathname.replace(/^\/api\/trpc\//, "");
        const [slug, ...rest] = path.split(".");
        let procedureName = rest.join(".");
        procedureName = procedureName.replace(/\.(query|mutate|subscribe)$/, "");

        if (!slug || !procedureName) {
          return new Response(
            JSON.stringify({
              error: {
                message: "Invalid tRPC path",
                code: -32600,
                data: { code: "BAD_REQUEST", httpStatus: 400 },
              },
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const ctx = await createContext({
          db: this.db,
          registry: this.registry,
          req: request,
          user: options?.user,
          tenantId: options?.tenantId,
          settings: this.settings,
        });

        const kyroRouter = createKyroServer(ctx);

        const collectionRouter = (kyroRouter as Record<string, Record<string, Function>>)[slug];
        if (!collectionRouter) {
          return new Response(
            JSON.stringify({
              error: {
                message: `Collection '${slug}' not found`,
                code: -32601,
                data: { code: "NOT_FOUND", httpStatus: 404 },
              },
            }),
            { status: 404, headers: { "Content-Type": "application/json" } },
          );
        }

        const procedure = collectionRouter[procedureName];
        if (typeof procedure !== "function") {
          return new Response(
            JSON.stringify({
              error: {
                message: `Procedure '${procedureName}' not found`,
                code: -32601,
                data: { code: "NOT_FOUND", httpStatus: 404 },
              },
            }),
            { status: 404, headers: { "Content-Type": "application/json" } },
          );
        }

        try {
          let raw: any = {};
          if (request.method === "POST" || request.method === "PATCH") {
            raw = await request.json().catch(() => ({}));
          } else {
            const qs = new URL(request.url).searchParams.get("input");
            if (qs) {
              try { raw = JSON.parse(decodeURIComponent(qs)); } catch {}
            }
          }
          const input = raw?.["0"] ?? raw;
          const result = await procedure({ ...input, collection: slug });
          return new Response(JSON.stringify({ result: { data: result } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          const msg = err.message || "Internal error";
          const httpStatus =
            msg.includes("not found") ? 404 :
            msg.includes("denied") || msg.includes("authentication required") ? 403 :
            msg.includes("conflict") ? 409 :
            500;
          const code =
            httpStatus === 404 ? -32601 :
            httpStatus === 403 ? -32001 :
            httpStatus === 409 ? -32002 :
            -32603;
          return new Response(
            JSON.stringify({
              error: {
                message: msg,
                code,
                data: {
                  code: "INTERNAL_SERVER_ERROR",
                  httpStatus,
                },
              },
            }),
            { status: httpStatus, headers: { "Content-Type": "application/json" } },
          );
        }
      },
      router: null as unknown as any,
    };
  }

  getWS(): KyroWSServer | undefined {
    return this.wsServer;
  }

  async startWebSocket(options?: {
    port?: number;
    requireAuth?: boolean;
    verifyToken?: (token: string) => Promise<any>;
  }) {
    // Check if WebSocket is enabled in settings
    const apiAccess = this.settings?.access?.apiAccess;
    if (apiAccess?.wsEnabled === false) {

      return null;
    }

    const defaultVerifyToken = async (token: string) => {
      const result = await validateApiKey(token, this.db);
      if (!result.valid) throw new Error(result.error || "Invalid API key");
      if (!result.user) throw new Error("API key has no associated user");
      return result.user;
    };

    const port = options?.port || 8080;

    // Clean up any existing instance (e.g. from Vite HMR)
    const globalWsContainer = globalThis as typeof globalThis & { __KYRO_WS_SERVER__?: KyroWSServer };
    if (globalWsContainer.__KYRO_WS_SERVER__) {
      try {
        await globalWsContainer.__KYRO_WS_SERVER__.close();
      } catch (e) {
        // Ignore errors during close
      }
    }

    this.wsServer = createWSServer({
      pubsub: this.pubsub,
      port,
      requireAuth: options?.requireAuth ?? apiAccess?.requireAuth,
      verifyToken: options?.verifyToken || defaultVerifyToken,
    });

    globalWsContainer.__KYRO_WS_SERVER__ = this.wsServer;

    return this.wsServer;
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  async shutdown(): Promise<void> {
    await this.pluginManager.executeHook("beforeServerStop", { kyro: this });
    if (this.wsServer) {
      await this.wsServer.close();
    }
    await this.db.disconnect();
    await this.pluginManager.executeHook("afterServerStop", { kyro: this });
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createKyro(config: KyroConfig): Kyro {
  return new Kyro(config);
}

export function createKyroHandler(config: KyroConfig) {
  const kyro = createKyro(config);
  let initPromise: Promise<void> | null = null;

  return async function handler(req: Request | any, context?: any): Promise<Response> {
    if (!initPromise) {
      initPromise = kyro.init();
    }
    await initPromise;
    const app = await kyro.getREST();
    return app.fetch(req, context);
  };
}

// ============================================================================
// Convenience Exports
// ============================================================================

export {
  Registry,
  createRegistry,
  getRegistry,
  resetRegistry,
} from "./registry/index.js";
export type {
  KyroConfig,
  CollectionConfig,
  GlobalConfig,
  BaseAdapter,
  FindArgs,
  FindByIDArgs,
  CreateArgs,
  UpdateArgs,
  DeleteArgs,
  FindResult,
  CreateResult,
} from "./registry/types.js";
export type { Field, FieldType } from "./fields/index.js";
export type { AccessControl, AccessArgs, WhereClause } from "./access/index.js";
export type { Hook, HookArgs, User, Request } from "./hooks/index.js";
export {
  DrizzleAdapter,
  createDrizzleAdapter,
} from "./database/drizzle/index.js";
export {
  MongoDBAdapter,
  createMongoDBAdapter,
} from "./database/mongodb/index.js";
export { KyroPubSub, KyroWSServer, createWSServer } from "./api/ws/index.js";
export { createKyroApp } from "./api/rest/index.js";
export {
  buildGraphQLSchema,
  createGraphQLSchema,
} from "./api/graphql/index.js";
export { createKyroServer } from "./api/trpc/index.js";
export { z } from "zod";
