import { autoInstall } from "../../utils/auto-install.js";
import { AbstractBaseAdapter } from '../base.js';
import { sanitizeDoc } from "../../utils/sanitize.js";
import { sql, eq, and, or, desc, ne, inArray, like, ilike, gt, gte, lt, lte } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  integer,
  text,
  jsonb,
  decimal,
  PgDialect,
} from 'drizzle-orm/pg-core';
import {
  sqliteTable,
  integer as sqliteInteger,
  text as sqliteText,
  numeric as sqliteNumeric,
  SQLiteSyncDialect,
} from 'drizzle-orm/sqlite-core';
import type {
  CollectionConfig,
  GlobalConfig,
  FindArgs,
  FindByIDArgs,
  CreateArgs,
  UpdateArgs,
  DeleteArgs,
  FindResult,
  VersionRecord,
  CreateVersionArgs,
  FindOneArgs,
} from '../../registry/types.js';
import type { Field, RelationshipField } from '../../fields/types.js';
import type { TenantContext } from '../../auth/rls/tenant.js';
import { applyRLS, DEFAULT_RLS_CONFIG, canAccessDocument } from '../../auth/rls/tenant.js';



function formatUuid(id: string): string;
function formatUuid(id: any): any {
  if (typeof id !== "string") return id;
  const clean = id.replace(/-/g, "").toLowerCase();
  if (clean.length === 32) {
    return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
  }
  return id;
}

import {
  fieldToDrizzleType,
  collectionToDrizzleSchema,
  processBlocksUploadFields,
} from "./schema-mapper.js";

export { fieldToDrizzleType, collectionToDrizzleSchema, processBlocksUploadFields };

// ============================================================================
// Drizzle Adapter
// ============================================================================

export class DrizzleAdapter extends AbstractBaseAdapter {
  public client: any;
  private schema: any;
  private _schemaEnsured = false;
  public dialect: 'postgres' | 'sqlite';
  private connectionString?: string;
  private versionsTableReady = false;
  
  public rawClient: any;

  constructor(options: {
    type?: 'postgres' | 'sqlite';
    schema?: Record<string, any>;
    client?: any;
    connectionString?: string;
  }) {
    super();
    this.schema = options.schema || {};
    
    if (options.connectionString) {
      this.connectionString = options.connectionString;
      const connStr = options.connectionString.toLowerCase();
      if (connStr.startsWith('postgres://') || connStr.startsWith('postgresql://')) {
        this.dialect = 'postgres';
      } else if (connStr.includes('.db') || connStr.includes('sqlite') || connStr.includes('file:')) {
        this.dialect = 'sqlite';
      } else {
        this.dialect = options.type || 'postgres';
      }
    } else {
      this.rawClient = options.client;
      this.client = options.client;
      this.dialect = options.type || 'sqlite';
    }
  }

  protected prepareData(data: Record<string, any>, config: CollectionConfig): Record<string, any> {
    const result = super.prepareData(data, config);

    // Convert ISO date strings to Date objects for Drizzle timestamp columns
    if (result.createdAt && typeof result.createdAt === "string") {
      result.createdAt = new Date(result.createdAt);
    }
    if (result.updatedAt && typeof result.updatedAt === "string") {
      result.updatedAt = new Date(result.updatedAt);
    }

    // Convert date-type field values to Date objects for Drizzle timestamp columns
    for (const field of config.fields) {
      if (field.type === 'date' && field.name) {
        const value = result[field.name];
        if (value && typeof value === "string") {
          result[field.name] = new Date(value);
        }
      }
    }

    // Process complex fields — Drizzle ORM handles JSONB serialization natively for Postgres,
    // but for SQLite we must manually stringify ALL jsonb columns.
    for (const field of config.fields) {
      const dbType = fieldToDrizzleType(field, this.dialect);
      const isJsonb = dbType === "jsonb";

      if (field.type === 'tabs' && 'tabs' in field && field.name) {
        const tabData = data[field.name];
        if (tabData && typeof tabData === 'object') {
          const processedTabData: any = {};
          for (const [key, value] of Object.entries(tabData)) {
            const tabField = field.tabs.flatMap((t: any) => t.fields).find((f: any) => f.name === key);
            const needsStringify = (tabField?.type === 'upload' || tabField?.type === 'image' || tabField?.type === 'list' || tabField?.type === 'relationship-block') && value;
            if (needsStringify) {
              processedTabData[key] = Array.isArray(value) ? JSON.stringify(value) : typeof value === 'object' ? JSON.stringify(value) : value;
            } else {
              processedTabData[key] = value;
            }
          }
          result[field.name] = (this.dialect === 'sqlite' || !isJsonb) ? JSON.stringify(processedTabData) : processedTabData;
        }
      } else if (isJsonb && field.name && data[field.name] !== undefined && data[field.name] !== null) {
        result[field.name] = this.dialect === 'sqlite' ? JSON.stringify(data[field.name]) : data[field.name];
      } else if ((field as any).type === 'upload' || (field as any).type === 'image' || (field as any).type === 'list' || (field as any).type === 'relationship-block') {
        if (field.name) {
          const value = data[field.name];
          if (value !== undefined && value !== null) {
            result[field.name] = (this.dialect === 'sqlite' || !isJsonb) ? (typeof value === 'string' ? value : JSON.stringify(value)) : value;
          }
        }
      }
    }

    // Convert empty strings to null for field types that reject them in PostgreSQL
    for (const field of config.fields) {
      if (field.name && result[field.name] === "") {
        const dbType = fieldToDrizzleType(field, this.dialect);
        if (dbType === "timestamp" || dbType === "jsonb" || dbType === "decimal" || dbType === "integer" || dbType === "numeric" || dbType === "boolean") {
          result[field.name] = null;
        }
      }
    }
    
    return result;
  }

