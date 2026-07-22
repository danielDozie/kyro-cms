import type { CollectionConfig, GlobalConfig } from "../registry/types.js";
import type { Field } from "../fields/types.js";
import type { Hook } from "../hooks/types.js";

// ============================================================================
// Plugin System
// ============================================================================

export interface PluginHooks {
  beforeInit?: Hook[];
  afterInit?: Hook[];
  beforeRegisterCollections?: Hook[];
  afterRegisterCollections?: Hook[];
  beforeRegisterGlobals?: Hook[];
  afterRegisterGlobals?: Hook[];
  beforeServerStart?: Hook[];
  afterServerStart?: Hook[];
  beforeServerStop?: Hook[];
  afterServerStop?: Hook[];
}

export interface PluginCollectionExtension {
  slug: string;
  config: Partial<CollectionConfig>;
}

export interface PluginGlobalExtension {
  slug: string;
  config: Partial<GlobalConfig>;
}

export interface PluginFieldExtension {
  collectionSlug: string;
  field: Field;
}

export interface PluginAPI {
  registry: {
    getCollection: (slug: string) => CollectionConfig | undefined;
    getCollections: () => CollectionConfig[];
    getGlobal: (slug: string) => GlobalConfig | undefined;
    addCollection: (config: CollectionConfig) => void;
    addGlobal: (config: GlobalConfig) => void;
    extendCollection: (
      slug: string,
      extension: Partial<CollectionConfig>,
    ) => void;
    extendGlobal: (slug: string, extension: Partial<GlobalConfig>) => void;
    addField: (collectionSlug: string, field: Field, position?: number) => void;
  };
  hooks: {
    register: (event: string, handler: Hook) => void;
    unregister: (event: string, handler: Hook) => void;
  };
  config: {
    get: (key: string) => any;
    set: (key: string, value: any) => void;
  };
  db: any;
}

// ============================================================================
// Base Plugin Class
// ============================================================================

export abstract class KyroPlugin {
  public name: string;
  public displayName?: string;
  public adminEntry?: string;
  public version?: string;
  public description?: string;
  public hooks: PluginHooks = {};
  public collections: Partial<CollectionConfig>[] = [];
  public globals: Partial<GlobalConfig>[] = [];
  public fields: PluginFieldExtension[] = [];
  public extensions: {
    collections: PluginCollectionExtension[];
    globals: PluginGlobalExtension[];
  } = { collections: [], globals: [] };
  public adminComponents: Record<string, any> = {};
  public adminStyles: string[] = [];
  public serverMiddleware?: (app: any) => void;
  public clientMiddleware?: (req: any) => any;

  constructor(name: string) {
    this.name = name;
  }

  async init?(api: PluginAPI): Promise<void> {
    // Override in subclass
  }

  async beforeInit?(api: PluginAPI): Promise<void> {
    // Override in subclass
  }

  async afterInit?(api: PluginAPI): Promise<void> {
    // Override in subclass
  }

  getCollections?(): Partial<CollectionConfig>[] {
    return this.collections;
  }

  getGlobals?(): Partial<GlobalConfig>[] {
    return this.globals;
  }

  getHooks?(): PluginHooks {
    return this.hooks;
  }
}

// ============================================================================
// Plugin Manager
// ============================================================================

export class PluginManager {
  private plugins: Map<string, KyroPlugin> = new Map();
  private hooks: Map<string, Hook[]> = new Map();

