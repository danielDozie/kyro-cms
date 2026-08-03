import { F as Field } from './types-euTszc-1.cjs';

interface Request {
    body?: any;
    headers: Record<string, string>;
    method?: string;
    url?: string;
    cookies?: Record<string, string>;
    query?: Record<string, any>;
}
interface User {
    id: string;
    email: string;
    role: string;
    tenantId?: string;
    [key: string]: any;
}
interface HookArgs<T = any> {
    collection?: string;
    global?: string;
    data?: T;
    originalDoc?: T;
    doc?: T;
    req: Request;
    user?: User;
    operation: 'create' | 'read' | 'update' | 'delete';
    tenantId?: string;
    field?: string;
    siblingData?: Record<string, any>;
    value?: any;
    previousValue?: any;
    context?: Record<string, any>;
}
type Hook<T = any> = (args: HookArgs<T>) => Promise<T | void> | T | void;
interface CollectionHooks {
    beforeValidate?: Hook[];
    beforeChange?: Hook[];
    afterChange?: Hook[];
    beforeRead?: Hook[];
    afterRead?: Hook[];
    beforeDelete?: Hook[];
    afterDelete?: Hook[];
    beforeLogin?: Hook[];
    afterLogin?: Hook[];
    afterLogout?: Hook[];
    afterRefresh?: Hook[];
    afterForgotPassword?: Hook[];
}
interface FieldHooks {
    beforeValidate?: Hook[];
    beforeChange?: Hook[];
    afterChange?: Hook[];
    afterRead?: Hook[];
}
interface GlobalHooks {
    beforeValidate?: Hook[];
    beforeChange?: Hook[];
    afterChange?: Hook[];
    beforeRead?: Hook[];
    afterRead?: Hook[];
}
declare function runHooks(hooks: Hook[], args: HookArgs): Promise<any>;
declare function runFieldHooks(hooks: Hook[], args: HookArgs): Promise<any>;