  async connect(): Promise<void> {
    if (this.connectionString && !this.client) {
      if (this.dialect === 'postgres') {
        let postgres, drizzle;
        try {
          postgres = (await import(/* @vite-ignore */ 'postgres')).default;
          drizzle = (await import(/* @vite-ignore */ 'drizzle-orm/postgres-js')).drizzle;
        } catch (e) {
          autoInstall(["postgres", "drizzle-orm"]);
          postgres = (await import(/* @vite-ignore */ 'postgres')).default;
          drizzle = (await import(/* @vite-ignore */ 'drizzle-orm/postgres-js')).drizzle;
        }
        const sql = postgres(this.connectionString, { onnotice: () => {} });
        this.client = drizzle(sql, { schema: this.schema });
      } else if (this.dialect === 'sqlite') {
        let betterSqlite3, drizzle;
        try {
          betterSqlite3 = (await import(/* @vite-ignore */ 'better-sqlite3')).default;
          drizzle = (await import(/* @vite-ignore */ 'drizzle-orm/better-sqlite3')).drizzle;
        } catch (e) {
          autoInstall(["better-sqlite3", "drizzle-orm"]);
          betterSqlite3 = (await import(/* @vite-ignore */ 'better-sqlite3')).default;
          drizzle = (await import(/* @vite-ignore */ 'drizzle-orm/better-sqlite3')).drizzle;
        }
        const db = new betterSqlite3(this.connectionString.replace('file:', ''));
        this.client = drizzle(db, { schema: this.schema });
      }
    }

    if (this.rawClient && typeof this.rawClient.prepare === 'function' && typeof this.client?.select !== 'function') {
      const { drizzle: drizzleD1 } = await import('drizzle-orm/d1');
      this.client = drizzleD1(this.rawClient, { schema: this.schema });
    }

    this.connected = true;

  }

  async init(collections: CollectionConfig[], globals: GlobalConfig[] = []): Promise<void> {
    await super.init(collections, globals);

    if ((this.connectionString && !this.client) || (this.rawClient && typeof this.client?.select !== 'function')) {
      await this.connect();
    }

    if (this.client && !this._schemaEnsured) {
      for (const config of collections) {
        const tableName = this.getTableName(config.slug);
        if (!this.schema[tableName]) {
          this.schema[tableName] = this.createTableFromConfig(config);
        }
      }
      await this.ensureCollectionTables(collections);

      // Create tables for globals (stored as _globals_{slug})
      const globalCollections: CollectionConfig[] = globals.map((g) => ({
        slug: `_globals_${g.slug}`,
        fields: g.fields,
        label: g.label,
      }));
      for (const gc of globalCollections) {
        const tableName = this.getTableName(gc.slug);
        if (!this.schema[tableName]) {
          this.schema[tableName] = this.createTableFromConfig(gc, true);
        }
        // Register in collections so CRUD methods can find them
        if (!this.collections.has(gc.slug)) {
          this.collections.set(gc.slug, gc as CollectionConfig);
        }
      }
      await this.ensureCollectionTables(globalCollections);
      this._schemaEnsured = true;
    }
  }

  private createTableFromConfig(config: CollectionConfig, useTextId = false): any {
    const tableName = this.getTableName(config.slug);
    const columns: Record<string, any> = {
      id: useTextId ? text("id").primaryKey() : uuid("id").primaryKey().defaultRandom(),
    };

    for (const field of config.fields) {
      if (!field.name || field.name === "id" || field.type === "password") continue;
      const dbType = fieldToDrizzleType(field, this.dialect);
      const propName = field.name.replace(/-/g, "_");
      const sqlName = propName.replace(/([A-Z])/g, "_$1").toLowerCase();

      let col: any;
      if (this.dialect === 'sqlite') {
        switch (dbType) {
          case "varchar":
          case "text":
            col = sqliteText(sqlName);
            break;
          case "integer":
            col = sqliteInteger(sqlName);
            break;
          case "decimal":
          case "numeric":
            col = sqliteNumeric(sqlName);
            break;
          case "boolean":
            col = sqliteInteger(sqlName, { mode: 'boolean' });
            break;
          case "timestamp":
            col = sqliteText(sqlName);
            break;
          case "jsonb":
            col = sqliteText(sqlName);
            break;
          default:
            col = sqliteText(sqlName);
        }
      } else {
        switch (dbType) {
          case "varchar":
            col = varchar(sqlName, { length: 255 });
            break;
          case "integer":
            col = integer(sqlName);
            break;
          case "decimal":
            col = decimal(sqlName);
            break;
          case "boolean":
            col = boolean(sqlName);
            break;
          case "timestamp":
            col = timestamp(sqlName);
            break;
          case "jsonb":
            col = jsonb(sqlName);
            break;
          default:
            col = text(sqlName);
        }
      }
      if (!field.required) col = col.default(null);
      columns[propName] = col;
    }

    if (!columns.createdAt) columns.createdAt = this.dialect === 'sqlite' ? sqliteText("created_at").default(new Date().toISOString()) : timestamp("created_at").defaultNow();
    if (!columns.updatedAt) columns.updatedAt = this.dialect === 'sqlite' ? sqliteText("updated_at").default(new Date().toISOString()) : timestamp("updated_at").defaultNow();
    
    if (tableName !== "users" && tableName !== "audit_logs") {
      if (!columns.status) columns.status = this.dialect === 'sqlite' ? sqliteText("status").default("draft") : varchar("status", { length: 20 }).default("draft");
      if (!columns.hasDraft) columns.hasDraft = this.dialect === 'sqlite' ? sqliteInteger("hasDraft", { mode: 'boolean' }).default(false) : boolean("hasDraft").default(false);
    }

    return this.dialect === 'sqlite'
      ? sqliteTable(tableName, columns)
      : pgTable(tableName, columns);
  }

