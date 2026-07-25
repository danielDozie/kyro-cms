import type {
  BaseAdapter,
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
} from '../registry/types.js';

export type {
  BaseAdapter,
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
};
import type { Field, RelationshipField, UploadField } from '../fields/types.js';
import type { TenantContext } from '../auth/rls/tenant.js';

// ============================================================================
// Abstract Base Adapter
// ============================================================================

export abstract class AbstractBaseAdapter implements BaseAdapter {
  protected collections: Map<string, CollectionConfig> = new Map();
  protected globals: Map<string, GlobalConfig> = new Map();
  protected connected = false;
  protected tenantContext?: TenantContext;

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  setTenantContext(context: TenantContext | undefined): void {
    this.tenantContext = context;
  }

  getTenantContext(): TenantContext | undefined {
    return this.tenantContext;
  }

  async init(collections: CollectionConfig[], globals: GlobalConfig[] = []): Promise<void> {
    for (const config of collections) {
      this.collections.set(config.slug, config);
    }
    for (const config of globals) {
      this.globals.set(config.slug, config);
    }
    await this.connect();
  }

  abstract find<T>(args: FindArgs): Promise<FindResult<T>>;
  abstract findByID<T>(args: FindByIDArgs): Promise<T | null>;
  abstract create<T>(args: CreateArgs): Promise<T>;
  abstract update<T>(args: UpdateArgs): Promise<T>;
  abstract delete<T>(args: DeleteArgs): Promise<T>;
  abstract count(args: { collection: string; where?: Record<string, any>; tenantId?: string }): Promise<number>;

  abstract findOne(args: FindOneArgs): Promise<any>;

  abstract findVersions(args: FindVersionsArgs): Promise<FindResult<VersionRecord>>;
  abstract findVersionByID(args: { collection: string; versionId: string; tenantId?: string }): Promise<VersionRecord | null>;
  abstract createVersion<T = Record<string, any>>(args: CreateVersionArgs<T>): Promise<VersionRecord<T>>;
  abstract updateLatestVersion<T = Record<string, any>>(args: CreateVersionArgs<T>): Promise<VersionRecord<T>>;
  abstract deleteVersions(args: { collection: string; documentId: string; keepLatest?: number; tenantId?: string }): Promise<void>;

  async migrate?(): Promise<void>;
  async rollback?(): Promise<void>;
  async transaction?<T>(fn: (tx: any) => Promise<T>): Promise<T>;

  // ========================================================================
  // Utility Methods
  // ========================================================================

  protected getCollection(slug: string): CollectionConfig {
    const collection = this.collections.get(slug);
    if (!collection) {
      console.error(`[Adapter] Missing collection "${slug}". Available collections:`, Array.from(this.collections.keys()));
      throw new Error(`Collection "${slug}" not found in adapter`);
    }
    return collection;
  }

  protected applyTenantFilter(where: Record<string, any> = {}, tenantId?: string): Record<string, any> {
    if (tenantId) {
      return {
        ...where,
        tenantId: { equals: tenantId },
      };
    }
    return where;
  }

  protected getTableName(slug: string): string {
    return slug.replace(/-/g, '_');
  }

  protected prepareData(data: Record<string, any>, collection: CollectionConfig): Record<string, any> {
    const prepared: Record<string, any> = { ...data };
    
    if (collection.timestamps) {
      prepared.updatedAt = new Date().toISOString();
      if (!prepared.createdAt) {
        prepared.createdAt = new Date().toISOString();
      }
    }

    // Handle password hashing
    if (collection.auth && prepared.password) {
      // Password should be hashed before this point via hooks
    }

    return prepared;
  }

  protected processRelationships(
    data: Record<string, any>,
    fields: Field[],
    depth: number
  ): Record<string, any> {
    // This is a base implementation - specific adapters override
    return data;
  }

  protected parseSort(sort?: string): { field: string; direction: 'asc' | 'desc' } {
    if (!sort) return { field: 'createdAt', direction: 'desc' };
    if (sort.startsWith('-')) {
      return { field: sort.slice(1), direction: 'desc' };
    }
    return { field: sort, direction: 'asc' };
  }

  protected calculatePagination(page: number, limit: number, totalDocs: number) {
    const totalPages = Math.ceil(totalDocs / limit);
    return {
      totalDocs,
      limit,
      totalPages,
      page,
      pagingCounter: (page - 1) * limit + 1,
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages,
      prevPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPages ? page + 1 : null,
    };
  }

  protected selectFields(data: Record<string, any>, select?: string[]): Record<string, any> {
    if (!select || select.length === 0) return data;
    const result: Record<string, any> = {};
    for (const field of select) {
      if (field in data) {
        result[field] = data[field];
      }
    }
    result['id'] = data.id;
    return result;
  }

  protected isRelationshipField(field: Field): field is RelationshipField {
    return field.type === 'relationship';
  }

  protected isUploadField(field: Field): field is UploadField {
    return field.type === 'upload';
  }

  protected getRelationshipFields(fields: Field[]): RelationshipField[] {
    const result: RelationshipField[] = [];
    for (const field of fields) {
      if (field.type === 'relationship') {
        result.push(field);
      } else if ('fields' in field && field.fields) {
        result.push(...this.getRelationshipFields(field.fields));
      }
    }
    return result;
  }

  protected getUploadFields(fields: Field[]): UploadField[] {
    const result: UploadField[] = [];
    for (const field of fields) {
      if (field.type === 'upload') {
        result.push(field);
      } else if ('fields' in field && field.fields) {
        result.push(...this.getUploadFields(field.fields));
      }
    }
    return result;
  }
}
