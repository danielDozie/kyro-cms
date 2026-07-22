import type { Field, Hook } from "../fields/types.js";
import type { CollectionAccess, GlobalAccess } from "../access/types.js";
import type { CollectionHooks, GlobalHooks } from "../hooks/types.js";
import type { TenantContext } from "../auth/rls/tenant.js";

// ============================================================================
// Configuration Interfaces
// ============================================================================

export interface AdminConfig {
  useAsTitle?: string;
  defaultColumns?: string[];
  hidden?: boolean;
  description?: string;
  hideAPIURL?: boolean;
  group?: string;
  icon?: string;
  order?: number;
  preview?: (doc: Record<string, unknown>, options: { req: unknown; token?: string }) => string | Promise<string>;
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
export interface FieldOverrides {
  [fieldPath: string]: {
    relationTo?: string | string[];
    [key: string]: any;
  };
}

export interface UploadConfig {
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

export interface ImageSize {
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

export interface VersionConfig {
  maxPerDoc?: number;
  drafts?: boolean;
  retainDeleted?: boolean;
}

// Status for documents in draft/publish lifecycle
export type DocumentStatus = 'draft' | 'published' | 'archived';

export interface AuthConfig {
  tokenExpiration?: number;
  verify?: boolean | { generateEmailHTML?: (args: any) => string };
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

export interface CollectionConfig {
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

export interface GlobalConfig {
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

// ============================================================================
// Query Types
// ============================================================================

export interface FindArgs {
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

export interface FindByIDArgs {
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

export interface CreateArgs {
  collection: string;
  data: Record<string, any>;
  depth?: number;
  tenantId?: string;
  select?: string[];
  user?: any;
  context?: Record<string, any>;
  overrideAccess?: boolean;
}

export interface UpdateArgs {
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

export interface DeleteArgs {
  collection: string;
  id: string;
  tenantId?: string;
  user?: any;
  context?: Record<string, any>;
  overrideAccess?: boolean;
}

export interface FindResult<T = any> {
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

export interface CreateResult<T = any> {
  doc: T;
  errors?: Array<{ field: string; message: string }>;
}

// ============================================================================
// Version Record Types
// ============================================================================

export interface VersionRecord<T = Record<string, any>> {
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

export interface CreateVersionArgs<T = Record<string, any>> {
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

export interface FindVersionsArgs {
  collection: string;
  documentId: string;
  tenantId?: string;
  limit?: number;
  page?: number;
  sort?: string;
}

export interface PruneVersionsArgs {
  collection: string;
  documentId: string;
  maxPerDoc: number;
  tenantId?: string;
}

// ============================================================================
// Database Adapter Interface
// ============================================================================

export interface BaseAdapter {
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

  findOne(args: {
    collection: string;
    where: Record<string, any>;
    tenantId?: string;
    draft?: boolean;
  }): Promise<any>;
  // Formal version history (manual saves and publishes)
  findVersions(args: FindVersionsArgs): Promise<FindResult<VersionRecord>>;
  findVersionByID(args: { collection: string; versionId: string; tenantId?: string }): Promise<VersionRecord | null>;
  createVersion<T = Record<string, any>>(args: CreateVersionArgs<T>): Promise<VersionRecord<T>>;
  deleteVersions(args: { collection: string; documentId: string; keepLatest?: number; tenantId?: string }): Promise<void>;

  // Autosave version management — replaces ephemeral draft snapshots
  // Finds an existing autosave version and updates it in-place, or creates one if none exists
  updateLatestVersion<T = Record<string, any>>(args: CreateVersionArgs<T>): Promise<VersionRecord<T>>;

  migrate?(): Promise<void>;
  rollback?(): Promise<void>;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  transaction?<T>(fn: (tx: any) => Promise<T>): Promise<T>;

  // RLS tenant context
  setTenantContext(context: TenantContext | undefined): void;
  getTenantContext(): TenantContext | undefined;
}

export interface AdapterConfig {
  type: "drizzle" | "mongodb";
  client: any;
  schema?: any;
  connectionOptions?: Record<string, any>;
}

// ============================================================================
// Plugin System
// ============================================================================



// ============================================================================
// Kyro Configuration
// ============================================================================

export interface KyroConfig {
  collections?: CollectionConfig[];
  globals?: GlobalConfig[];
  adapter: BaseAdapter;
  plugins?: import("../plugins/index.js").KyroPlugin[];
  auth?:
    | boolean
    | {
        secret?: string;
        tokenExpiration?: number;
        cookie?: {
          secure?: boolean;
          sameSite?: "strict" | "lax" | "none";
          domain?: string;
        };
        checkSession?: boolean; // NEW - control session checking
      };
  authAdapter?: any; // NEW - pass auth adapter directly
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
    collectionOverrides?: Record<
      string,
      Partial<AdminConfig> & { fields?: FieldOverrides }
    >;
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

// ============================================================================
// Field Mapping
// ============================================================================

export interface FieldToSQLMapping {
  [key: string]: string;
}

export interface FieldToGraphQLMapping {
  [key: string]: string;
}

export interface FieldToZodMapping {
  [key: string]: any;
}