  private async ensureCollectionTables(collections: CollectionConfig[]): Promise<void> {
    const statements: string[] = [];
    for (const config of collections) {
      const isGlobal = config.slug.startsWith("_globals_");
      const tableName = this.getTableName(config.slug);
      const colDefs = this.generateCreateColumns(config);
      const hasCreated = config.fields.some((f) => f.name === "createdAt");
      const hasUpdated = config.fields.some((f) => f.name === "updatedAt");
      const hasStatus = config.fields.some((f) => f.name === "status");
      const hasDraftField = config.fields.some((f) => f.name === "hasDraft");
      
      if (this.dialect === 'postgres') {
        const idCol = isGlobal ? '"id" TEXT PRIMARY KEY' : '"id" UUID PRIMARY KEY DEFAULT gen_random_uuid()';
        statements.push(`
          CREATE TABLE IF NOT EXISTS "${tableName}" (
            ${idCol},
            ${colDefs}
            ${hasCreated ? "" : '"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),'}
            ${hasUpdated ? "" : '"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),'}
            ${hasStatus ? "" : '"status" VARCHAR(20) DEFAULT \'draft\','}
            ${hasDraftField ? "" : '"hasDraft" BOOLEAN DEFAULT false'}
          )
        `);
      } else {
        const idCol = isGlobal ? '"id" TEXT PRIMARY KEY' : '"id" TEXT PRIMARY KEY';
        statements.push(`
          CREATE TABLE IF NOT EXISTS "${tableName}" (
            ${idCol},
            ${colDefs}
            ${hasCreated ? "" : '"created_at" TEXT NOT NULL DEFAULT (datetime(\'now\')),'}
            ${hasUpdated ? "" : '"updated_at" TEXT NOT NULL DEFAULT (datetime(\'now\')),'}
            ${hasStatus ? "" : '"status" TEXT DEFAULT \'draft\','}
            ${hasDraftField ? "" : '"hasDraft" INTEGER DEFAULT 0'}
          )
        `);
      }
    }
    if (statements.length > 0) {
      if (this.dialect === 'postgres') {
        await this.executeRaw(sql.raw(statements.join(";\n")));
      } else {
        for (const stmt of statements) {
          await this.executeRaw(sql.raw(stmt));
        }
      }
    }
    // Sync missing columns for each table (handles schema drift from config changes)
    for (const config of collections) {
      const tableName = this.getTableName(config.slug);
      // Skip auth-managed tables — their schema is managed by the auth adapter,
      // and altering columns (e.g. users.avatar VARCHAR→jsonb) breaks auth queries.
      if (tableName === "users" || tableName === "audit_logs") continue;
      await this.syncTableColumns(config, tableName);
    }
  }

  private getColumnSqlDefinition(field: Field, dialect: "postgres" | "sqlite"): string {
    const dbType = fieldToDrizzleType(field, dialect);
    const sqlName = field.name!
      .replace(/-/g, "_")
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase();
    const sqlType = this.columnSqlType(dbType, dialect);
    return `"${sqlName}" ${sqlType} DEFAULT NULL`;
  }

  private columnSqlType(dbType: string, dialect: string): string {
    if (dialect === 'sqlite') {
      switch (dbType) {
        case "varchar": return "TEXT";
        case "text": return "TEXT";
        case "integer": return "INTEGER";
        case "decimal": case "numeric": return "NUMERIC";
        case "boolean": return "INTEGER";
        case "timestamp": return "TEXT";
        case "jsonb": return "TEXT";
        default: return "TEXT";
      }
    }
    switch (dbType) {
      case "varchar": return "VARCHAR(255)";
      case "text": return "TEXT";
      case "integer": return "INTEGER";
      case "decimal": case "numeric": return "DECIMAL";
      case "boolean": return "BOOLEAN";
      case "timestamp": return "TIMESTAMP";
      case "jsonb": return "JSONB";
      default: return "TEXT";
    }
  }

  private getExpectedColumnDefs(config: CollectionConfig, tableName: string): Record<string, string> {
    const defs: Record<string, string> = {};
    const isGlobal = config.slug.startsWith("_globals_");
    const hasCreated = config.fields.some((f) => f.name === "createdAt");
    const hasUpdated = config.fields.some((f) => f.name === "updatedAt");
    const hasStatus = config.fields.some((f) => f.name === "status");
    const hasDraftField = config.fields.some((f) => f.name === "hasDraft");

    if (this.dialect === 'postgres') {
      defs["id"] = isGlobal ? '"id" TEXT PRIMARY KEY' : '"id" UUID PRIMARY KEY DEFAULT gen_random_uuid()';
      if (!hasCreated) defs["created_at"] = '"created_at" TIMESTAMP DEFAULT NULL';
      if (!hasUpdated) defs["updated_at"] = '"updated_at" TIMESTAMP DEFAULT NULL';
      if (!hasStatus) defs["status"] = '"status" VARCHAR(20) DEFAULT NULL';
      if (!hasDraftField) defs["hasDraft"] = '"hasDraft" BOOLEAN DEFAULT NULL';
    } else {
      defs["id"] = '"id" TEXT PRIMARY KEY';
      if (!hasCreated) defs["created_at"] = '"created_at" TEXT DEFAULT NULL';
      if (!hasUpdated) defs["updated_at"] = '"updated_at" TEXT DEFAULT NULL';
      if (!hasStatus) defs["status"] = '"status" TEXT DEFAULT NULL';
      if (!hasDraftField) defs["hasDraft"] = '"hasDraft" INTEGER DEFAULT NULL';
    }

    for (const field of config.fields) {
      if (!field.name || field.name === "id") continue;
      const def = this.getColumnSqlDefinition(field, this.dialect);
      const sqlName = field.name
        .replace(/-/g, "_")
        .replace(/([A-Z])/g, "_$1")
        .toLowerCase();
      defs[sqlName] = def;
    }
    return defs;
  }

