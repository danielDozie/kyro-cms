import { createRequire } from "node:module";
let DatabaseSync: typeof import("node:sqlite").DatabaseSync;
function getDatabaseSync() {
  if (DatabaseSync) return DatabaseSync;
  // Fallback for environments like Cloudflare Workers where import.meta.url is undefined
  const _require = createRequire("file:///");
  DatabaseSync = _require("node:sqlite").DatabaseSync;
  return DatabaseSync;
}
import { randomBytes } from 'node:crypto';
import { AbstractBaseAdapter } from "../base.js";
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
  FindVersionsArgs,
  DocumentStatus,
  FindOneArgs,
} from "../../registry/types.js";
import type { Field } from "../../fields/types.js";
import type { TenantContext } from "../../auth/rls/tenant.js";
import { applyRLS, DEFAULT_RLS_CONFIG, canAccessDocument } from "../../auth/rls/tenant.js";
import { sanitizeDoc } from "../../utils/sanitize.js";

function flattenFields(fields: Field[]): Field[] {
  const result: Field[] = [];
  for (const field of fields) {
    if (field.type === "tabs" && "tabs" in field) {
      for (const tab of field.tabs) {
        result.push(...flattenFields(tab.fields));
      }
    } else if (field.type === "row" && "fields" in field) {
      result.push(...flattenFields(field.fields));
    } else if (field.type === "collapsible" && "fields" in field) {
      result.push(...flattenFields(field.fields));
    } else {
      result.push(field);
    }
  }
  return result;
}

function processFieldValue(row: any, field: Field): any {
  const f = field as any;
  let value = row[f.name];
  
  if (
    f.type === "json" ||
    f.type === "richtext" ||
    f.type === "array" ||
    f.type === "group" ||
    f.type === "blocks" ||
    f.type === "list" ||
    f.type === "relationship-block"
  ) {
    try {
      value = value ? JSON.parse(value) : null;
    } catch {
      value = null;
    }
  }

  if (f.type === "checkbox") {
    value = Boolean(value);
  }

  if (f.type === "date" && value) {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) {
        value = null;
      } else {
        value = d.toISOString();
      }
    } catch {
      value = null;
    }
  }

  if ((f.type === "upload" || f.type === "image") && value) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        value = parsed.map((item: any) => {
          if (typeof item === "object" && item !== null) {
            return item;
          }
          return { id: item };
        });
      } else {
        value = typeof parsed === "object" ? parsed : { id: parsed };
      }
    } catch {
      value = { id: value };
    }
  }

  if (f.type === "relationship" && value) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        value = parsed;
      } else {
        value = parsed;
      }
    } catch {
      value = { relationTo: Array.isArray(f.relationTo) ? f.relationTo[0] : f.relationTo, value };
    }
  }

  if (f.type === "list" && value) {
    try {
      const parsed = JSON.parse(value);
      value = Array.isArray(parsed) ? parsed : [];
    } catch {
      value = [];
    }
  }

  if (f.type === "relationship-block" && value) {
    try {
      const parsed = JSON.parse(value);
      value = Array.isArray(parsed) ? parsed : [];
    } catch {
      value = [];
    }
  }

  return value;
}

function processBlocksUploadFields(value: unknown, blockDefs: any[]): unknown {
  if (!Array.isArray(value)) return value;
  return value.map(block => {
    if (!block || typeof block !== "object") return block;
    const data = block.data ? { ...block.data } : undefined;
    if (!data) return block;
    const def = blockDefs.find((d: any) => d.slug === block.type || d.slug === block.slug);
    if (!def || !Array.isArray(def.fields)) return block;
    for (const f of def.fields) {
      if (f.name && (f.type === "upload" || f.type === "image") && data[f.name]) {
        const val = data[f.name];
        if (Array.isArray(val)) {
          data[f.name] = val.map((item: any) =>
            typeof item === "string" ? { id: item } : item
          );
        } else if (typeof val === "string") {
          data[f.name] = { id: val };
        }
      }
      if (f.type === "blocks" && f.name && data[f.name]) {
        const nestedDefs = (f as any).blocks || [];
        data[f.name] = processBlocksUploadFields(data[f.name], nestedDefs);
      }
    }
    return { ...block, data };
  });
}

function buildNestedDoc(row: any, fields: Field[]): any {
  const doc: any = {};
  
  for (const field of fields) {
    if (!field.name || field.name === "id") continue;
    
    if (field.type === "tabs" && "tabs" in field) {
      const tabData: any = {};
      for (const tab of field.tabs) {
        Object.assign(tabData, buildNestedDoc(row, tab.fields));
      }
      doc[field.name] = tabData;
    } else if (field.type === "row" && "fields" in field) {
      const rowData = buildNestedDoc(row, field.fields);
      Object.assign(doc, rowData);
    } else if (field.type === "collapsible" && "fields" in field) {
      doc[field.name] = buildNestedDoc(row, field.fields);
    } else {
      doc[field.name] = processFieldValue(row, field);
    }
  }
  
  return doc;
}

function getTableColumns(db: any, tableName: string): string[] {
  try {
    const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
    return rows.map((r: any) => r.name);
  } catch {
    return [];
  }
}

