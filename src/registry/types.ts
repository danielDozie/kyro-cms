import type { Field, Hook } from "../fields/types.js";
import type { CollectionAccess, GlobalAccess } from "../access/types.js";
import type { CollectionHooks, GlobalHooks } from "../hooks/types.js";
import type { TenantContext } from "../auth/rls/tenant.js";
import type { StorageProvider } from "../storage/index.js";

// ============================================================================
// Configuration Interfaces
// ============================================================================

export interface AdminConfig {
  /** Field to display as the title/name of the document in list and relation dropdowns (e.g. "title", "name", "orderNumber") */
  useAsTitle?: string;
  /** Array of field names to display as default table columns in the collection list view */
  defaultColumns?: string[];
  /** Hide this collection completely from the sidebar navigation */
  hidden?: boolean;
  /** Subtitle or description shown under the collection header in the admin UI */
  description?: string;
  /** Hide the quick API endpoint URL badge from the admin collection view */
  hideAPIURL?: boolean;
  /** Sidebar navigation category section name (e.g. "Commerce", "Restaurant Menu", "Content") */
  group?: string;
  /** Alias for `group`. Organizes collection under a specific sidebar group/folder */
  folder?: string;
  /** Sub-folder for nested navigation grouping */
  parentFolder?: string;
  /** Enable tree hierarchy view for nested hierarchical collections (e.g. parent/child pages) */
  treeHierarchy?: boolean;
  /** Icon name from Lucide (e.g. "lucide:Utensils", "Utensils") or Heroicons (e.g. "hero:Sparkles", "hero-solid:Fire") */
  icon?: string;
  /** Sort order index within its sidebar navigation group (lower numbers appear first) */
  order?: number;
  /** Function returning live frontend preview URL with draft tokens */
  preview?: (doc: Record<string, unknown>, options: { req: unknown; token?: string }) => string | Promise<string>;
  /** Disable the duplicate document button */
  disableDuplicate?: boolean;
  /** Disable the live preview split panel */
  disablePreview?: boolean;
  /** Pagination settings for list view */
  pagination?: {
    defaultLimit?: number;
    limits?: number[];
  };
  /** Form layout mode: "split" (with sidebar fields) or "single" column */
  layout?: "split" | "single";
  /** Custom smart view filters configured for this collection */
  smartViews?: SmartViewConfig[];
}

export interface HierarchyConfig {
  parentField?: string;
  maxDepth?: number;
  slugPrefix?: boolean;
}

export interface ProjectConfig {
  id: string;
  name: string;
  slug: string;
  description?: string;
  environment?: 'development' | 'staging' | 'production' | string;
  collections?: string[];
  globals?: string[];
  settings?: Record<string, unknown>;
}

export interface SmartViewConfig {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  filter: Record<string, any>;
  collections?: string[];
  description?: string;
}

export interface OrganizationConfig {
  id: string;
  name: string;
  slug: string;
  billingEmail?: string;
  projects?: ProjectConfig[];
  roles?: Array<{
    name: string;
    description?: string;
    permissions?: string[];
  }>;
}

export interface FieldOverrides {
  [fieldPath: string]: any;
}

export interface CollectionOverrideConfig extends Partial<AdminConfig> {
  label?: string;
  singularLabel?: string;
  labelPlural?: string;
  labels?: { singular?: string; plural?: string };
  hidden?: boolean;
  timestamps?: boolean;
  versions?: {
    drafts?: boolean;
    maxPerDoc?: number;
    autosave?: boolean;
  };
  seo?: boolean | Record<string, any>;
  access?: CollectionAccess;
  hooks?: CollectionHooks;
  fields?: FieldOverrides;
  blocks?: Record<string, any> | any[];
  tabs?: Record<string, any> | any[];
  [key: string]: any;
}

export interface GlobalOverrideConfig extends Partial<AdminConfig> {
  label?: string;
  hidden?: boolean;
  access?: GlobalAccess;
  hooks?: GlobalHooks;
  fields?: FieldOverrides;
  blocks?: Record<string, any> | any[];
  tabs?: Record<string, any> | any[];
  [key: string]: any;
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
    format: "webp" | "png" | "jpg" | "avif";
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
    format: "webp" | "png" | "jpg" | "avif";
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
  folder?: string;
  hierarchy?: HierarchyConfig;
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
  folder?: string;
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

export interface FindOneArgs {
  collection: string;
  where: Record<string, any>;
  tenantId?: string;
  draft?: boolean;
  depth?: number;
  select?: string[];
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

  find<T = Record<string, any>>(args: FindArgs): Promise<FindResult<T>>;
  findByID<T = Record<string, any>>(args: FindByIDArgs): Promise<T | null>;
  create<T = Record<string, any>>(args: CreateArgs): Promise<T>;
  update<T = Record<string, any>>(args: UpdateArgs): Promise<T>;
  delete<T = Record<string, any>>(args: DeleteArgs): Promise<T>;
  count(args: {
    collection: string;
    where?: Record<string, any>;
    tenantId?: string;
  }): Promise<number>;

  findOne(args: FindOneArgs): Promise<any>;
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
  projects?: ProjectConfig[];
  organizations?: OrganizationConfig[];
  adapter: BaseAdapter;
  storage?: StorageProvider;
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
    collectionOverrides?: Record<string, CollectionOverrideConfig>;
    globalOverrides?: Record<string, GlobalOverrideConfig>;
    smartViews?: SmartViewConfig[];
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
  /**
   * Experimental features configuration.
   * Opt-in to features undergoing active development.
   */
  experimental?: ExperimentalConfig;
}

/**
 * Experimental features configuration.
 * Features toggled here are active work-in-progress and subject to change across minor releases.
 */
export interface ExperimentalConfig {
  /** Enable WebSocket real-time engine and multiplayer presence synchronization */
  websockets?: boolean;
  /** Enable AI Assistant and LLM copilot integrations */
  aiAssistant?: boolean;
  /** Enable vector embeddings and semantic search endpoints */
  vectorSearch?: boolean;
  /** Enable dynamic design token compilation (/api/tokens.css) */
  designTokens?: boolean;
  /** Enable live visual preview / island canvas */
  visualCanvas?: boolean;
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