  private async syncTableColumns(config: CollectionConfig, tableName: string): Promise<void> {
    let existingCols: Map<string, { type: string; maxLen: number | null }>;
    try {
      if (this.dialect === 'postgres') {
        const result = await this.executeRaw(
          sql`SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = ${tableName}`
        );
        existingCols = new Map(result.map((r: any) => [r.column_name, { type: r.data_type, maxLen: r.character_maximum_length }]));
      } else {
        const result = await this.executeRaw(
          sql`PRAGMA table_info("${sql.raw(tableName)}")`
        );
        existingCols = new Map(result.map((r: any) => [r.name, { type: r.type, maxLen: null }]));
      }
    } catch {
      return;
    }

    const expected = this.getExpectedColumnDefs(config, tableName);

    // Add missing columns
    const missing = Object.keys(expected).filter(k => !existingCols.has(k));
    if (missing.length > 0) {
      const alterStmts = missing.map(k => `ALTER TABLE "${tableName}" ADD COLUMN ${expected[k]}`);
      await this.executeRaw(sql.raw(alterStmts.join(";\n")));
    }

    // Fix column type mismatches: VARCHAR → correct type where field config changed
    if (this.dialect === 'postgres') {
      for (const field of config.fields) {
        if (!field.name || field.name === "id") continue;
        const expectedDbType = fieldToDrizzleType(field, this.dialect);
        const sqlName = field.name
          .replace(/-/g, "_")
          .replace(/([A-Z])/g, "_$1")
          .toLowerCase();

        const info = existingCols.get(sqlName);
        if (!info || info.type !== 'character varying') continue;

        if (expectedDbType === 'text') {
          await this.executeRaw(sql.raw(`ALTER TABLE "${tableName}" ALTER COLUMN "${sqlName}" TYPE TEXT`));

        } else if (expectedDbType === 'jsonb') {
          await this.executeRaw(sql.raw(`ALTER TABLE "${tableName}" ALTER COLUMN "${sqlName}" DROP DEFAULT`));
          await this.executeRaw(sql.raw(`ALTER TABLE "${tableName}" ALTER COLUMN "${sqlName}" TYPE JSONB USING (CASE WHEN "${sqlName}" IS NULL THEN NULL WHEN "${sqlName}"::text ~ '^\\s*\\{' THEN "${sqlName}"::jsonb ELSE jsonb_build_object('id', "${sqlName}"::text) END)`));

        }
      }
    }
  }

  private generateCreateColumns(config: CollectionConfig): string {
    const cols: string[] = [];
    for (const field of config.fields) {
      if (!field.name || field.name === "id") continue;
      const dbType = fieldToDrizzleType(field, this.dialect);
      const sqlName = field.name
        .replace(/-/g, "_")
        .replace(/([A-Z])/g, "_$1")
        .toLowerCase();
      const nullable = field.required ? "NOT NULL" : "DEFAULT NULL";

      let sqlType: string;
      if (this.dialect === 'sqlite') {
        switch (dbType) {
          case "varchar":
          case "text":
            sqlType = `TEXT ${nullable}`;
            break;
          case "integer":
            sqlType = `INTEGER ${nullable}`;
            break;
          case "decimal":
          case "numeric":
            sqlType = `NUMERIC ${nullable}`;
            break;
          case "boolean":
            sqlType = `INTEGER ${nullable}`;
            break;
          case "timestamp":
            sqlType = `TEXT ${nullable}`;
            break;
          case "jsonb":
            sqlType = `TEXT ${nullable}`;
            break;
          default:
            sqlType = `TEXT ${nullable}`;
        }
      } else {
        switch (dbType) {
          case "varchar":
            sqlType = `VARCHAR(255) ${nullable}`;
            break;
          case "integer":
            sqlType = `INTEGER ${nullable}`;
            break;
          case "decimal":
            sqlType = `DECIMAL ${nullable}`;
            break;
          case "boolean":
            sqlType = `BOOLEAN ${nullable}`;
            break;
          case "timestamp":
            sqlType = `TIMESTAMP ${nullable}`;
            break;
          case "jsonb":
            sqlType = `JSONB ${nullable}`;
            break;
          default:
            sqlType = `TEXT ${nullable}`;
        }
      }
      cols.push(`"${sqlName}" ${sqlType}`);
    }
    return cols.join(",\n          ") + (cols.length > 0 ? "," : "");
  }

  async disconnect(): Promise<void> {
    this.connected = false;

  }

  async find<T>(args: FindArgs): Promise<FindResult<T>> {
    const { collection: slug, where = {}, sort, limit = 10, page = 1, tenantId, select, draft } = args;
    const config = this.getCollection(slug);
    const table = this.getTable(slug);

    let effectiveWhere = { ...where };
    if (this.tenantContext && config.tenantScoped) {
      const rlsQuery = applyRLS({ where: effectiveWhere }, slug, this.tenantContext, DEFAULT_RLS_CONFIG);
      effectiveWhere = rlsQuery.where || {};
    }

    // Build query
    const filters = this.buildWhereClause(effectiveWhere, config, table, tenantId);
    
    // Default filter for non-draft requests: only show published
    const statusField = config.fields.find((f: any) => f.name === 'status');
    const hasPublished = statusField?.type === 'select' && Array.isArray(statusField.options) && statusField.options.some((o: any) => o.value === 'published');
    if (!draft && table.status && hasPublished) {
      filters.push(eq(table.status, 'published'));
    }

    const sortOption = this.parseSort(sort);

    // Get total count (include status filter for non-draft requests)
    const countWhere = !draft && table.status && hasPublished ? { ...effectiveWhere, status: 'published' } : effectiveWhere;
    const totalDocs = await this.count({ collection: slug, where: countWhere, tenantId });

    // Execute query
    const offset = (page - 1) * limit;
    
    let results = [];
    try {
      const sortCol = table[sortOption.field] || table.createdAt || table.id;
      const sorted = sortOption.direction === 'asc' ? sortCol : desc(sortCol);
      let query = this.client.select().from(table);
      
      if (filters.length > 0) {
        query = query.where(and(...filters));
      }
      
      results = await query.orderBy(sorted).limit(limit).offset(offset);
    } catch (error) {
      console.error(`[DrizzleAdapter] Query error:`, error);
    }

    let docs: T[] = results.map((doc: any) => this.processResult(doc, config));

    if (this.tenantContext && !this.tenantContext.isSuperAdmin) {
      docs = docs.filter((doc: any) => canAccessDocument(doc, slug, this.tenantContext!, DEFAULT_RLS_CONFIG)) as T[];
    }

    // If draft: true, merge the latest version (autosave or manual) into the response
    if (draft) {
      docs = await Promise.all(docs.map(async (doc: any) => {
        const versions = await this.executeRaw<any>(sql`
          SELECT * FROM kyro_versions
          WHERE collection_slug = ${slug}
          AND document_id = ${doc.id}
          ORDER BY created_at DESC
          LIMIT 1
        `);
        if (versions.length > 0) {
          const ver = versions[0];
          let versionData = ver.data;
          while (typeof versionData === 'string') {
            try { versionData = JSON.parse(versionData); } catch { break; }
          }
          if (!versionData || typeof versionData !== 'object' || Array.isArray(versionData)) {
            versionData = {};
          }
          return { ...doc, ...versionData, status: doc.status, _hasUnpublishedChanges: ver.status === 'draft' };
        }
        return doc;
      }));
    }

    return {
      docs,
      ...this.calculatePagination(page, limit, totalDocs),
    };
  }

