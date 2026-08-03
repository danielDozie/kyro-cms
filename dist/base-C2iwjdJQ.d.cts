import { B as BaseAdapter, C as CollectionConfig, G as GlobalConfig, T as TenantContext, F as FindArgs, b as FindResult, c as FindByIDArgs, d as CreateArgs, e as UpdateArgs, D as DeleteArgs, f as FindOneArgs, g as FindVersionsArgs, h as VersionRecord, i as CreateVersionArgs } from './types-BjivdGbU.cjs';
import { F as Field, m as RelationshipField, U as UploadField } from './types-euTszc-1.cjs';

declare abstract class AbstractBaseAdapter implements BaseAdapter {
    protected collections: Map<string, CollectionConfig>;
    protected globals: Map<string, GlobalConfig>;
    protected connected: boolean;
    protected tenantContext?: TenantContext;
    abstract connect(): Promise<void>;
    abstract disconnect(): Promise<void>;
    setTenantContext(context: TenantContext | undefined): void;
    getTenantContext(): TenantContext | undefined;
    init(collections: CollectionConfig[], globals?: GlobalConfig[]): Promise<void>;
    abstract find<T>(args: FindArgs): Promise<FindResult<T>>;
    abstract findByID<T>(args: FindByIDArgs): Promise<T | null>;
    abstract create<T>(args: CreateArgs): Promise<T>;
    abstract update<T>(args: UpdateArgs): Promise<T>;
    abstract delete<T>(args: DeleteArgs): Promise<T>;
    abstract count(args: {
        collection: string;
        where?: Record<string, any>;
        tenantId?: string;
    }): Promise<number>;
    abstract findOne(args: FindOneArgs): Promise<any>;
    abstract findVersions(args: FindVersionsArgs): Promise<FindResult<VersionRecord>>;
    abstract findVersionByID(args: {
        collection: string;
        versionId: string;
        tenantId?: string;
    }): Promise<VersionRecord | null>;
    abstract createVersion<T = Record<string, any>>(args: CreateVersionArgs<T>): Promise<VersionRecord<T>>;
    abstract updateLatestVersion<T = Record<string, any>>(args: CreateVersionArgs<T>): Promise<VersionRecord<T>>;
    abstract deleteVersions(args: {
        collection: string;
        documentId: string;
        keepLatest?: number;
        tenantId?: string;
    }): Promise<void>;
    migrate?(): Promise<void>;
    rollback?(): Promise<void>;
    transaction?<T>(fn: (tx: any) => Promise<T>): Promise<T>;
    protected getCollection(slug: string): CollectionConfig;
    protected applyTenantFilter(where?: Record<string, any>, tenantId?: string): Record<string, any>;
    protected getTableName(slug: string): string;
    protected prepareData(data: Record<string, any>, collection: CollectionConfig): Record<string, any>;
    protected processRelationships(data: Record<string, any>, fields: Field[], depth: number): Record<string, any>;
    protected parseSort(sort?: string): {
        field: string;
        direction: 'asc' | 'desc';
    };
    protected calculatePagination(page: number, limit: number, totalDocs: number): {
        totalDocs: number;
        limit: number;
        totalPages: number;
        page: number;
        pagingCounter: number;
        hasPrevPage: boolean;
        hasNextPage: boolean;
        prevPage: number | null;
        nextPage: number | null;
    };
    protected selectFields(data: Record<string, any>, select?: string[]): Record<string, any>;
    protected isRelationshipField(field: Field): field is RelationshipField;
    protected isUploadField(field: Field): field is UploadField;
    protected getRelationshipFields(fields: Field[]): RelationshipField[];
    protected getUploadFields(fields: Field[]): UploadField[];
}

export { AbstractBaseAdapter as A };
