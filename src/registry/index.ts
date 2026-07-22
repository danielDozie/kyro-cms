import type {
  CollectionConfig,
  GlobalConfig,
  BaseAdapter,
} from "./types.js";
import type { KyroPlugin } from "../plugins/index.js";
import type { Field } from "../fields/types.js";
import { generateSEOFields } from "../fields/seo.js";
import {
  validateConfig,
  validateCollection,
  validateGlobal,
} from "./validator.js";
import {
  collectionToZod,
  collectionToCreateZod,
  collectionToUpdateZod,
  collectionToWhereZod,
  globalToZod,
  globalToUpdateZod,
  fieldToZod,
} from "./zod-builder.js";
import type { ZodTypeAny } from "zod";
import {
  getDefaultRegistry,
  type StorageProviderRegistry,
} from "../storage/registry.js";

// ============================================================================
// Registry Class
// ============================================================================

export class Registry {
  public storageProviders: StorageProviderRegistry = getDefaultRegistry();
  private collections: Map<string, CollectionConfig> = new Map();
  private globals: Map<string, GlobalConfig> = new Map();
  private plugins: KyroPlugin[] = [];
  private schemaCache: Map<string, ZodTypeAny> = new Map();
  private initialized = false;

  // ========================================================================
  // Collection Management
  // ========================================================================

  addCollection(config: CollectionConfig): void {
    if (this.initialized) {
      throw new Error(
        "Cannot add collections after Registry has been initialized",
      );
    }

    if (this.collections.has(config.slug)) {
      console.warn(
        `[Registry] Duplicate collection slug "${config.slug}" — skipping`,
      );
      return;
    }

    // Apply plugin extensions
    let finalConfig = { ...config, fields: [...config.fields] };
    for (const plugin of this.plugins) {
      const ext = plugin.extensions?.collections?.find(c => c.slug === finalConfig.slug);
      if (ext) {
        finalConfig = { 
          ...finalConfig, 
          ...ext.config, 
          fields: [...finalConfig.fields, ...(ext.config.fields || [])] 
        };
      }
    }

    if (finalConfig.seo) {
      const seoField = generateSEOFields() as any;
      const tabsFieldIndex = finalConfig.fields.findIndex(f => f.type === 'tabs' && f.name === 'tabs');
      
      if (tabsFieldIndex !== -1) {
        const existingTabsField = finalConfig.fields[tabsFieldIndex] as any;
        finalConfig.fields[tabsFieldIndex] = {
          ...existingTabsField,
          tabs: [
            ...existingTabsField.tabs,
            {
              label: "SEO Settings",
              fields: seoField.fields,
            }
          ]
        };
      } else {
        finalConfig.fields.push(seoField);
      }
    }

    // Add default fields (id, createdAt, etc.) before validation
    finalConfig.fields = this.applyFieldDefaults(finalConfig);

    const errors = validateCollection(finalConfig);
    if (errors.length > 0) {
      throw new Error(`Invalid collection config: ${errors.join(", ")}`);
    }

    this.collections.set(finalConfig.slug, finalConfig);
    this.clearSchemaCache(finalConfig.slug);
  }

  addCollections(configs: CollectionConfig[]): void {
    for (const config of configs) {
      this.addCollection(config);
    }
  }

  getCollection(slug: string): CollectionConfig | undefined {
    return this.collections.get(slug);
  }

  getCollections(): CollectionConfig[] {
    return Array.from(this.collections.values());
  }

  getCollectionSlugs(): string[] {
    return Array.from(this.collections.keys());
  }

  hasCollection(slug: string): boolean {
    return this.collections.has(slug);
  }

  removeCollection(slug: string): boolean {
    if (this.initialized) {
      throw new Error(
        "Cannot remove collections after Registry has been initialized",
      );
    }
    this.clearSchemaCache(slug);
    return this.collections.delete(slug);
  }

  // ========================================================================
  // Global Management
  // ========================================================================

  addGlobal(config: GlobalConfig): void {
    if (this.initialized) {
      throw new Error("Cannot add globals after Registry has been initialized");
    }

    this._addGlobalUnsafe(config);
  }

  /**
   * Add a global after the registry is already initialized.
   * Only for internal use (e.g. storage settings form built at startup).
   */
  addGlobalPostInit(config: GlobalConfig): void {
    if (this.globals.has(config.slug)) {
      this.globals.delete(config.slug);
    }
    this._addGlobalUnsafe(config);
  }

  private _addGlobalUnsafe(config: GlobalConfig): void {
    if (this.globals.has(config.slug)) {
      console.warn(
        `[Registry] Duplicate global slug "${config.slug}" — skipping`,
      );
      return;
    }

    const errors = validateGlobal(config);
    if (errors.length > 0) {
      throw new Error(`Invalid global config: ${errors.join(", ")}`);
    }

    let finalConfig = { ...config };
    for (const plugin of this.plugins) {
      const ext = plugin.extensions?.globals?.find(g => g.slug === finalConfig.slug);
      if (ext) {
        finalConfig = { 
          ...finalConfig, 
          ...ext.config, 
          fields: [...(finalConfig.fields || []), ...(ext.config.fields || [])] 
        };
      }
    }

    this.globals.set(finalConfig.slug, finalConfig);
    this.clearSchemaCache(`global:${finalConfig.slug}`);
  }