  async findByID<T>(args: FindByIDArgs): Promise<T | null> {
    const { collection: slug, id, tenantId, draft } = args;
    const config = this.getCollection(slug);
    const table = this.getTable(slug);

    const formattedId = this.dialect === 'postgres' ? (typeof id === 'string' ? formatUuid(id) : id) : id;

    if (this.tenantContext && config.tenantScoped) {
      const tempDoc = { id: formattedId, tenantId: this.tenantContext.tenantId };
      if (!canAccessDocument(tempDoc, slug, this.tenantContext, DEFAULT_RLS_CONFIG)) {
        return null;
      }
    }

    const conditions = [eq(table.id, formattedId)];
    if (tenantId && table.tenantId) conditions.push(eq(table.tenantId, tenantId));
    
    const statusField = config.fields.find((f: any) => f.name === 'status');
    const hasPublished = statusField?.type === 'select' && Array.isArray(statusField.options) && statusField.options.some((o: any) => o.value === 'published');
    if (!draft && table.status && hasPublished) conditions.push(eq(table.status, "published"));
    
    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];
    let allRows = await this.client.select().from(table).where(whereClause);
    if (allRows.length === 0) return null;
    let doc = this.processResult(allRows[0], config) as T;

    // If draft: true, merge the latest version (autosave or manual) into the response
    if (draft) {
      const versions = await this.executeRaw<any>(sql`
        SELECT * FROM kyro_versions
        WHERE collection_slug = ${slug}
        AND document_id = ${(doc as any).id}
        ORDER BY created_at DESC
        LIMIT 1
      `);
      if (versions.length > 0) {
        const ver = versions[0];
        let versionData = ver.data;
        while (typeof versionData === 'string') {
          try { versionData = JSON.parse(versionData); } catch { break; }
        }
        if (!versionData || typeof versionData !== 'object' || Array.isArray(versionData)) {
          versionData = {};
        }
        doc = { ...doc, ...versionData, status: (doc as any).status, _hasUnpublishedChanges: ver.status === 'draft' };
      }
    }