  register(plugin: KyroPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`);
    }

    this.plugins.set(plugin.name, plugin);

    // Register hooks
    const pluginHooks = plugin.getHooks?.() || {};
    for (const [event, handlers] of Object.entries(pluginHooks)) {
      if (Array.isArray(handlers)) {
        for (const handler of handlers) {
          this.registerHook(event, handler);
        }
      }
    }


  }

  unregister(name: string): void {
    const plugin = this.plugins.get(name);
    if (!plugin) return;

    // Unregister hooks
    const pluginHooks = plugin.getHooks?.() || {};
    for (const [event, handlers] of Object.entries(pluginHooks)) {
      if (Array.isArray(handlers)) {
        for (const handler of handlers) {
          this.unregisterHook(event, handler);
        }
      }
    }

    this.plugins.delete(name);

  }

  get(name: string): KyroPlugin | undefined {
    return this.plugins.get(name);
  }

  getAll(): KyroPlugin[] {
    return Array.from(this.plugins.values());
  }

  has(name: string): boolean {
    return this.plugins.has(name);
  }

  registerHook(event: string, handler: Hook): void {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, []);
    }
    this.hooks.get(event)!.push(handler);
  }

  unregisterHook(event: string, handler: Hook): void {
    const handlers = this.hooks.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  async executeHook(event: string, args?: any): Promise<any> {
    const handlers = this.hooks.get(event) || [];
    let result = args;

    for (const handler of handlers) {
      try {
        const hookResult = await handler({ ...args, data: result });
        if (hookResult !== undefined) {
          result = hookResult;
        }
      } catch (error) {
        console.error(`[PluginManager] Error in hook "${event}":`, error);
      }
    }

    return result;
  }

  // ========================================================================
  // Collection/Field Extensions
  // ========================================================================

  getAllCollections(): Partial<CollectionConfig>[] {
    const collections: Partial<CollectionConfig>[] = [];

    for (const plugin of this.plugins.values()) {
      const pluginCollections = plugin.getCollections?.() || [];
      collections.push(...pluginCollections);
    }

    return collections;
  }

  getAllGlobals(): Partial<GlobalConfig>[] {
    const globals: Partial<GlobalConfig>[] = [];

    for (const plugin of this.plugins.values()) {
      const pluginGlobals = plugin.getGlobals?.() || [];
      globals.push(...pluginGlobals);
    }

    return globals;
  }

  getAllFields(): PluginFieldExtension[] {
    const fields: PluginFieldExtension[] = [];

    for (const plugin of this.plugins.values()) {
      fields.push(...plugin.fields);
    }

    return fields;
  }

  getAdminComponents(): Record<string, any> {
    const components: Record<string, any> = {};

    for (const plugin of this.plugins.values()) {
      Object.assign(components, plugin.adminComponents);
    }

    return components;
  }

  getAdminStyles(): string[] {
    const styles: string[] = [];

    for (const plugin of this.plugins.values()) {
      styles.push(...plugin.adminStyles);
    }

    return styles;
  }
}

// ============================================================================
// Preset Plugins
// ============================================================================

// SEO Plugin
export class SEOPlugin extends KyroPlugin {
  constructor() {
    super("seo");
    this.displayName = "Core SEO";
    this.description =
      "Advanced SEO features including sitemaps, robots.txt, and structured data";
    this.adminEntry = '@kyro-cms/admin/plugins/seo-admin';

    this.collections.push({
      slug: "seo-settings",
      label: "SEO Settings",
      fields: [
        {
          name: "sitemap",
          type: "checkbox",
          label: "Enable Sitemap",
          defaultValue: true,
        },
        { name: "robotsTxt", type: "richtext", label: "robots.txt Content" },
        {
          name: "canonicalUrl",
          type: "text",
          variant: "url" as any,
          label: "Canonical URL",
        },
        { name: "ogImage", type: "text", label: "Default OG Image URL" },
      ],
    });
  }
}

// Analytics Plugin
export class AnalyticsPlugin extends KyroPlugin {
  constructor() {
    super("analytics");
    this.displayName = "Core Analytics";
    this.description =
      "Built-in privacy-friendly analytics and dashboards";

    this.collections.push({
      slug: "analytics-events",
      label: "Analytics Events",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "properties", type: "json", label: "Event Properties" },
        { name: "timestamp", type: "date", required: true },
        { name: "userId", type: "text", label: "User ID" },
        { name: "sessionId", type: "text", label: "Session ID" },
      ],
    });

    this.adminComponents["AnalyticsDashboard"] = {};
  }
}

// Comments Plugin
export class CommentsPlugin extends KyroPlugin {
  constructor() {
    super("comments");
    this.description = "Commenting system for products and posts";

    this.collections.push({
      slug: "comments",
      label: "Comments",
      fields: [
        { name: "content", type: "richtext", required: true },
        { name: "author", type: "text", required: true },
        { name: "email", type: "email" },
        { name: "approved", type: "checkbox", defaultValue: false },
        { name: "parent", type: "text", label: "Parent Comment ID" },
        { name: "resourceType", type: "text", required: true },
        { name: "resourceId", type: "text", required: true },
      ],
    });

    this.adminComponents["CommentModeration"] = {};
  }
}

// Reviews Plugin
export class ReviewsPlugin extends KyroPlugin {
  constructor() {
    super("reviews");
    this.description = "Product reviews and ratings";

    this.collections.push({
      slug: "reviews",
      label: "Reviews",
      fields: [
        { name: "rating", type: "number", required: true, min: 1, max: 5 },
        { name: "title", type: "text" },
        { name: "content", type: "richtext", required: true },
        { name: "author", type: "relationship", relationTo: "customers" },
        {
          name: "product",
          type: "relationship",
          relationTo: "products",
          required: true,
        },
        { name: "approved", type: "checkbox", defaultValue: false },
        { name: "verified", type: "checkbox", label: "Verified Purchase" },
        {
          name: "helpful",
          type: "number",
          label: "Helpful Count",
          defaultValue: 0,
        },
      ],
    });

    this.adminComponents["ReviewModeration"] = {};
  }
}

// Wishlist Plugin
export class WishlistPlugin extends KyroPlugin {
  constructor() {
    super("wishlist");
    this.description = "Customer wishlists";

    this.collections.push({
      slug: "wishlists",
      label: "Wishlists",
      fields: [
        {
          name: "customer",
          type: "relationship",
          relationTo: "customers",
          required: true,
        },
        {
          name: "name",
          type: "text",
          label: "Wishlist Name",
          defaultValue: "My Wishlist",
        },
        {
          name: "items",
          type: "blocks",
          label: "Items",
          blocks: [
            {
              slug: "wishlist-item",
              label: "Item",
              fields: [
                {
                  name: "product",
                  type: "relationship",
                  relationTo: "products",
                },
                { name: "quantity", type: "number", defaultValue: 1 },
                { name: "addedAt", type: "date" },
                {
                  name: "priority",
                  type: "select",
                  options: [
                    { label: "Low", value: "low" },
                    { label: "Medium", value: "medium" },
                    { label: "High", value: "high" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  }
}

// Export preset plugins
export const presetPlugins = {
  SEO: SEOPlugin,
  Analytics: AnalyticsPlugin,
  Comments: CommentsPlugin,
  Reviews: ReviewsPlugin,
  Wishlist: WishlistPlugin,
};