interface PluginHooks {
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
interface PluginCollectionExtension {
    slug: string;
    config: Partial<CollectionConfig>;
}
interface PluginGlobalExtension {
    slug: string;
    config: Partial<GlobalConfig>;
}
interface PluginFieldExtension {
    collectionSlug: string;
    field: Field;
}
interface PluginAPI {
    registry: {
        getCollection: (slug: string) => CollectionConfig | undefined;
        getCollections: () => CollectionConfig[];
        getGlobal: (slug: string) => GlobalConfig | undefined;
        addCollection: (config: CollectionConfig) => void;
        addGlobal: (config: GlobalConfig) => void;
        extendCollection: (slug: string, extension: Partial<CollectionConfig>) => void;
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
declare abstract class KyroPlugin {
    name: string;
    displayName?: string;
    adminEntry?: string;
    version?: string;
    description?: string;
    hooks: PluginHooks;
    collections: Partial<CollectionConfig>[];
    globals: Partial<GlobalConfig>[];
    fields: PluginFieldExtension[];
    extensions: {
        collections: PluginCollectionExtension[];
        globals: PluginGlobalExtension[];
    };
    adminComponents: Record<string, any>;
    adminStyles: string[];
    serverMiddleware?: (app: any) => void;
    clientMiddleware?: (req: any) => any;
    constructor(name: string);
    init?(api: PluginAPI): Promise<void>;
    beforeInit?(api: PluginAPI): Promise<void>;
    afterInit?(api: PluginAPI): Promise<void>;
    getCollections?(): Partial<CollectionConfig>[];
    getGlobals?(): Partial<GlobalConfig>[];
    getHooks?(): PluginHooks;
}
declare class PluginManager {
    private plugins;
    private hooks;
    register(plugin: KyroPlugin): void;
    unregister(name: string): void;
    get(name: string): KyroPlugin | undefined;
    getAll(): KyroPlugin[];
    has(name: string): boolean;
    registerHook(event: string, handler: Hook): void;
    unregisterHook(event: string, handler: Hook): void;
    executeHook(event: string, args?: any): Promise<any>;
    getAllCollections(): Partial<CollectionConfig>[];
    getAllGlobals(): Partial<GlobalConfig>[];
    getAllFields(): PluginFieldExtension[];
    getAdminComponents(): Record<string, any>;
    getAdminStyles(): string[];
}
declare class SEOPlugin extends KyroPlugin {
    constructor();
}
declare class AnalyticsPlugin extends KyroPlugin {
    constructor();
}
declare class CommentsPlugin extends KyroPlugin {
    constructor();
}
declare class ReviewsPlugin extends KyroPlugin {
    constructor();
}
declare class WishlistPlugin extends KyroPlugin {
    constructor();
}
declare const presetPlugins: {
    SEO: typeof SEOPlugin;
    Analytics: typeof AnalyticsPlugin;
    Comments: typeof CommentsPlugin;
    Reviews: typeof ReviewsPlugin;
    Wishlist: typeof WishlistPlugin;
};

interface WhereClause {
    [field: string]: any;
}
interface AccessArgs {
    req: Request;
    user?: User;
    data?: unknown;
    doc?: unknown;
    id?: string;
    tenantId?: string;
    context?: Record<string, unknown>;
}
type AccessControl = boolean | ((args: AccessArgs) => Promise<boolean | WhereClause> | boolean | WhereClause);
interface CollectionAccess {
    create?: AccessControl;
    read?: AccessControl;
    update?: AccessControl;
    delete?: AccessControl;
    admin?: AccessControl;
    unlock?: AccessControl;
    readVersions?: AccessControl;
}
interface GlobalAccess {
    read?: AccessControl;
    update?: AccessControl;
}
interface FieldAccess {
    create?: AccessControl;
    read?: AccessControl;
    update?: AccessControl;
}
declare function evaluateAccess(access: AccessControl, args: AccessArgs): Promise<boolean | WhereClause>;
declare function mergeWhereClauses(...whereClauses: (WhereClause | boolean | undefined)[]): WhereClause;
declare function getWhereClause(access: AccessControl, args: AccessArgs): Promise<WhereClause | undefined>;

interface TenantContext {
    tenantId: string;
    userId: string;
    role?: string;
    roles?: string[];
    permissions?: string[];
    isSuperAdmin?: boolean;
}

interface AdminConfig {
    useAsTitle?: string;
    defaultColumns?: string[];
    hidden?: boolean;
    description?: string;
    hideAPIURL?: boolean;
    group?: string;
    icon?: string;
    order?: number;
    preview?: (doc: Record<string, unknown>, options: {
        req: unknown;
        token?: string;
    }) => string | Promise<string>;
    disableDuplicate?: boolean;
    disablePreview?: boolean;
    pagination?: {
        defaultLimit?: number;
        limits?: number[];
    };
    layout?: "split" | "single";
}
/**
 * Field overrides allow modifying specific field properties by path.
 * Path uses dot notation: "fieldName" or "groupField.arrayField.targetField"
 * Commonly used to extend relationship fields with additional collections.
 */
interface FieldOverrides {
    [fieldPath: string]: {
        relationTo?: string | string[];
        [key: string]: any;
    };
}
interface UploadConfig {
    staticDir?: string;
    staticURL?: string;
    mimeTypes?: string[];
    fileSize?: number;
    imageSizes?: ImageSize[];
    crop?: boolean;
    focalPoint?: boolean;
    formatOptions?: {
        format: "webp" | "png" | "jpg";
        options?: Record<string, unknown>;
    };
    resizeOptions?: Record<string, any>;
    adminThumbnail?: string;
}
interface ImageSize {
    name: string;
    width?: number;
    height?: number;
    crop?: string;
    position?: string;
    formatOptions?: {
        format: "webp" | "png" | "jpg";
    };
    generateImageName?: (doc: any) => string;
}
interface VersionConfig {
    maxPerDoc?: number;
    drafts?: boolean;
    retainDeleted?: boolean;
}
type DocumentStatus = 'draft' | 'published' | 'archived';
interface AuthConfig {
    tokenExpiration?: number;
    verify?: boolean | {
        generateEmailHTML?: (args: any) => string;
    };
    maxLoginAttempts?: number;
    lockTime?: number;
    cookies?: {
        secure?: boolean;
        sameSite?: "strict" | "lax" | "none";
        domain?: string;
    };
    forgotPassword?: {
        generateEmailHTML?: (args: any) => string;
        generateEmailSubject?: (args: any) => string;
    };
    strategies?: Array<{
        name: string;
        authenticate: (args: any) => Promise<any>;
    }>;
}
interface CollectionConfig {
    slug: string;
    label?: string;
    labelPlural?: string;
    singularLabel?: string;
    admin?: AdminConfig;
    fields: Field[];
    access?: CollectionAccess;
    hooks?: CollectionHooks;
    timestamps?: boolean;
    tenantScoped?: boolean;
    tenantField?: string;
    upload?: UploadConfig;
    versions?: VersionConfig;
    auth?: boolean | AuthConfig;
    graphQL?: {
        singularName?: string;
        pluralName?: string;
    };
    indexes?: Array<{
        fields: Record<string, number | "text">;
        options?: Record<string, any>;
    }>;
    seo?: boolean | Record<string, any>;
    custom?: Record<string, any>;
    tabs?: Array<{
        label: string;
        fields: Field[];
        name?: string;
    }>;
}
interface GlobalConfig {
    slug: string;
    label?: string;
    admin?: AdminConfig;
    fields: Field[];
    access?: GlobalAccess;
    hooks?: GlobalHooks;
    versions?: VersionConfig;
    graphQL?: {
        name?: string;
    };
    typescript?: {
        interface?: string;
    };
    custom?: Record<string, any>;
    tabs?: Array<{
        label: string;
        fields: Field[];
        name?: string;
    }>;
}
interface FindArgs {
    collection: string;
    where?: Record<string, any>;
    sort?: string;
    limit?: number;
    page?: number;
    depth?: number;
    tenantId?: string;
    select?: string[];
    user?: any;
    context?: Record<string, any>;
    overrideAccess?: boolean;
    /** If true, returns draft docs (admin view). If false/omitted, only published docs are returned (public API). */
    draft?: boolean;
}
interface FindOneArgs {
    collection: string;
    where: Record<string, any>;
    tenantId?: string;
    draft?: boolean;
    depth?: number;
    select?: string[];
}
interface FindByIDArgs {
    collection: string;
    id: string;
    depth?: number;
    tenantId?: string;
    select?: string[];
    user?: any;
    context?: Record<string, any>;
    overrideAccess?: boolean;
    /** If true, returns document regardless of status (admin view). */
    draft?: boolean;
}
interface CreateArgs {
    collection: string;
    data: Record<string, any>;
    depth?: number;
    tenantId?: string;
    select?: string[];
    user?: any;
    context?: Record<string, any>;
    overrideAccess?: boolean;
}
interface UpdateArgs {
    collection: string;
    id: string;
    data: Record<string, any>;
    depth?: number;
    tenantId?: string;
    select?: string[];
    user?: any;
    context?: Record<string, any>;
    overrideAccess?: boolean;
}
interface DeleteArgs {
    collection: string;
    id: string;
    tenantId?: string;
    user?: any;
    context?: Record<string, any>;
    overrideAccess?: boolean;
}
interface FindResult<T = any> {
    docs: T[];
    totalDocs: number;
    limit: number;
    totalPages: number;
    page: number;
    pagingCounter: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
    prevPage: number | null;
    nextPage: number | null;
}
interface CreateResult<T = any> {
    doc: T;
    errors?: Array<{
        field: string;
        message: string;
    }>;
}
interface VersionRecord<T = Record<string, any>> {
    id: string;
    collection: string;
    documentId: string;
    version: number;
    status: DocumentStatus;
    data: T;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string | null;
    changeDescription?: string;
    autosave?: boolean;
}
interface CreateVersionArgs<T = Record<string, any>> {
    collection: string;
    documentId: string;
    data: T;
    status: DocumentStatus;
    createdBy?: string;
    changeDescription?: string;
    tenantId?: string;
    /** When true, reuses a single version slot (find existing + update) */
    autosave?: boolean;
}
interface FindVersionsArgs {
    collection: string;
    documentId: string;
    tenantId?: string;
    limit?: number;
    page?: number;
    sort?: string;
}
interface BaseAdapter {
    init(collections: CollectionConfig[], globals: GlobalConfig[]): Promise<void>;
    find<T>(args: FindArgs): Promise<FindResult<T>>;
    findByID<T>(args: FindByIDArgs): Promise<T | null>;
    create<T>(args: CreateArgs): Promise<T>;
    update<T>(args: UpdateArgs): Promise<T>;
    delete<T>(args: DeleteArgs): Promise<T>;
    count(args: {
        collection: string;
        where?: Record<string, any>;
        tenantId?: string;
    }): Promise<number>;
    findOne(args: FindOneArgs): Promise<any>;
    findVersions(args: FindVersionsArgs): Promise<FindResult<VersionRecord>>;
    findVersionByID(args: {
        collection: string;
        versionId: string;
        tenantId?: string;
    }): Promise<VersionRecord | null>;
    createVersion<T = Record<string, any>>(args: CreateVersionArgs<T>): Promise<VersionRecord<T>>;
    deleteVersions(args: {
        collection: string;
        documentId: string;
        keepLatest?: number;
        tenantId?: string;
    }): Promise<void>;
    updateLatestVersion<T = Record<string, any>>(args: CreateVersionArgs<T>): Promise<VersionRecord<T>>;
    migrate?(): Promise<void>;
    rollback?(): Promise<void>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    transaction?<T>(fn: (tx: any) => Promise<T>): Promise<T>;
    setTenantContext(context: TenantContext | undefined): void;
    getTenantContext(): TenantContext | undefined;
}
interface AdapterConfig {
    type: "drizzle" | "mongodb";
    client: any;
    schema?: any;
    connectionOptions?: Record<string, any>;
}
interface KyroConfig {
    collections?: CollectionConfig[];
    globals?: GlobalConfig[];
    adapter: BaseAdapter;
    plugins?: KyroPlugin[];
    auth?: boolean | {
        secret?: string;
        tokenExpiration?: number;
        cookie?: {
            secure?: boolean;
            sameSite?: "strict" | "lax" | "none";
            domain?: string;
        };
        checkSession?: boolean;
    };
    authAdapter?: any;
    cors?: {
        origins?: string[];
        credentials?: boolean;
    };
    admin?: {
        meta?: {
            title?: string;
            description?: string;
            ogImage?: string;
        };
        dateFormat?: string;
        avatar?: "default" | "gravatar";
        disable?: boolean;
        indexRoute?: string;
        components?: Record<string, any>;
        collectionOverrides?: Record<string, Partial<AdminConfig> & {
            fields?: FieldOverrides;
        }>;
    };
    upload?: {
        limits?: {
            fileSize?: number;
        };
    };
    graphQL?: {
        maxComplexity?: number;
        disablePlayground?: boolean;
    };
    typescript?: {
        outputFile?: string;
    };
    localization?: {
        locales: string[];
        defaultLocale: string;
    };
    rateLimit?: {
        window?: number;
        max?: number;
    };
    debug?: boolean;
}

export { type AdminConfig as A, type BaseAdapter as B, type CollectionConfig as C, type DeleteArgs as D, ReviewsPlugin as E, type FindArgs as F, type GlobalConfig as G, type Hook as H, type ImageSize as I, WishlistPlugin as J, type KyroConfig as K, evaluateAccess as L, getWhereClause as M, mergeWhereClauses as N, presetPlugins as O, PluginManager as P, runFieldHooks as Q, type Request as R, SEOPlugin as S, type TenantContext as T, type UploadConfig as U, type VersionConfig as V, type WhereClause as W, runHooks as X, type AuthConfig as a, type FindResult as b, type FindByIDArgs as c, type CreateArgs as d, type UpdateArgs as e, type FindOneArgs as f, type FindVersionsArgs as g, type VersionRecord as h, type CreateVersionArgs as i, KyroPlugin as j, type User as k, type AccessArgs as l, type AccessControl as m, type AdapterConfig as n, AnalyticsPlugin as o, type CollectionAccess as p, type CollectionHooks as q, CommentsPlugin as r, type CreateResult as s, type FieldAccess as t, type FieldHooks as u, type GlobalAccess as v, type GlobalHooks as w, type HookArgs as x, type PluginAPI as y, type PluginHooks as z };