    return doc;
  }

  async create<T>(args: CreateArgs): Promise<T> {
    const { collection: slug, data, tenantId } = args;
    const config = this.getCollection(slug);
    const table = this.getTable(slug);

    const insertData = this.prepareData(data, config);
    if (tenantId && config.tenantScoped) {
      insertData.tenantId = tenantId;
    }

    const result = await this.client
      .insert(table)
      .values(insertData)
      .returning();

    return this.processResult(result[0], config) as T;
  }

  async update<T>(args: UpdateArgs): Promise<T> {
    const { collection: slug, id, data, tenantId } = args;
    const config = this.getCollection(slug);
    const table = this.getTable(slug);

    const updateData = this.prepareData(data, config);

    const formattedId = this.dialect === 'postgres' ? (typeof id === 'string' ? formatUuid(id) : id) : id;

    const conditions: any[] = [eq(table.id, formattedId)];
    if (tenantId && table.tenantId) {
      conditions.push(eq(table.tenantId, tenantId));
    }

    const result = await this.client
      .update(table)
      .set(updateData)
      .where(and(...conditions))
      .returning();

    if (result.length === 0) {
      throw new Error(`Document not found: ${slug}/${id}`);
    }

    return this.processResult(result[0], config) as T;
  }

  async delete<T>(args: DeleteArgs): Promise<T> {
    const { collection: slug, id, tenantId } = args;
    const config = this.getCollection(slug);
    const table = this.getTable(slug);

    const formattedId = this.dialect === 'postgres' ? (typeof id === 'string' ? formatUuid(id) : id) : id;

    const conditions: any[] = [eq(table.id, formattedId)];
    if (tenantId && table.tenantId) {
      conditions.push(eq(table.tenantId, tenantId));
    }

    const result = await this.client
      .delete(table)
      .where(and(...conditions))
      .returning();

    if (result.length === 0) {
      throw new Error(`Document not found: ${slug}/${id}`);
    }

    return this.processResult(result[0], config) as T;
  }

  async count(args: { collection: string; where?: Record<string, any>; tenantId?: string }): Promise<number> {
    const { collection: slug, where = {}, tenantId } = args;
    const config = this.getCollection(slug);
    const table = this.getTable(slug);

    const filters = this.buildWhereClause(where, config, table, tenantId);

    try {
      let query = this.client.select({ count: sql<number>`count(*)` }).from(table);
      
      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const result = await query;
      return Number(result[0]?.count || 0);
    } catch {
      return 0;
    }
  }

  async findOne(args: FindOneArgs): Promise<any> {
    const { collection: slug, where = {}, tenantId, draft } = args;
    
    // Check if it's a Global
    if (slug.startsWith('_globals_')) {
      const globalSlug = slug.replace('_globals_', '');
      const globalConfig = this.globals.get(globalSlug);
      if (!globalConfig) throw new Error(`Global "${globalSlug}" not found`);
      
      const table = this.getTable(slug);
      let query = this.client.select().from(table);
      
      const statusField = globalConfig.fields.find((f: any) => f.name === 'status');
      const hasPublished = statusField?.type === 'select' && Array.isArray(statusField.options) && statusField.options.some((o: any) => o.value === 'published');
      if (!draft && table.status && hasPublished) {
        query = query.where(eq(table.status, 'published'));
      }

      const results = await query.limit(1);
      if (results.length === 0) return null;

      let doc = this.processResult(results[0], globalConfig as any);

      // If draft: true, merge the latest version (autosave or manual) into the response
      if (draft) {
        const versions = await this.executeRaw<any>(sql`
          SELECT * FROM kyro_versions
          WHERE collection_slug = ${slug}
          AND document_id = ${globalSlug}
          ORDER BY created_at DESC
          LIMIT 1
        `);
        if (versions.length > 0) {
          const ver = versions[0];
          const versionData = typeof ver.data === 'string' ? JSON.parse(ver.data) : ver.data;
          doc = { ...doc, ...versionData, status: (doc as any).status, _hasUnpublishedChanges: ver.status === 'draft' };
        }
      }
      return doc;
    }

    const result = await this.find({ ...args, limit: 1 });
    return result.docs[0] || null;
  }

  async findVersions(args: any): Promise<FindResult<any>> {
    await this.ensureVersionsTable();
    const { collection: slug, documentId, limit = 10, page = 1, tenantId } = args;

    const offset = (page - 1) * limit;
    
    const config = this.getCollection(slug);
    
    const countResult = await this.executeRaw(sql`
      SELECT count(*) as count 
      FROM kyro_versions 
      WHERE collection_slug = ${slug} 
      AND document_id = ${documentId}
      AND autosave = 0
      ${tenantId && config.tenantScoped ? sql`AND tenant_id = ${tenantId}` : sql``}
    `);
    const totalDocs = parseInt(countResult[0]?.count || '0');

    const results = await this.executeRaw(sql`
      SELECT * 
      FROM kyro_versions 
      WHERE collection_slug = ${slug} 
      AND document_id = ${documentId}
      AND autosave = 0
      ${tenantId && config.tenantScoped ? sql`AND tenant_id = ${tenantId}` : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    return {
      docs: results.map(row => ({
        ...row,
        data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      })),
      ...this.calculatePagination(page, limit, totalDocs),
    };
  }

  async findVersionByID(args: { collection: string; versionId: string; tenantId?: string }): Promise<any> {
    await this.ensureVersionsTable();
    const config = this.getCollection(args.collection);
    const results = await this.executeRaw(sql`
      SELECT * FROM kyro_versions 
      WHERE id = ${args.versionId} 
      AND collection_slug = ${args.collection}
      ${args.tenantId && config.tenantScoped ? sql`AND tenant_id = ${args.tenantId}` : sql``}
      LIMIT 1
    `);
    
    if (results.length === 0) return null;
    const row = results[0];
    return {
      ...row,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
    };
  }

  async createVersion(args: any): Promise<any> {
    await this.ensureVersionsTable();
    const config = this.getCollection(args.collection);
    const now = new Date().toISOString();

    // Autosave: reuse existing autosave slot instead of creating a new row
    if (args.autosave) {
      const existing = await this.executeRaw(sql`
        SELECT * FROM kyro_versions
        WHERE collection_slug = ${args.collection}
        AND document_id = ${args.documentId}
        AND autosave = 1
        ${args.tenantId && config.tenantScoped ? sql`AND tenant_id = ${args.tenantId}` : sql``}
        LIMIT 1
      `);
      if (existing.length > 0) {
        await this.executeRaw(sql`
          UPDATE kyro_versions
          SET data = ${JSON.stringify(args.data)},
              status = ${args.status},
              updated_at = ${now}
          WHERE id = ${existing[0].id}
        `);
        return this.findVersionByID({ collection: args.collection, versionId: existing[0].id, tenantId: args.tenantId });
      }
    }

    const id = Math.random().toString(36).substring(2, 15);
    
    const serializedData = typeof args.data === 'string' ? args.data : JSON.stringify(args.data);
    await this.executeRaw(sql`
      INSERT INTO kyro_versions (
        id, collection_slug, document_id, tenant_id, data, status, autosave, created_by, change_description, created_at, updated_at
      ) VALUES (
        ${id}, ${args.collection}, ${args.documentId}, ${args.tenantId && config.tenantScoped ? args.tenantId : null}, 
        ${serializedData}, ${args.status}, ${args.autosave ? 1 : 0}, ${args.createdBy || null}, 
        ${args.changeDescription || null}, ${now}, ${now}
      )
    `);

    // Pruning logic — skip for autosave versions (only one per doc, not counted toward limit)
    if (!args.autosave) {
      const config = this.getCollection(args.collection);
      if (config.versions?.maxPerDoc) {
        await this.deleteVersions({
          collection: args.collection,
          documentId: args.documentId,
          keepLatest: config.versions.maxPerDoc,
          tenantId: args.tenantId,
        });
      }
    }

    return this.findVersionByID({ collection: args.collection, versionId: id, tenantId: args.tenantId });
  }

  async updateLatestVersion(args: any): Promise<any> {
    return this.createVersion({ ...args, autosave: true });
  }

  async deleteVersions(args: { collection: string; documentId: string; keepLatest?: number; tenantId?: string }): Promise<void> {
    await this.ensureVersionsTable();
    const config = this.getCollection(args.collection);
    
    if (args.keepLatest) {
      // Exclude autosave versions from pruning
      const toKeep = await this.executeRaw(sql`
        SELECT id FROM kyro_versions
        WHERE collection_slug = ${args.collection}
        AND document_id = ${args.documentId}
        AND autosave = 0
        ${args.tenantId && config.tenantScoped ? sql`AND tenant_id = ${args.tenantId}` : sql``}
        ORDER BY created_at DESC
        LIMIT ${args.keepLatest}
      `);
      
      const keepIds = toKeep.map(r => r.id);
      if (keepIds.length > 0) {
        await this.executeRaw(sql`
          DELETE FROM kyro_versions
          WHERE collection_slug = ${args.collection}
          AND document_id = ${args.documentId}
          AND autosave = 0
          AND id NOT IN (${sql.join(keepIds.map(id => sql`${id}`), sql`, `)})
        `);
      }
    } else {
      await this.executeRaw(sql`
        DELETE FROM kyro_versions
        WHERE collection_slug = ${args.collection}
        AND document_id = ${args.documentId}
        ${args.tenantId && config.tenantScoped ? sql`AND tenant_id = ${args.tenantId}` : sql``}
      `);
    }
  }


  // ========================================================================
  // Helper Methods
  // ========================================================================

  private getTable(slug: string): any {
    const tableName = this.getTableName(slug);
    const table = this.schema[tableName];
    if (!table) {
      throw new Error(`Table "${tableName}" not found in schema`);
    }
    return table;
  }

  private buildWhereClause(
    where: Record<string, any>,
    config: CollectionConfig,
    table: any,
    tenantId?: string
  ): any[] {
    const conditions: any[] = [];

    if (tenantId && config.tenantScoped && table.tenantId) {
      conditions.push(eq(table.tenantId, tenantId));
    }

    for (let [rawKey, value] of Object.entries(where)) {
      const key = rawKey;
      const upperKey = key.toUpperCase();

      if (key === 'id' && this.dialect === 'postgres') {
        if (typeof value === 'string') {
          value = formatUuid(value);
        } else if (value && typeof value === 'object') {
          if (value.equals !== undefined && typeof value.equals === 'string') {
            value = { ...value, equals: formatUuid(value.equals) };
          }
          if (value.in && Array.isArray(value.in)) {
            value = { ...value, in: value.in.map((v: any) => typeof v === 'string' ? formatUuid(v) : v) };
          }
        }
      }
      if (upperKey === 'AND' && Array.isArray(value)) {
        const andConditions = value
          .map((sub: any) => this.buildWhereClause(sub, config, table))
          .flat()
          .filter(Boolean);
        if (andConditions.length > 0) {
          conditions.push(and(...andConditions));
        }
      } else if (upperKey === 'OR' && Array.isArray(value)) {
        const orConditions = value
          .map((sub: any) => this.buildWhereClause(sub, config, table))
          .flat()
          .filter(Boolean);
        if (orConditions.length > 0) {
          conditions.push(or(...orConditions));
        }
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const col =
          table[key] ||
          table[key.replace(/-/g, "_")] ||
          table[key.replace(/([A-Z])/g, "_$1").toLowerCase()] ||
          (key === "created_at" ? table.createdAt : undefined) ||
          (key === "createdAt" ? table.created_at : undefined) ||
          (key === "updated_at" ? table.updatedAt : undefined) ||
          (key === "updatedAt" ? table.updated_at : undefined);
        if (!col) continue;

        if (value.equals !== undefined) conditions.push(eq(col, value.equals));
        if (value.not_equals !== undefined) conditions.push(ne(col, value.not_equals));
        if (value.in && Array.isArray(value.in)) {
          if (value.in.length === 0) {
            conditions.push(sql`1 = 0`);
          } else {
            conditions.push(inArray(col, value.in));
          }
        }
        if (value.like !== undefined) {
          if (this.dialect === 'postgres') {
            conditions.push(ilike(col, value.like));
          } else {
            conditions.push(like(col, value.like));
          }
        }
        if (value.contains !== undefined) {
          if (this.dialect === 'postgres') {
            conditions.push(ilike(col, `%${value.contains}%`));
          } else {
            conditions.push(like(col, `%${value.contains}%`));
          }
        }
        if (value.greater_than !== undefined) conditions.push(gt(col, value.greater_than));
        if (value.greater_than_equal !== undefined) conditions.push(gte(col, value.greater_than_equal));
        if (value.less_than !== undefined) conditions.push(lt(col, value.less_than));
        if (value.less_than_equal !== undefined) conditions.push(lte(col, value.less_than_equal));
      } else {
        const col =
          table[key] ||
          table[key.replace(/-/g, "_")] ||
          table[key.replace(/([A-Z])/g, "_$1").toLowerCase()];
        if (col) conditions.push(eq(col, value));
      }
    }

    return conditions;
  }

  private processResult(data: any, config: CollectionConfig): any {
    if (!data) return null;

    const result = { ...data };

    // Strip numeric string index keys if a string ID was previously spread into document properties
    for (const key of Object.keys(result)) {
      if (/^\d+$/.test(key)) {
        delete result[key];
      }
    }

    // Convert id field
    if (data.id) {
      result.id = String(data.id);
    }

    // Map snake_case SQL column names to camelCase field names
    // (createTableFromConfig converts field names like featuredImage → featured_image in SQL)
    for (const field of config.fields) {
      if (!field.name) continue;
      const sqlKey = field.name.replace(/-/g, "_").replace(/([A-Z])/g, "_$1").toLowerCase();
      if (sqlKey !== field.name && result[sqlKey] !== undefined && result[field.name] === undefined) {
        result[field.name] = result[sqlKey];
        delete result[sqlKey];
      }
    }

    // Parse JSON fields and upload/image fields
    for (const field of config.fields) {
      if (['json', 'richtext', 'array', 'group', 'blocks', 'upload', 'image', 'list', 'relationship-block'].includes((field as any).type)) {
        const f = field as any;
        if (result[f.name] && typeof result[f.name] === 'string') {
          try {
            const parsed = JSON.parse(result[f.name]);
            result[f.name] = parsed;
          } catch {
            // Keep original value
          }
        }
        if ((field as any).type === 'blocks' && result[f.name] && Array.isArray(result[f.name])) {
          const blockDefs = (f as any).blocks || [];
          result[f.name] = processBlocksUploadFields(result[f.name], blockDefs);
        }
      }
      
      // Handle nested tab fields - build nested structure
      if (field.type === 'tabs' && 'tabs' in field && field.name) {
        // If the tabs column already has an object (from JSONB or parsed above), parse nested upload/image fields
        if (typeof result[field.name] === 'object' && result[field.name] !== null && !Array.isArray(result[field.name])) {
          for (const tab of field.tabs) {
            for (const tabField of tab.fields) {
              if ((tabField.type === 'upload' || tabField.type === 'image') && tabField.name) {
                const val = result[field.name][tabField.name];
                if (typeof val === 'string') {
                  try { 
                    const parsed = JSON.parse(val);
                    result[field.name][tabField.name] = Array.isArray(parsed)
                      ? parsed.map((item: any) => item && typeof item === 'object' && typeof item.id === 'string' ? item.id : String(item || ''))
                      : typeof parsed.id === 'string' ? parsed.id : String(parsed.id || '');
                  } catch {}
                } else if (val && typeof val === 'object') {
                  result[field.name][tabField.name] = Array.isArray(val)
                    ? val.map((item: any) => item && typeof item === 'object' && typeof item.id === 'string' ? item.id : String(item || ''))
                    : typeof val.id === 'string' ? val.id : String(val.id || '');
                }
              }
            }
          }
          continue;
        }
        // If the tabs column is a JSON string, parse it
        if (typeof result[field.name] === 'string') {
          try {
            const parsed = JSON.parse(result[field.name]);
            if (typeof parsed === 'object' && parsed !== null) {
              result[field.name] = parsed;
              continue;
            }
          } catch { /* fall through to flat rebuild */ }
        }
        const tabData: any = {};
        for (const tab of field.tabs) {
          for (const tabField of tab.fields) {
            if (tabField.name && result[tabField.name] !== undefined) {
              let value = result[tabField.name];
                  if (['json', 'richtext', 'array', 'group', 'blocks', 'upload', 'image', 'list', 'relationship-block'].includes((tabField as any).type)) {
                    if (value && typeof value === 'string') {
                      try {
                        value = JSON.parse(value);
                      } catch {
                        // Keep original value
                      }
                    }
                    // Normalize upload/image to ID string
                    if ((tabField.type === 'upload' || tabField.type === 'image') && value && typeof value === 'object') {
                      value = Array.isArray(value)
                        ? (value as any[]).map((item: any) => item && typeof item === 'object' && typeof item.id === 'string' ? item.id : String(item || ''))
                        : typeof value.id === 'string' ? value.id : String(value.id || '');
                    }
                  }
              tabData[tabField.name] = value;
              delete result[tabField.name];
            }
          }
        }
        result[field.name] = tabData;
      }
    }

    // Convert timestamps to ISO strings
    if (result.createdAt) {
      result.createdAt = new Date(result.createdAt).toISOString();
    }
    if (result.updatedAt) {
      result.updatedAt = new Date(result.updatedAt).toISOString();
    }

    return sanitizeDoc(result);
  }

  private async ensureVersionsTable(): Promise<void> {
    if (this.versionsTableReady) return;

    let createTableSQL: string;
    if (this.dialect === 'sqlite') {
      createTableSQL = `
        CREATE TABLE IF NOT EXISTS kyro_versions (
          id text PRIMARY KEY,
          collection_slug text NOT NULL,
          document_id text NOT NULL,
          tenant_id text,
          data text NOT NULL,
          status text NOT NULL DEFAULT 'draft',
          autosave integer NOT NULL DEFAULT 0,
          created_by text,
          change_description text,
          created_at text DEFAULT (datetime('now')),
          updated_at text DEFAULT (datetime('now'))
        )
      `;
    } else {
      createTableSQL = `
        CREATE TABLE IF NOT EXISTS kyro_versions (
          id text PRIMARY KEY,
          collection_slug text NOT NULL,
          document_id text NOT NULL,
          tenant_id text,
          data text NOT NULL,
          status text NOT NULL,
          autosave integer NOT NULL DEFAULT 0,
          created_by text,
          change_description text,
          created_at text NOT NULL,
          updated_at text NOT NULL
        )
      `;
    }

    await this.executeRaw(sql.raw(createTableSQL));

    // Migration: add autosave column to existing tables
    try {
      if (this.dialect === 'postgres') {
        await this.executeRaw(sql.raw(`ALTER TABLE kyro_versions ADD COLUMN IF NOT EXISTS autosave integer NOT NULL DEFAULT 0`));
      } else {
        // SQLite does not support IF NOT EXISTS for ALTER TABLE
        await this.executeRaw(sql.raw(`ALTER TABLE kyro_versions ADD COLUMN autosave integer NOT NULL DEFAULT 0`));
      }
    } catch {
      // Column already exists — safe to ignore
    }

    this.versionsTableReady = true;
  }

  public async execute<T = any>(query: any): Promise<T[]> {
    return this.executeRaw<T>(query);
  }

  private async executeRaw<T = any>(query: any): Promise<T[]> {
    let sqlString = '';
    let params: any[] = [];

    if (typeof query === 'string') {
      sqlString = query;
    } else if (query && (query.queryChunks || query.decoder)) {
      if (this.dialect === 'postgres') {
        const compiled = new PgDialect().sqlToQuery(query);
        sqlString = compiled.sql;
        params = compiled.params;
      } else {
        const compiled = new SQLiteSyncDialect().sqlToQuery(query);
        sqlString = compiled.sql;
        params = compiled.params;
      }
    } else if (query && typeof query.toSQL === 'function') {
      const compiled = query.toSQL();
      sqlString = compiled.sql;
      params = compiled.params || [];
    } else {
      sqlString = String(query);
    }

    const targetClient = this.rawClient || this.client;
    if (targetClient?.prepare && typeof targetClient.prepare === 'function') {
      const stmt = targetClient.prepare(sqlString);
      const res = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();
      return (res.results || []) as T[];
    }

    if (typeof this.client?.execute === 'function') {
      const result = await this.client.execute(query);
      if (Array.isArray(result)) {
        return result as T[];
      }
      if (Array.isArray(result?.rows)) {
        return result.rows as T[];
      }
      if (Array.isArray(result?.[0])) {
        return result[0] as T[];
      }
      return [];
    }
    return [];
  }

}

// ============================================================================
// Factory Functions
// ============================================================================

export function createDrizzleAdapter(options: {
  type?: 'postgres' | 'sqlite';
  client?: any;
  schema?: any;
  connectionString?: string;
}): DrizzleAdapter {
  return new DrizzleAdapter(options);
}