  addGlobals(configs: GlobalConfig[]): void {
    for (const config of configs) {
      this.addGlobal(config);
    }
  }

  getGlobal(slug: string): GlobalConfig | undefined {
    return this.globals.get(slug);
  }

  getGlobals(): GlobalConfig[] {
    return Array.from(this.globals.values());
  }

  getGlobalSlugs(): string[] {
    return Array.from(this.globals.keys());
  }

  hasGlobal(slug: string): boolean {
    return this.globals.has(slug);
  }

  removeGlobal(slug: string): boolean {
    if (this.initialized) {
      throw new Error(
        "Cannot remove globals after Registry has been initialized",
      );
    }
    this.clearSchemaCache(`global:${slug}`);
    return this.globals.delete(slug);
  }

  // ========================================================================
  // Plugin Management
  // ========================================================================

  addPlugin(plugin: KyroPlugin): void {
    if (this.initialized) {
      throw new Error("Cannot add plugins after Registry has been initialized");
    }
    this.plugins.push(plugin);
  }

  getPlugins(): KyroPlugin[] {
    return [...this.plugins];
  }

  // ========================================================================
  // Schema Generation
  // ========================================================================

  getZodSchema(slug: string): ZodTypeAny {
    const cached = this.schemaCache.get(slug);
    if (cached) return cached;

    const collection = this.collections.get(slug);
    if (collection) {
      const schema = collectionToZod(collection);
      this.schemaCache.set(slug, schema);
      return schema;
    }

    const global = this.globals.get(slug);
    if (global) {
      const schema = globalToZod(global);
      this.schemaCache.set(`global:${slug}`, schema);
      return schema;
    }

    throw new Error(`No collection or global found with slug "${slug}"`);
  }

  getCreateZodSchema(slug: string): ZodTypeAny {
    const cacheKey = `${slug}:create`;
    const cached = this.schemaCache.get(cacheKey);
    if (cached) return cached;

    const collection = this.collections.get(slug);
    if (collection) {
      const schema = collectionToCreateZod(collection);
      this.schemaCache.set(cacheKey, schema);
      return schema;
    }

    throw new Error(`No collection found with slug "${slug}"`);
  }

  getUpdateZodSchema(slug: string): ZodTypeAny {
    const cacheKey = `${slug}:update`;
    const cached = this.schemaCache.get(cacheKey);
    if (cached) return cached;

    const collection = this.collections.get(slug);
    if (collection) {
      const schema = collectionToUpdateZod(collection);
      this.schemaCache.set(cacheKey, schema);
      return schema;
    }

    const global = this.globals.get(slug);
    if (global) {
      const schema = globalToUpdateZod(global);
      this.schemaCache.set(`global:${slug}:update`, schema);
      return schema;
    }

    throw new Error(`No collection or global found with slug "${slug}"`);
  }

  getWhereZodSchema(slug: string): ZodTypeAny {
    const cacheKey = `${slug}:where`;
    const cached = this.schemaCache.get(cacheKey);
    if (cached) return cached;

    const collection = this.collections.get(slug);
    if (collection) {
      const schema = collectionToWhereZod(collection);
      this.schemaCache.set(cacheKey, schema);
      return schema;
    }

    throw new Error(`No collection found with slug "${slug}"`);
  }

  getFieldZodSchema(field: Field): ZodTypeAny {
    return fieldToZod(field);
  }

  private clearSchemaCache(slug: string): void {
    this.schemaCache.delete(slug);
    this.schemaCache.delete(`${slug}:create`);
    this.schemaCache.delete(`${slug}:update`);
    this.schemaCache.delete(`${slug}:where`);
  }

  // ========================================================================
  // Field Helpers
  // ========================================================================

  private applyFieldDefaults(config: CollectionConfig): Field[] {
    const fields = [...config.fields];

    // Add id field if not present
    if (!fields.some((f) => f.name === "id")) {
      fields.unshift({
        name: "id",
        type: "text",
        admin: { readOnly: true, hidden: true },
      });
    }

    // Add tenantId field if tenantScoped
    if (config.tenantScoped && !fields.some((f) => f.name === "tenantId")) {
      fields.push({
        name: "tenantId",
        type: "text",
        required: true,
        admin: { readOnly: true, hidden: true },
      });
    }

    // Add timestamp fields if enabled
    if (config.timestamps && !fields.some((f) => f.name === "createdAt")) {
      fields.push({
        name: "createdAt",
        type: "date",
        admin: { readOnly: true, hidden: true },
      });
      fields.push({
        name: "updatedAt",
        type: "date",
        admin: { readOnly: true, hidden: true },
      });
    }

    // Add publishStatus field if drafts are enabled
    if (config.versions?.drafts && !fields.some((f) => f.name === "status")) {
      fields.push({
        name: "status",
        type: "select",
        options: [
          { value: "draft", label: "Draft" },
          { value: "published", label: "Published" },
        ],
        admin: { readOnly: true, hidden: true },
      });
    }

    // Add password field if auth is enabled
    if (config.auth && !fields.some((f) => f.name === "password")) {
      fields.push({
        name: "password",
        type: "password",
        required: true,
        admin: { hidden: true },
      });
    }

    return fields;
  }