export class LocalAdapter extends AbstractBaseAdapter {
  private db: any;
  private path?: string;
  private migrations: Map<string, boolean> = new Map();
  private readonly versionsTableName = "kyro_versions";

  constructor(options: { db?: any; path?: string }) {
    super();
    this.path = options.path;

    if (options.db) {
      this.db = options.db;
    } else {
      this.db = null;
    }
  }

  async connect(): Promise<void> {
    if (!this.db) {
      this.db = new (getDatabaseSync())(this.path || ":memory:");
    } else {
      try {
        this.db.exec("SELECT 1");
      } catch {
        this.db = new (getDatabaseSync())(this.path || ":memory:");
      }
    }

    // Wrap prepare to serialize parameter bindings for Node.js node:sqlite DatabaseSync compatibility
    if (this.db && typeof this.db.prepare === "function" && !this.db.prepare.__wrapped) {
      const originalPrepare = this.db.prepare.bind(this.db);
      const wrappedPrepare = (sql: string) => {
        const stmt = originalPrepare(sql);
        const serialize = (val: any) => {
          if (typeof val === "boolean") return val ? 1 : 0;
          if (val === undefined) return null;
          return val;
        };
        return new Proxy(stmt, {
          get(target, prop, receiver) {
            if (prop === "all") {
              return (...params: any[]) => target.all(...params.map(serialize));
            }
            if (prop === "get") {
              return (...params: any[]) => target.get(...params.map(serialize));
            }
            if (prop === "run") {
              return (...params: any[]) => target.run(...params.map(serialize));
            }
            const val = Reflect.get(target, prop, receiver);
            return typeof val === "function" ? val.bind(target) : val;
          }
        });
      };
      wrappedPrepare.__wrapped = true;
      this.db.prepare = wrappedPrepare;
    }

    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA foreign_keys = ON");
    this.connected = true;

  }

  async disconnect(): Promise<void> {
    if (this.db) {
      try {
        this.db.close();
      } catch {
        // ignore error if connection was already closed
      }
      this.db = null;
    }
    this.connected = false;

  }

  // ========================================================================
  // Schema Management
  // ========================================================================

