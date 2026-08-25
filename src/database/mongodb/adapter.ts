import { autoInstall } from "../../utils/auto-install.js";
import { randomBytes } from 'crypto';
import { AbstractBaseAdapter } from '../base.js';
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
  FindOneArgs,
} from '../../registry/types.js';
import type { TenantContext } from '../../auth/rls/tenant.js';
import { applyRLS, DEFAULT_RLS_CONFIG, canAccessDocument } from '../../auth/rls/tenant.js';
import { sanitizeDoc } from '../../utils/sanitize.js';

export class MongoDBAdapter extends AbstractBaseAdapter {
  public dialect = 'mongodb' as const;
  public client: any;
  public db: any;
  private database: string;
  private connectionString?: string;
  // NOTE: draftsCollectionName removed — autosave now uses versions table with autosave flag

  constructor(options: {
    client?: any;
    database?: string;
    connectionString?: string;
  }) {
    super();
    if (options.connectionString) {
      this.connectionString = options.connectionString;
      try {
        const url = new URL(options.connectionString);
        this.database = url.pathname.replace(/^\//, '') || 'kyro_cms';
      } catch {
        this.database = 'kyro_cms';
      }
    } else {
      this.client = options.client;
      this.database = options.database!;
    }
  }

  async connect(): Promise<void> {
    if (this.connectionString && !this.client) {
      let MongoClient;
      try {
        const mongoMod: any = await import(/* @vite-ignore */ 'mongodb' as any);
        MongoClient = mongoMod.MongoClient ?? mongoMod.default?.MongoClient;
      } catch (e) {
        autoInstall(["mongodb"]);
        const mongoMod: any = await import(/* @vite-ignore */ 'mongodb' as any);
        MongoClient = mongoMod.MongoClient ?? mongoMod.default?.MongoClient;
      }
      this.client = new MongoClient(this.connectionString);
      await this.client.connect();
    } else if (this.client && typeof this.client.connect === "function") {
      try {
        await this.client.connect();
      } catch (e) {
        // Already connected or connect in progress
      }
    }
    if (this.client) {
      this.db = this.client.db(this.database);
      this.connected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.connected = false;
    }
  }

  private getMongoCollection(slug: string): any {
    if (!this.db && this.client) {
      this.db = this.client.db(this.database);
      this.connected = true;
    }
    if (!this.db) {
      throw new Error('MongoDB not connected');
    }
    return this.db.collection(slug);
  }

  async find<T>(args: FindArgs): Promise<FindResult<T>> {
    const { collection: slug, where = {}, sort, limit = 10, page = 1, tenantId, select, draft } = args;
    const config = this.getCollectionConfig(slug);
    const col = this.getMongoCollection(slug);

    let effectiveWhere = { ...where };
    if (this.tenantContext && config.tenantScoped) {
      const rlsQuery = applyRLS({ where: effectiveWhere }, slug, this.tenantContext, DEFAULT_RLS_CONFIG);
      effectiveWhere = rlsQuery.where || {};
    }

    // Build filter
    const filter = this.buildFilter(effectiveWhere, config.tenantScoped ? tenantId : undefined);

    // Default filter for non-draft requests: only show published
    const statusField = config.fields.find((f: any) => f.name === 'status');
    const hasPublished = statusField?.type === 'select' && Array.isArray(statusField.options) && statusField.options.some((o: any) => o.value === 'published');
    if (!draft && hasPublished) {
      filter.status = 'published';
    }

    // Build sort
    const sortOption = this.parseSort(sort);
    const sortObj: Record<string, 1 | -1> = {
      [sortOption.field]: sortOption.direction === 'asc' ? 1 : -1,
    };

    // Execute query
    const skip = (page - 1) * limit;

    const [docs, totalDocs] = await Promise.all([
      col
        .find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .project(this.buildProjection(select))
        .toArray(),
      col.countDocuments(filter),
    ]);

    // Process results
    let processedDocs = docs.map((doc: any) => this.processResult(doc, config));

    if (this.tenantContext && !this.tenantContext.isSuperAdmin) {
      processedDocs = processedDocs.filter((doc: any) => canAccessDocument(doc, slug, this.tenantContext!, DEFAULT_RLS_CONFIG));
    }

    // If draft: true, merge the latest version (autosave or manual) into the response
    if (draft) {
      processedDocs = await Promise.all(processedDocs.map(async (doc: any) => {
        const versionCollection = this.getMongoCollection(`${slug}_versions`);
        const version = await versionCollection.findOne(
          { document_id: doc.id },
          { sort: { createdAt: -1 } },
        );
        if (version) {
          const versionData = typeof version.data === 'string'
            ? JSON.parse(version.data)
            : (version.data && typeof version.data === 'object' ? version.data : {});
          return { ...doc, ...versionData, status: doc.status, _hasUnpublishedChanges: version.status === 'draft' };
        }
        return doc;
      }));
    }

    return {
      docs: processedDocs as T[],
      ...this.calculatePagination(page, limit, totalDocs),
    };
  }

  private buildIdFilter(id: string, tenantId?: string, config?: CollectionConfig): Record<string, any> {
    const rawId = String(id || "");
    const isHex24 = /^[0-9a-fA-F]{24}$/.test(rawId);

    const orClauses: any[] = [
      { _id: rawId },
      { id: rawId },
      { slug: rawId },
      { orderNumber: rawId },
    ];

    if (isHex24) {
      try {
        const { ObjectId } = require("mongodb");
        orClauses.unshift({ _id: new ObjectId(rawId) });
      } catch {
        // ignore
      }
    }

    const filter: Record<string, any> = { $or: orClauses };
    if (tenantId && config?.tenantScoped) {
      filter.tenantId = tenantId;
    }
    return filter;
  }

  async findByID<T>(args: FindByIDArgs): Promise<T | null> {
    const { collection: slug, id, tenantId, draft } = args;
    const config = this.getCollectionConfig(slug);
    const col = this.getMongoCollection(slug);

    if (this.tenantContext && config.tenantScoped) {
      const tempDoc = { _id: id, tenantId: this.tenantContext.tenantId };
      if (!canAccessDocument(tempDoc, slug, this.tenantContext, DEFAULT_RLS_CONFIG)) {
        return null;
      }
    }

    const filter = this.buildIdFilter(id, tenantId, config);

    const statusField = config.fields.find((f: any) => f.name === 'status');
    const hasPublished = statusField?.type === 'select' && Array.isArray(statusField.options) && statusField.options.some((o: any) => o.value === 'published');
    if (!draft && hasPublished) {
      filter.status = 'published';
    }

    const doc = await col.findOne(filter);
    if (!doc) return null;

    let processedDoc = this.processResult(doc, config);

    // If draft: true, merge the latest version (autosave or manual) into the response
    if (draft) {
      const versionCollection = this.getMongoCollection(`${slug}_versions`);
      const version = await versionCollection.findOne(
        { document_id: processedDoc.id },
        { sort: { createdAt: -1 } },
      );
      if (version) {
        const versionData = typeof version.data === 'string'
          ? JSON.parse(version.data)
          : (version.data && typeof version.data === 'object' ? version.data : {});
        processedDoc = { ...processedDoc, ...versionData, status: processedDoc.status, _hasUnpublishedChanges: version.status === 'draft' };
      }
    }

    return processedDoc as T;
  }

  async create<T>(args: CreateArgs): Promise<T> {
    const { collection: slug, data, tenantId } = args;
    const config = this.getCollectionConfig(slug);
    const col = this.getMongoCollection(slug);

    const preparedData = this.prepareData(data, config);
    const _id = preparedData.id || this.generateId();
    delete preparedData.id;

    const doc: any = {
      ...preparedData,
      _id,
    };

    if (tenantId && config.tenantScoped) {
      doc.tenantId = tenantId;
    }

    await col.insertOne(doc);

    return this.processResult(doc, config) as T;
  }

  async update<T>(args: UpdateArgs): Promise<T> {
    const { collection: slug, id, data, tenantId } = args;
    const config = this.getCollectionConfig(slug);
    const col = this.getMongoCollection(slug);

    const filter = this.buildIdFilter(id, tenantId, config);

    const updateData = this.prepareData(data, config);

    const result = await col.findOneAndUpdate(
      filter,
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new Error(`Document not found: ${slug}/${id}`);
    }

    return this.processResult(result, config) as T;
  }

  async delete<T>(args: DeleteArgs): Promise<T> {
    const { collection: slug, id, tenantId } = args;
    const config = this.getCollectionConfig(slug);
    const col = this.getMongoCollection(slug);

    const filter = this.buildIdFilter(id, tenantId, config);

    const doc = await col.findOneAndDelete(filter);
    if (!doc) {
      throw new Error(`Document not found: ${slug}/${id}`);
    }

    return this.processResult(doc, config) as T;
  }

  async count(args: { collection: string; where?: Record<string, any>; tenantId?: string }): Promise<number> {
    const { collection: slug, where = {}, tenantId } = args;
    const config = this.getCollectionConfig(slug);
    const col = this.getMongoCollection(slug);
    const filter = this.buildFilter(where, config.tenantScoped ? tenantId : undefined);
    return col.countDocuments(filter);
  }

  async findOne(args: FindOneArgs): Promise<any> {
    const { collection: slug, where = {}, tenantId, draft } = args;
    const config = this.getCollectionConfig(slug);
    const col = this.getMongoCollection(slug);
    const filter = this.buildFilter(where, config.tenantScoped ? tenantId : undefined);

    const statusField = config.fields.find((f: any) => f.name === 'status');
    const hasPublished = statusField?.type === 'select' && Array.isArray(statusField.options) && statusField.options.some((o: any) => o.value === 'published');
    if (!draft && hasPublished) {
      filter.status = 'published';
    }

    const doc = await col.findOne(filter);
    if (!doc) return null;

    let processedDoc = this.processResult(doc, config);

    // If draft: true, merge the latest version (autosave or manual) into the response
    if (draft) {
      const versionCollection = this.getMongoCollection(`${slug}_versions`);
      const version = await versionCollection.findOne(
        { document_id: processedDoc.id },
        { sort: { createdAt: -1 } },
      );
      if (version) {
        const versionData = typeof version.data === 'string'
          ? JSON.parse(version.data)
          : (version.data && typeof version.data === 'object' ? version.data : {});
        processedDoc = { ...processedDoc, ...versionData, status: processedDoc.status };
      }
    }

    return processedDoc;
  }

  async findVersions(args: FindVersionsArgs): Promise<FindResult<VersionRecord>> {
    const { collection: slug, documentId, sort, limit = 10, page = 1, tenantId } = args;

    const config = this.getCollectionConfig(slug);
    // Versions stored in a separate collection; exclude ephemeral autosave versions
    const versionCollection = this.getMongoCollection(`${slug}_versions`);
    const filter: any = { document_id: documentId, autosave: { $ne: true } };
    if (tenantId && config.tenantScoped) filter.tenant_id = tenantId;

    const skip = (page - 1) * limit;
    const sortOption = this.parseSort(sort);
    const sortObj: Record<string, 1 | -1> = {
      [sortOption.field]: sortOption.direction === 'asc' ? 1 : -1,
    };

    const [docs, totalDocs] = await Promise.all([
      versionCollection.find(filter).sort(sortObj).skip(skip).limit(limit).toArray(),
      versionCollection.countDocuments(filter),
    ]);

    return {
      docs: docs.map((doc: any) => this.processResult(doc, {} as CollectionConfig) as VersionRecord),
      ...this.calculatePagination(page, limit, totalDocs),
    };
  }

  async findVersionByID(args: { collection: string; versionId: string; tenantId?: string }): Promise<VersionRecord | null> {
    const { collection: slug, versionId, tenantId } = args;
    const config = this.getCollectionConfig(slug);
    const versionCollection = this.getMongoCollection(`${slug}_versions`);
    const filter: any = { _id: versionId };
    if (tenantId && config.tenantScoped) filter.tenant_id = tenantId;

    const doc = await versionCollection.findOne(filter);
    return doc ? this.processResult(doc, {} as CollectionConfig) as VersionRecord : null;
  }

  async createVersion<T = Record<string, any>>(args: CreateVersionArgs<T>): Promise<VersionRecord<T>> {
    const { collection: slug, documentId, data, status, createdBy, changeDescription, tenantId, autosave } = args;
    const config = this.getCollectionConfig(slug);
    const versionCollection = this.getMongoCollection(`${slug}_versions`);

    // Autosave: reuse existing autosave slot instead of creating a new row
    if (autosave) {
      const filter: any = { document_id: documentId, collection_slug: slug, autosave: true };
      if (tenantId && config.tenantScoped) filter.tenant_id = tenantId;
      const existing = await versionCollection.findOne(filter);
      if (existing) {
        const now = new Date().toISOString();
        await versionCollection.updateOne(
          { _id: existing._id },
          { $set: { data, status, updatedAt: now } },
        );
        return this.processResult({ ...existing, data, status, updatedAt: now }, {} as CollectionConfig) as VersionRecord<T>;
      }
    }

    const now = new Date().toISOString();
    const versionDoc: any = {
      _id: this.generateId(),
      document_id: documentId,
      collection_slug: slug,
      data,
      status,
      autosave: autosave === true,
      created_by: createdBy,
      change_description: changeDescription,
      createdAt: now,
      updatedAt: now,
    };
    if (tenantId && config.tenantScoped) {
      versionDoc.tenant_id = tenantId;
    }

    await versionCollection.insertOne(versionDoc);

    // Pruning logic — skip for autosave versions
    if (!autosave) {
      const config = this.getCollectionConfig(slug);
      if (config.versions?.maxPerDoc) {
        await this.deleteVersions({
          collection: slug,
          documentId: documentId,
          keepLatest: config.versions.maxPerDoc,
          tenantId: tenantId,
        });
      }
    }

    return this.processResult(versionDoc, {} as CollectionConfig) as VersionRecord<T>;
  }

  async updateLatestVersion<T = Record<string, any>>(args: CreateVersionArgs<T>): Promise<VersionRecord<T>> {
    return this.createVersion({ ...args, autosave: true });
  }

  async deleteVersions(args: { collection: string; documentId: string; keepLatest?: number; tenantId?: string }): Promise<void> {
    const { collection: slug, documentId, keepLatest, tenantId } = args;
    const config = this.getCollectionConfig(slug);
    const versionCollection = this.getMongoCollection(`${slug}_versions`);

    if (keepLatest) {
      const filter: any = { document_id: documentId, autosave: { $ne: true } };
      if (tenantId && config.tenantScoped) filter.tenant_id = tenantId;

      const toKeep = await versionCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(keepLatest)
        .project({ _id: 1 })
        .toArray();

      const keepIds = toKeep.map((doc: any) => doc._id);
      if (keepIds.length > 0) {
        await versionCollection.deleteMany({
          document_id: documentId,
          autosave: { $ne: true },
          _id: { $nin: keepIds },
          ...(tenantId && config.tenantScoped ? { tenant_id: tenantId } : {}),
        });
      }
    } else {
      const filter: any = { document_id: documentId };
      if (tenantId && config.tenantScoped) filter.tenant_id = tenantId;
      await versionCollection.deleteMany(filter);
    }
  }



  async migrate?(): Promise<void> {
    // Create indexes for all collections
    for (const config of this.collections.values()) {
      const col = this.getMongoCollection(config.slug);

      // Create default indexes
      await col.createIndex({ _id: 1 });

      if (config.tenantScoped) {
        await col.createIndex({ tenantId: 1 });
      }

      if (config.timestamps) {
        await col.createIndex({ createdAt: -1 });
      }

      // Create unique indexes
      for (const field of config.fields) {
        if (field.unique && field.name) {
          await col.createIndex({ [field.name]: 1 }, { unique: true });
        }
        if (field.indexed && field.name) {
          await col.createIndex({ [field.name]: 1 });
        }
      }
    }


  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private getCollectionConfig(slug: string): CollectionConfig {
    if (slug.startsWith('_globals_')) {
      const globalSlug = slug.replace('_globals_', '');
      const globalConfig = this.globals.get(globalSlug);
      if (!globalConfig) {
        throw new Error(`Global "${globalSlug}" not found`);
      }
      return globalConfig as any;
    }
    const config = this.collections.get(slug);
    if (!config) {
      throw new Error(`Collection "${slug}" not found`);
    }
    return config;
  }

  private buildFilter(where: Record<string, any> = {}, tenantId?: string): Record<string, any> {
    const filter: Record<string, any> = {};

    // Apply tenant filter
    if (tenantId) {
      filter.tenantId = tenantId;
    }

    // Convert operators to MongoDB format
    for (const [key, value] of Object.entries(where)) {
      if (key === 'AND' && Array.isArray(value)) {
        const andConditions = value.map((v: any) => this.buildFilter(v));
        Object.assign(filter, ...andConditions);
      } else if (key === 'OR' && Array.isArray(value)) {
        filter.$or = value.map((v: any) => this.buildFilter(v));
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Operator-based conditions
        const mongoOperators: Record<string, any> = {};

        if (value.equals !== undefined) {
          filter[key === 'id' ? '_id' : key] = value.equals;
          continue;
        }
        if (value.not_equals !== undefined) {
          mongoOperators.$ne = value.not_equals;
        }
        if (value.in !== undefined) {
          mongoOperators.$in = value.in;
        }
        if (value.not_in !== undefined) {
          mongoOperators.$nin = value.not_in;
        }
        if (value.greater_than !== undefined) {
          mongoOperators.$gt = value.greater_than;
        }
        if (value.greater_than_equal !== undefined) {
          mongoOperators.$gte = value.greater_than_equal;
        }
        if (value.less_than !== undefined) {
          mongoOperators.$lt = value.less_than;
        }
        if (value.less_than_equal !== undefined) {
          mongoOperators.$lte = value.less_than_equal;
        }
        if (value.like !== undefined) {
          mongoOperators.$regex = new RegExp(value.like.replace(/%/g, '.*'), 'i');
        }
        if (value.not_like !== undefined) {
          mongoOperators.$not = new RegExp(value.not_like.replace(/%/g, '.*'), 'i');
        }
        if (value.contains !== undefined) {
          mongoOperators.$regex = new RegExp(`.*${value.contains}.*`, 'i');
        }
        if (value.exists !== undefined) {
          mongoOperators.$exists = value.exists;
        }

        if (Object.keys(mongoOperators).length > 0) {
          filter[key === 'id' ? '_id' : key] = mongoOperators;
        }
      } else {
        // Direct equality
        filter[key === 'id' ? '_id' : key] = value;
      }
    }

    return filter;
  } private buildProjection(select?: string[]): Record<string, 1> | undefined {
    if (!select || select.length === 0) return undefined;

    const projection: Record<string, 1> = { _id: 1 };
    for (const field of select) {
      projection[field] = 1;
    }
    return projection;
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

    // Convert _id to id
    if (data._id) {
      result.id = String(data._id);
      delete result._id;
    }

    // Remove MongoDB internals
    delete result.__v;

    // Convert dates to ISO strings
    if (result.createdAt) {
      result.createdAt = new Date(result.createdAt).toISOString();
    }
    if (result.updatedAt) {
      result.updatedAt = new Date(result.updatedAt).toISOString();
    }

    return sanitizeDoc(result);
  }

  private generateId(): string {
    const timestamp = Date.now().toString(16).padStart(12, '0');
    const random = randomBytes(6).toString('hex');
    return timestamp + random;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createMongoDBAdapter(options: {
  client?: any;
  database?: string;
  connectionString?: string;
}): MongoDBAdapter {
  return new MongoDBAdapter(options);
}