  getFields(slug: string): Field[] {
    const collection = this.collections.get(slug);
    if (collection) return collection.fields;

    const global = this.globals.get(slug);
    if (global) return global.fields;

    throw new Error(`No collection or global found with slug "${slug}"`);
  }

  getFieldMap(slug: string): Map<string, Field> {
    const fields = this.getFields(slug);
    const map = new Map<string, Field>();

    const addFields = (fields: Field[]) => {
      for (const field of fields) {
        if (field.name) {
          map.set(field.name, field);
        }
        if ("fields" in field && field.fields) {
          addFields(field.fields);
        }
        if ("tabs" in field) {
          for (const tab of (field as any).tabs) {
            addFields(tab.fields);
          }
        }
        if ("blocks" in field) {
          for (const block of (field as any).blocks) {
            addFields(block.fields);
          }
        }
      }
    };

    addFields(fields);
    return map;
  }

  getVisibleFields(slug: string): Field[] {
    const fields = this.getFields(slug);
    return fields.filter((f) => !f.admin?.hidden);
  }

  // ========================================================================
  // Initialization
  // ========================================================================

  validate(): void {
    const collections = this.getCollections();
    const globals = this.getGlobals();
    validateConfig(collections, globals);
  }

  async init(kyroInstance?: any): Promise<void> {
    this.validate();

    // Initialize plugins
    for (const plugin of this.plugins) {
      if (plugin.init) {
        await plugin.init(kyroInstance || this);
      }

      // Auto-register plugin collections and globals if any
      const collections = plugin.collections || [];
      for (const col of collections) {
         if (col.slug && !this.hasCollection(col.slug)) {
           this.addCollection(col as CollectionConfig);
         }
      }

      const globals = plugin.globals || [];
      for (const glob of globals) {
         if (glob.slug && !this.hasGlobal(glob.slug)) {
           this.addGlobal(glob as GlobalConfig);
         }
      }
    }

    this.initialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // ========================================================================
  // Query Helpers
  // ========================================================================

  getPaginationDefaults(slug: string): {
    defaultLimit: number;
    limits: number[];
  } {
    const collection = this.collections.get(slug);
    return {
      defaultLimit: collection?.admin?.pagination?.defaultLimit || 10,
      limits: collection?.admin?.pagination?.limits || [10, 25, 50, 100],
    };
  }

  getDefaultSort(slug: string): string {
    const collection = this.collections.get(slug);
    const useAsTitle = collection?.admin?.useAsTitle;
    if (useAsTitle) return useAsTitle;
    return "createdAt";
  }

  getDefaultColumns(slug: string): string[] {
    const collection = this.collections.get(slug);
    if (collection?.admin?.defaultColumns) {
      return collection.admin.defaultColumns;
    }
    const fields = this.getVisibleFields(slug);
    return fields.slice(0, 4).map((f) => f.name!);
  }

  // ========================================================================
  // Admin Helpers
  // ========================================================================

  getAdminTitle(slug: string): string {
    const collection = this.collections.get(slug);
    return collection?.label || collection?.admin?.description || slug;
  }

  getAdminLabel(slug: string): string {
    const collection = this.collections.get(slug);
    return collection?.singularLabel || collection?.label || slug;
  }

  getAdminGroup(slug: string): string | undefined {
    return this.collections.get(slug)?.admin?.group;
  }

  // ========================================================================
  // Debug / Stats
  // ========================================================================

  getStats(): {
    collections: number;
    globals: number;
    plugins: number;
    fields: number;
  } {
    let totalFields = 0;
    for (const collection of this.collections.values()) {
      totalFields += collection.fields.length;
    }
    for (const global of this.globals.values()) {
      totalFields += global.fields.length;
    }

    return {
      collections: this.collections.size,
      globals: this.globals.size,
      plugins: this.plugins.length,
      fields: totalFields,
    };
  }

  toJSON(): {
    collections: CollectionConfig[];
    globals: GlobalConfig[];
  } {
    return {
      collections: this.getCollections(),
      globals: this.getGlobals(),
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: Registry | null = null;

export function getRegistry(): Registry {
  if (!instance) {
    instance = new Registry();
  }
  return instance;
}

export function resetRegistry(): void {
  instance = null;
}

export function createRegistry(): Registry {
  instance = new Registry();
  return instance;
}