  private ensureTable(
    config: CollectionConfig | GlobalConfig,
    tableName?: string,
  ): void {
    const name = tableName || this.getTableNameFor(config.slug);

    const columns: string[] = [`id TEXT PRIMARY KEY`];

    for (const field of flattenFields(config.fields)) {
      if (!field.name || field.name === "id") continue;

      const colDef = this.fieldToSQL(field);
      if (colDef) columns.push(colDef);
    }

    // Always add timestamps for all tables if not already defined
    const flatFields = flattenFields(config.fields);
    if (!flatFields.some((f: any) => f.name === "createdAt")) {
      columns.push(`${this.col("createdAt")} TEXT DEFAULT (datetime('now'))`);
    }
    if (!flatFields.some((f: any) => f.name === "updatedAt")) {
      columns.push(`${this.col("updatedAt")} TEXT DEFAULT (datetime('now'))`);
    }
    // publishStatus: defaults to 'draft'
    if (!flatFields.some((f: any) => f.name === "status")) {
      columns.push(`status TEXT DEFAULT 'draft'`);
    }
    if (!flatFields.some((f: any) => f.name === "hasDraft")) {
      columns.push(`hasDraft INTEGER DEFAULT 0`);
    }

    if ((config as CollectionConfig).tenantScoped) {
      columns.push(`tenant_id TEXT NOT NULL`);
    }

    const existingColumns = getTableColumns(this.db, name);

    if (existingColumns.length === 0) {
      const createSQL = `CREATE TABLE IF NOT EXISTS ${name} (${columns.join(", ")})`;
      this.db.exec(createSQL);
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_${name}_status ON ${name}(status)`);

      for (const field of flattenFields(config.fields)) {
        if (field.name && field.indexed) {
          this.db.exec(
            `CREATE INDEX IF NOT EXISTS idx_${name}_${field.name} ON ${name}(${this.col(field.name)})`,
          );
        }
        if (field.name && field.unique) {
          this.db.exec(
            `CREATE UNIQUE INDEX IF NOT EXISTS idx_${name}_${field.name}_unique ON ${name}(${this.col(field.name)})`,
          );
        }
      }
    } else {
      const existingSet = new Set(existingColumns);
      for (const colDef of columns) {
        const colName = colDef.split(" ")[0].replace(/^"/, "").replace(/"$/, "");
        if (!existingSet.has(colName) && colName !== "id") {
          try {
            if (colName === "status") {
              this.db.exec(`ALTER TABLE ${name} ADD COLUMN ${this.col(colName)} TEXT DEFAULT 'published'`);
            } else if (colName === "hasDraft") {
              this.db.exec(`ALTER TABLE ${name} ADD COLUMN ${this.col(colName)} INTEGER DEFAULT 0`);
            } else {
              this.db.exec(`ALTER TABLE ${name} ADD COLUMN ${this.col(colName)} TEXT`);
            }
          } catch {
            // Column may already exist via concurrent migration
          }
        }
      }
    }

    this.migrations.set(name, true);
  }

  private ensureVersionsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.versionsTableName} (
        id TEXT PRIMARY KEY,
        collection_slug TEXT NOT NULL,
        document_id TEXT NOT NULL,
        tenant_id TEXT,
        version INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        autosave INTEGER NOT NULL DEFAULT 0,
        data TEXT NOT NULL,
        created_by TEXT,
        change_description TEXT,
        published_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    // Migration: add autosave column to existing tables
    try {
      this.db.exec(`ALTER TABLE ${this.versionsTableName} ADD COLUMN autosave INTEGER NOT NULL DEFAULT 0`);
    } catch {
      // Column already exists — safe to ignore
    }

    this.db.exec(
      `CREATE INDEX IF NOT EXISTS idx_${this.versionsTableName}_doc ON ${this.versionsTableName}(collection_slug, document_id)`,
    );
    this.db.exec(
      `CREATE INDEX IF NOT EXISTS idx_${this.versionsTableName}_status ON ${this.versionsTableName}(status)`,
    );
    this.db.exec(
      `CREATE INDEX IF NOT EXISTS idx_${this.versionsTableName}_autosave ON ${this.versionsTableName}(autosave)`,
    );
  }



  // ========================================================================
  // SQL Quoting
  // ========================================================================

  private resolveCol(tableName: string, colName: string): string {
    const cleanName = colName.replace(/^-/, "");
    const cols = getTableColumns(this.db, tableName);
    if (!cols.includes(cleanName)) {
      if (cleanName === "created_at" && cols.includes("createdAt")) return '"createdAt"';
      if (cleanName === "createdAt" && cols.includes("created_at")) return '"created_at"';
      if (cleanName === "updated_at" && cols.includes("updatedAt")) return '"updatedAt"';
      if (cleanName === "updatedAt" && cols.includes("updated_at")) return '"updated_at"';
    }
    return this.col(cleanName);
  }

  private col(name: string): string {
    return `"${name}"`;
  }

  private fieldToSQL(field: any): string | null {
    switch (field.type) {
      case "text":
      case "email":
      case "password":
      case "textarea":
      case "color":
      case "icon":
      case "code":
      case "markdown":
      case "url":
        return this.col(field.name) + " TEXT";
      case "number":
        return this.col(field.name) + " REAL";
      case "checkbox":
        return this.col(field.name) + " INTEGER DEFAULT 0";
      case "date":
        return this.col(field.name) + " TEXT";
      case "select":
      case "radio":
        return this.col(field.name) + " TEXT";
      case "relationship":
      case "upload":
        return this.col(field.name) + " TEXT";
      case "json":
      case "richtext":
      case "array":
      case "group":
      case "blocks":
        return this.col(field.name) + " TEXT";
      default:
        return null;
    }
  }

  // ========================================================================
  // CRUD Operations
  // ========================================================================

  private parseGlobalsSlug(slug: string): {
    isGlobal: boolean;
    globalSlug: string;
    tableName: string;
  } {
    if (slug.startsWith("_globals_")) {
      const globalSlug = slug.replace("_globals_", "");
      return {
        isGlobal: true,
        globalSlug,
        tableName: `global_${globalSlug.replace(/-/g, "_")}`,
      };
    }
    return {
      isGlobal: false,
      globalSlug: "",
      tableName: this.getTableNameFor(slug),
    };
  }

  async find<T>(args: FindArgs): Promise<FindResult<T>> {
    const {
      collection: slug,
      where = {},
      sort,
      limit = 10,
      page = 1,
      tenantId,
      draft = false,
    } = args;
    const parsed = this.parseGlobalsSlug(slug);
    const config = parsed.isGlobal 
      ? this.globals.get(parsed.globalSlug)! 
      : this.getCollection(slug);
    
    this.ensureTable(config, parsed.tableName);

    const tableName = parsed.tableName;
    let sql = `SELECT * FROM ${tableName}`;
    const params: any[] = [];
    const conditions: string[] = [];

    let effectiveWhere = { ...where };
    if (this.tenantContext && (config as CollectionConfig).tenantScoped) {
      const rlsQuery = applyRLS({ where: effectiveWhere }, slug, this.tenantContext, DEFAULT_RLS_CONFIG);
      effectiveWhere = rlsQuery.where || {};
    }

    // Public API: only show published. Admin (draft=true): show all.
    const statusField = config.fields.find((f: any) => f.name === 'status');
    const hasPublished = statusField?.type === 'select' && Array.isArray(statusField.options) && statusField.options.some((o: any) => o.value === 'published');
    if (!draft && hasPublished) {
      conditions.push(`status = ?`);
      params.push('published');
    }

    if (tenantId && (config as CollectionConfig).tenantScoped) {
      conditions.push(`tenant_id = ?`);
      params.push(tenantId);
    }

      for (const [key, value] of Object.entries(effectiveWhere)) {
        if (key === "AND" || key === "OR") continue;
        const colSql = this.resolveCol(tableName, key);

        if (typeof value === "object" && value !== null) {
          if (value.equals !== undefined) {
            conditions.push(`${colSql} = ?`);
            params.push(value.equals);
          }
          if (value.in !== undefined) {
            conditions.push(`${colSql} IN (${value.in.map(() => "?").join(", ")})`);
            params.push(...value.in);
          }
          if (value.not_equals !== undefined) {
            conditions.push(`${colSql} != ?`);
            params.push(value.not_equals);
          }
        } else {
          conditions.push(`${colSql} = ?`);
          params.push(value);
        }
      }

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(" AND ")}`;
      }

      const rawSort = sort || "-createdAt";
      const sortField = this.resolveCol(tableName, rawSort);
      const sortDir = rawSort.startsWith("-") ? "DESC" : "ASC";
      sql += ` ORDER BY ${sortField} ${sortDir}`;

    const countSql = sql.replace("SELECT *", "SELECT COUNT(*) as count");
    const countResult = this.db.prepare(countSql).get(...params) as {
      count: number;
    };
    const totalDocs = countResult?.count || 0;

    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, (page - 1) * limit);

    const rows = this.db.prepare(sql).all(...params);
    let docs = rows.map((row: any) => this.rowToDoc(row, config));

    if (this.tenantContext && !this.tenantContext.isSuperAdmin) {
      docs = docs.filter((doc: any) => canAccessDocument(doc, slug, this.tenantContext!, DEFAULT_RLS_CONFIG));
    }

    // If draft: true, merge the latest version (autosave or manual) into the response
    if (draft) {
      docs = await Promise.all(docs.map(async (doc: any) => {
        const version = this.db
          .prepare(`SELECT * FROM ${this.versionsTableName} WHERE collection_slug = ? AND document_id = ? AND tenant_id IS NULL ORDER BY version DESC LIMIT 1`)
          .get(slug, doc.id) as any;
        if (version) {
          const versionData = version.data ? JSON.parse(version.data) : {};
          return sanitizeDoc({ ...doc, ...versionData, status: doc.status, _hasUnpublishedChanges: version.status === 'draft' });
        }
        return doc;
      }));
    }

    docs = docs.map((d: any) => sanitizeDoc(d));

    return {
      docs: docs as T[],
      totalDocs,
      limit,
      totalPages: Math.ceil(totalDocs / limit),
      page,
      pagingCounter: (page - 1) * limit + 1,
      hasPrevPage: page > 1,
      hasNextPage: page < Math.ceil(totalDocs / limit),
      prevPage: page > 1 ? page - 1 : null,
      nextPage: page < Math.ceil(totalDocs / limit) ? page + 1 : null,
    };
  }

  async findByID<T>(args: FindByIDArgs): Promise<T | null> {
    const { collection: slug, id, tenantId, draft = false } = args;
    const parsed = this.parseGlobalsSlug(slug);
    const config = parsed.isGlobal 
      ? this.globals.get(parsed.globalSlug)! 
      : this.getCollection(slug);
    
    this.ensureTable(config, parsed.tableName);

    const tableName = parsed.tableName;
    let sql = `SELECT * FROM ${tableName} WHERE id = ?`;
    const params: any[] = [id];

    if (this.tenantContext && (config as CollectionConfig).tenantScoped) {
      const tempDoc = { id, tenant_id: this.tenantContext.tenantId };
      if (!canAccessDocument(tempDoc, slug, this.tenantContext, DEFAULT_RLS_CONFIG)) {
        return null;
      }
    }

    // Public API: only show published docs. Admin (draft=true): skip status filter.
    const statusField = config.fields.find((f: any) => f.name === 'status');
    const hasPublished = statusField?.type === 'select' && Array.isArray(statusField.options) && statusField.options.some((o: any) => o.value === 'published');
    if (!draft && hasPublished) {
      sql += ` AND status = ?`;
      params.push('published');
    }

    if (tenantId && (config as CollectionConfig).tenantScoped) {
      sql += ` AND tenant_id = ?`;
      params.push(tenantId);
    }

    const row = this.db.prepare(sql).get(...params);
    if (!row) return null;

    let doc = this.rowToDoc(row as any, config);

    // If draft: true, merge the latest version (autosave or manual) into the response
    if (draft) {
      const version = this.db
        .prepare(`SELECT * FROM ${this.versionsTableName} WHERE collection_slug = ? AND document_id = ? AND tenant_id IS NULL ORDER BY version DESC LIMIT 1`)
        .get(slug, doc.id) as any;
      if (version) {
        const versionData = version.data ? JSON.parse(version.data) : {};
        doc = { ...doc, ...versionData, status: doc.status, _hasUnpublishedChanges: version.status === 'draft' };
      }
    }

    return sanitizeDoc(doc) as T;
  }

  async create<T>(args: CreateArgs): Promise<T> {
    const { collection: slug, data, tenantId } = args;
    const parsed = this.parseGlobalsSlug(slug);
    const config = parsed.isGlobal 
      ? this.globals.get(parsed.globalSlug)! 
      : this.getCollection(slug);
    
    this.ensureTable(config, parsed.tableName);

    const tableName = parsed.tableName;
    const id = parsed.isGlobal ? parsed.globalSlug : (data.id || this.generateId());

    const insertData = this.prepareData(data, config);
    insertData.id = id;
    const now = new Date().toISOString();
    insertData.created_at = now;
    insertData.updated_at = now;

    if (tenantId && (config as CollectionConfig).tenantScoped) {
      insertData.tenant_id = tenantId;
    }

    const columns = Object.keys(insertData);

    // Filter data to only include valid columns
    const validColumns = getTableColumns(this.db, tableName);
    const filteredData: Record<string, any> = {};
    for (const key of columns) {
      if (validColumns.includes(key)) {
        filteredData[key] = insertData[key];
      }
    }

    const filteredColumns = Object.keys(filteredData);
    const quotedColumns = filteredColumns.map(c => this.col(c));
    const placeholders = filteredColumns.map(() => "?").join(", ");
    const values = Object.values(filteredData).map((v: any) =>
      v !== null && typeof v === "object" ? JSON.stringify(v) : v,
    );

    this.db
      .prepare(
        `INSERT OR REPLACE INTO ${tableName} (${quotedColumns.join(", ")}) VALUES (${placeholders})`,
      )
      .run(...values);

    this.ensureVersionsTable();
    return this.findByID<T>({ collection: slug, id, tenantId, draft: true }) as Promise<T>;
  }

  async update<T>(args: UpdateArgs): Promise<T> {
    const { collection: slug, id, data, tenantId } = args;
    const parsed = this.parseGlobalsSlug(slug);
    const config = parsed.isGlobal 
      ? this.globals.get(parsed.globalSlug)! 
      : this.getCollection(slug);
    
    this.ensureTable(config, parsed.tableName);

    const tableName = parsed.tableName;
    const updateData = this.prepareData(data, config);
    updateData.updated_at = new Date().toISOString();

    // Filter data to only include valid columns
    const validColumns = getTableColumns(this.db, tableName);
    const filteredData: Record<string, any> = {};
    for (const key of Object.keys(updateData)) {
      if (validColumns.includes(key)) {
        filteredData[key] = updateData[key];
      }
    }

    const columns = Object.keys(filteredData);
    const setClause = columns.map((c) => `${this.col(c)} = ?`).join(", ");
    const values = Object.values(filteredData).map((v: any) =>
      v !== null && typeof v === "object" ? JSON.stringify(v) : v,
    );

    let sql = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
    const params = [...values, id];

    if (tenantId && (config as CollectionConfig).tenantScoped) {
      sql += ` AND tenant_id = ?`;
      params.push(tenantId);
    }

    this.db.prepare(sql).run(...params);

    this.ensureVersionsTable();
    return this.findByID<T>({ collection: slug, id, tenantId, draft: true }) as Promise<T>;
  }

  async delete<T>(args: DeleteArgs): Promise<T> {
    const { collection: slug, id, tenantId } = args;
    const parsed = this.parseGlobalsSlug(slug);
    const config = parsed.isGlobal 
      ? this.globals.get(parsed.globalSlug)! 
      : this.getCollection(slug);
    
    this.ensureTable(config, parsed.tableName);
    this.ensureVersionsTable();

    const doc = await this.findByID<T>({ collection: slug, id, tenantId, draft: true });
    if (!doc) throw new Error(`Document not found: ${slug}/${id}`);

    const tableName = parsed.tableName;
    let sql = `DELETE FROM ${tableName} WHERE id = ?`;
    const params: any[] = [id];

    if (tenantId && (config as CollectionConfig).tenantScoped) {
      sql += ` AND tenant_id = ?`;
      params.push(tenantId);
    }

    this.db.prepare(sql).run(...params);

    return doc;
  }

  async count(args: {
    collection: string;
    where?: Record<string, any>;
    tenantId?: string;
  }): Promise<number> {
    const { collection: slug, tenantId } = args;
    const parsed = this.parseGlobalsSlug(slug);
    const config = parsed.isGlobal 
      ? this.globals.get(parsed.globalSlug)! 
      : this.getCollection(slug);
    
    this.ensureTable(config, parsed.tableName);

    const tableName = parsed.tableName;
    let sql = `SELECT COUNT(*) as count FROM ${tableName}`;
    const params: any[] = [];

    if (tenantId && (config as CollectionConfig).tenantScoped) {
      sql += ` WHERE tenant_id = ?`;
      params.push(tenantId);
    }

    const result = this.db.prepare(sql).get(...params) as { count: number };
    return result?.count || 0;
  }

  async findOne(args: FindOneArgs): Promise<any> {
    const parsed = this.parseGlobalsSlug(args.collection);
    if (parsed.isGlobal) {
      const globalConfig = this.globals.get(parsed.globalSlug);
      if (!globalConfig) {
        throw new Error(`Global "${parsed.globalSlug}" not found in adapter`);
      }
      this.ensureTable(globalConfig, parsed.tableName);

      let sql = `SELECT * FROM ${parsed.tableName}`;
      const conditions: string[] = [];
      const params: any[] = [];

      const statusField = globalConfig.fields.find((f: any) => f.name === 'status');
      const hasPublished = statusField?.type === 'select' && Array.isArray(statusField.options) && statusField.options.some((o: any) => o.value === 'published');
      if (!args.draft && globalConfig.versions && hasPublished) {
        conditions.push("status = 'published'");
      }

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(" AND ")}`;
      }

      sql += " LIMIT 1";

      const result = this.db.prepare(sql).get(...params) as any;
      if (result) {
        let doc = this.rowToDoc(result, globalConfig);

        // If draft: true, merge the latest version (autosave or manual) into the response
        if (args.draft) {
          const version = this.db
            .prepare(`SELECT * FROM ${this.versionsTableName} WHERE collection_slug = ? AND document_id = ? AND tenant_id IS NULL ORDER BY version DESC LIMIT 1`)
            .get(args.collection, parsed.globalSlug) as any;
          if (version) {
            const versionData = version.data ? JSON.parse(version.data) : {};
            doc = { ...doc, ...versionData, status: doc.status, _hasUnpublishedChanges: version.status === 'draft' };
          }
        }
        return doc;
      }
      return null;
    }
    const result = await this.find({ ...args, limit: 1 });
    return result.docs[0] || null;
  }

  // ========================================================================
  // Version History
  // ========================================================================

  async findVersions(args: FindVersionsArgs): Promise<FindResult<VersionRecord>> {
    this.ensureVersionsTable();
    const { collection, documentId, tenantId, limit = 20, page = 1 } = args;
    const conditions = [`collection_slug = ?`, `document_id = ?`, `autosave = 0`];
    const params: any[] = [collection, documentId];

    if (tenantId) {
      conditions.push(`tenant_id = ?`);
      params.push(tenantId);
    } else {
      conditions.push(`tenant_id IS NULL`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const countResult = this.db
      .prepare(`SELECT COUNT(*) as count FROM ${this.versionsTableName} ${where}`)
      .get(...params) as { count: number };
    const totalDocs = countResult?.count || 0;

    const offset = (page - 1) * limit;
    const rows = this.db
      .prepare(`SELECT * FROM ${this.versionsTableName} ${where} ORDER BY version DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as any[];

    const docs = rows.map((r) => this.rowToVersion(r));
    return {
      docs,
      totalDocs,
      limit,
      totalPages: Math.ceil(totalDocs / limit),
      page,
      pagingCounter: (page - 1) * limit + 1,
      hasPrevPage: page > 1,
      hasNextPage: page < Math.ceil(totalDocs / limit),
      prevPage: page > 1 ? page - 1 : null,
      nextPage: page < Math.ceil(totalDocs / limit) ? page + 1 : null,
    };
  }

  async findVersionByID(args: { collection: string; versionId: string; tenantId?: string }): Promise<VersionRecord | null> {
    this.ensureVersionsTable();
    const row = this.db
      .prepare(`SELECT * FROM ${this.versionsTableName} WHERE id = ? AND collection_slug = ? LIMIT 1`)
      .get(args.versionId, args.collection) as any;
    return row ? this.rowToVersion(row) : null;
  }

  async createVersion<T = Record<string, any>>(args: CreateVersionArgs<T>): Promise<VersionRecord<T>> {
    this.ensureVersionsTable();
    const now = new Date().toISOString();

    // Autosave: reuse existing autosave slot instead of creating a new row
    if (args.autosave) {
      let sql = `SELECT * FROM ${this.versionsTableName} WHERE collection_slug = ? AND document_id = ? AND autosave = 1`;
      const params: any[] = [args.collection, args.documentId];
      if (args.tenantId) {
        sql += ` AND tenant_id = ?`;
        params.push(args.tenantId);
      } else {
        sql += ` AND tenant_id IS NULL`;
      }
      sql += ` LIMIT 1`;
      const existing = this.db.prepare(sql).get(...params) as any;
      if (existing) {
        this.db
          .prepare(`UPDATE ${this.versionsTableName} SET data = ?, status = ?, updated_at = ? WHERE id = ?`)
          .run(JSON.stringify(args.data), args.status, now, existing.id);
        const result = await this.findVersionByID({ collection: args.collection, versionId: existing.id });
        if (result) return result as VersionRecord<T>;
      }
    }

    const id = this.generateId();

    // Get next version number
    const latestRow = this.db
      .prepare(`SELECT version FROM ${this.versionsTableName} WHERE collection_slug = ? AND document_id = ? AND autosave = 0 ORDER BY version DESC LIMIT 1`)
      .get(args.collection, args.documentId) as any;
    const nextVersion = (latestRow?.version ?? 0) + 1;

    this.db
      .prepare(
        `INSERT INTO ${this.versionsTableName} (
          id, collection_slug, document_id, tenant_id, version, status, autosave, data, created_by, change_description, published_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        args.collection,
        args.documentId,
        args.tenantId ?? null,
        nextVersion,
        args.status,
        args.autosave ? 1 : 0,
        JSON.stringify(args.data),
        args.createdBy ?? null,
        args.changeDescription ?? null,
        args.status === 'published' ? now : null,
        now,
        now,
      );

    // Prune old versions — skip for autosave versions (only one per doc, not counted toward limit)
    if (!args.autosave) {
      const collectionConfig = this.collections.get(args.collection);
      const maxPerDoc = (collectionConfig as CollectionConfig)?.versions?.maxPerDoc;
      if (maxPerDoc && maxPerDoc > 0) {
        await this.deleteVersions({ collection: args.collection, documentId: args.documentId, keepLatest: maxPerDoc, tenantId: args.tenantId });
      }
    }

    const saved = await this.findVersionByID({ collection: args.collection, versionId: id });
    return saved as VersionRecord<T>;
  }

  async updateLatestVersion<T = Record<string, any>>(args: CreateVersionArgs<T>): Promise<VersionRecord<T>> {
    return this.createVersion({ ...args, autosave: true });
  }

  async deleteVersions(args: { collection: string; documentId: string; keepLatest?: number; tenantId?: string }): Promise<void> {
    this.ensureVersionsTable();
    const { collection, documentId, keepLatest, tenantId } = args;

    if (keepLatest && keepLatest > 0) {
      // Delete all non-published, non-autosave versions beyond the keepLatest limit
      const rows = this.db
        .prepare(`SELECT id, status, autosave FROM ${this.versionsTableName} WHERE collection_slug = ? AND document_id = ? ORDER BY version DESC`)
        .all(collection, documentId) as any[];

      // Always keep published and autosave versions; prune non-published beyond the limit
      let draftCount = 0;
      const toDelete: string[] = [];
      for (const row of rows) {
        if (row.status === 'published' || row.autosave === 1) continue;
        draftCount++;
        if (draftCount > keepLatest) toDelete.push(row.id);
      }

      for (const vid of toDelete) {
        this.db.prepare(`DELETE FROM ${this.versionsTableName} WHERE id = ?`).run(vid);
      }
    } else {
      // Delete all versions for this document
      let sql = `DELETE FROM ${this.versionsTableName} WHERE collection_slug = ? AND document_id = ?`;
      const params: any[] = [collection, documentId];
      if (tenantId) { sql += ` AND tenant_id = ?`; params.push(tenantId); }
      this.db.prepare(sql).run(...params);
    }
  }

  private rowToVersion<T = Record<string, any>>(row: any): VersionRecord<T> {
    return {
      id: String(row.id),
      collection: row.collection_slug,
      documentId: row.document_id,
      version: row.version,
      status: row.status as DocumentStatus,
      data: row.data ? JSON.parse(row.data) : {},
      createdBy: row.created_by ?? undefined,
      changeDescription: row.change_description ?? undefined,
      publishedAt: row.published_at ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }



  // ========================================================================
  // Helpers
  // ========================================================================

  protected prepareData(
    data: Record<string, any>,
    config: CollectionConfig | GlobalConfig,
  ): Record<string, any> {
    const result: Record<string, any> = {};
    const fields = flattenFields(config.fields);

    // Helper to process a field value
    const processValue = (field: Field, value: any): any => {
      const f = field as any;
      if (
        f.type === "json" ||
        f.type === "richtext" ||
        f.type === "array" ||
        f.type === "group" ||
        f.type === "blocks" ||
        f.type === "list" ||
        f.type === "relationship-block"
      ) {
        return value !== null && value !== undefined ? JSON.stringify(value) : null;
      } else if (f.type === "checkbox") {
        return value ? 1 : 0;
      } else if (f.type === "number") {
        return value !== null && value !== "" ? Number(value) : null;
      } else if (f.type === "upload" || f.type === "image") {
        if (value === null || value === undefined) return null;
        if (Array.isArray(value)) {
          const items = value.map((v: any) => {
            if (typeof v === "string") return v;
            if (typeof v === "object") return v.id || v._id || v;
            return String(v);
          });
          return JSON.stringify(items);
        }
        if (typeof value === "string") return value;
        if (typeof value === "object") return JSON.stringify(value);
        return String(value);
      } else if (field.type === "relationship") {
        if (value === null || value === undefined) return null;
        if (Array.isArray(value)) {
          const rels = value.map((v: any) => {
            if (typeof v === "string") return v;
            if (typeof v === "object") return JSON.stringify({ relationTo: field.relationTo, value: v.id || v });
            return String(v);
          });
          return JSON.stringify(rels);
        }
        if (typeof value === "string") return value;
        if (typeof value === "object") return JSON.stringify({ relationTo: field.relationTo, value: value.id || value });
        return String(value);
      }
      return value;
    };

    // First pass: process top-level fields
    for (const field of fields) {
      if (!field.name || field.name === "id") continue;
      
      // Skip fields that are inside named tabs (they'll be handled separately)
      const isInTab = config.fields.some(f => 
        f.type === "tabs" && f.name && "tabs" in f && 
        f.tabs.some(t => t.fields.some(tf => tf.name === field.name))
      );
      if (isInTab) continue;
      
      const value = data[field.name];
      if (value !== undefined) {
        result[field.name] = processValue(field, value);
      }
    }

    // Second pass: process nested tab fields
    for (const field of config.fields) {
      if (field.type === "tabs" && "tabs" in field && field.name) {
        const tabData = data[field.name];
        if (tabData && typeof tabData === "object") {
          for (const tab of field.tabs) {
            for (const tabField of tab.fields) {
              if (tabField.name && tabField.name !== "id") {
                const value = tabData[tabField.name];
                if (value !== undefined) {
                  result[tabField.name] = processValue(tabField, value);
                }
              }
            }
          }
        }
      }
    }

    return result;
  }

  private rowToDoc(row: any, config: CollectionConfig | GlobalConfig): any {
    const doc: any = { id: row.id };

    for (const field of flattenFields(config.fields)) {
      if (!field.name || field.name === "id") continue;

      const f = field as any;
      let value = row[f.name];

      if (
        f.type === "json" ||
        f.type === "richtext" ||
        f.type === "array" ||
        f.type === "group" ||
        f.type === "blocks" ||
        f.type === "list" ||
        f.type === "relationship-block"
      ) {
        try {
          value = value ? JSON.parse(value) : null;
        } catch {
          value = null;
        }
      }

      if (f.type === "blocks" && value && Array.isArray(value)) {
        const blockDefs = (f as any).blocks || [];
        value = processBlocksUploadFields(value, blockDefs);
      }

      if (field.type === "checkbox") {
        value = Boolean(value);
      }

      if (field.type === "date" && value) {
        try {
          const d = new Date(value);
          if (isNaN(d.getTime())) {
            console.warn(`[LocalAdapter] Invalid date value for field "${field.name}":`, value);
            value = null;
          } else {
            value = d.toISOString();
          }
        } catch {
          value = null;
        }
      }

      if ((field.type === "upload" || field.type === "image") && value) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            value = parsed.map((item: any) => {
              if (typeof item === "object" && item !== null) {
                return item; // Keep full object with id, url, etc.
              }
              return { id: item };
            });
          } else {
            // If it's an object, keep it; otherwise assume it's just an ID
            value = typeof parsed === "object" ? parsed : { id: parsed };
          }
        } catch {
          value = { id: value };
        }
      }

      if (field.type === "relationship" && value) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            value = parsed;
          } else {
            value = parsed;
          }
        } catch {
          value = { relationTo: Array.isArray(field.relationTo) ? field.relationTo[0] : field.relationTo, value };
        }
      }

      doc[field.name] = value;
    }

    // Build nested structure for tab/row/collapsible fields
    for (const field of config.fields) {
      if (!field.name || field.name === "id" || field.name === "row" || field.name === "collapsible") continue;
      
      if (field.type === "tabs" && "tabs" in field) {
        const tabData: any = {};
        for (const tab of field.tabs) {
          for (const tabField of tab.fields) {
            if (tabField.name && tabField.name !== "id") {
              // Get the processed value for this tab field
              tabData[tabField.name] = processFieldValue(row, tabField);
            }
          }
        }
        doc[field.name] = tabData;
      }
    }

    if ((config as CollectionConfig).timestamps) {
      const cAt = row.createdAt || row.created_at;
      const uAt = row.updatedAt || row.updated_at;
      
      if (cAt) {
        try {
          const d = new Date(cAt);
          if (!isNaN(d.getTime())) doc.createdAt = d.toISOString();
        } catch {}
      }
      
      if (uAt) {
        try {
          const d = new Date(uAt);
          if (!isNaN(d.getTime())) doc.updatedAt = d.toISOString();
        } catch {}
      }
    }

    if ((config as CollectionConfig).tenantScoped) {
      doc.tenantId = row.tenant_id;
    }

    doc.status = row.status ?? 'published';
    doc.hasDraft = row.hasDraft ? Boolean(row.hasDraft) : false;

    // Strip numeric string index keys if a string ID was previously spread into document properties
    for (const key of Object.keys(doc)) {
      if (/^\d+$/.test(key)) {
        delete doc[key];
      }
    }

    return doc;
  }

  private generateId(): string {
    const timestamp = Date.now().toString(16).padStart(12, '0');
    const random = randomBytes(6).toString('hex');
    return timestamp + random;
  }

  private getMediaById(mediaId: string): { id: string; url: string; thumbnailUrl?: string } | null {
    try {
      const tableName = this.getTableNameFor("media");
      const row = this.db.prepare(`SELECT id, url, thumbnail_url FROM ${tableName} WHERE id = ?`).get(mediaId) as any;
      if (row) {
        return {
          id: row.id,
          url: row.url,
          thumbnailUrl: row.thumbnail_url || row.url,
        };
      }
    } catch (err) {
      // Media table might not exist or query failed
    }
    return null;
  }

  private getTableNameFor(slug: string): string {
    return slug.replace(/-/g, "_");
  }



  // ========================================================================
  // Migrations
  // ========================================================================

  async migrate(): Promise<void> {
    for (const config of this.collections.values()) {
      this.ensureTable(config);
    }

  }

  async rollback(): Promise<void> {

  }

  // ========================================================================
  // Transaction Support
  // ========================================================================

  async transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(async () => {
        return fn({ db: this.db });
      });

      try {
        const result = tx();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ========================================================================
  // Direct DB Access
  // ========================================================================

  getDatabase(): any {
    return this.db;
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  prepare(sql: string) {
    return this.db.prepare(sql);
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createLocalAdapter(options?: {
  db?: any;
  path?: string;
}): LocalAdapter {
  return new LocalAdapter(options || {});
}
