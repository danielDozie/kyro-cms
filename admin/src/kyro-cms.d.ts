declare module '@kyro-cms/core' {
  export interface CollectionConfig {
    slug: string;
    label?: string;
    fields: FieldConfig[];
admin?: {
      layout?: 'single' | 'split';
      autoGenerate?: string;
      defaultColumns?: string[];
      description?: string;
      useAsTitle?: string;
      [key: string]: unknown;
    };
    timestamps?: boolean;
    singularLabel?: string;
    [key: string]: unknown;
  }

  export interface GlobalConfig {
    slug: string;
    label?: string;
    fields: FieldConfig[];
    [key: string]: unknown;
  }

  export interface FieldConfig {
    name: string;
    label?: string;
    type: string;
    required?: boolean;
    admin?: {
      hidden?: boolean;
      layout?: 'single' | 'split';
      autoGenerate?: string;
      [key: string]: unknown;
    };
    tabs?: Array<{ label?: string; fields?: FieldConfig[]; [key: string]: unknown }>;
    fields?: FieldConfig[];
    options?: Array<{ label: string; value: string | number }>;
    blocks?: Block[];
    relationTo?: string | string[];
    hasMany?: boolean;
    condition?: unknown;
    rowWidth?: string;
    width?: string;
    [key: string]: unknown;
  }

  export type FieldType = string;
  export const ALL_FIELD_TYPES: string[];
  export type ALL_FIELD_TYPES = string[];

  export interface TextField extends FieldConfig { type: 'text' }
  export interface NumberField extends FieldConfig { type: 'number' }
  export interface CheckboxField extends FieldConfig { type: 'checkbox' }
  export interface DateField extends FieldConfig { type: 'date' }
  export interface SelectField extends FieldConfig { type: 'select'; options?: { label: string; value: string | number }[] }
  export interface TextareaField extends FieldConfig { type: 'textarea' }
  export interface MarkdownField extends FieldConfig { type: 'markdown' }
  export interface RichTextField extends FieldConfig { type: 'richtext' }
  export interface CodeField extends FieldConfig { type: 'code'; language?: string }
  export interface JSONField extends FieldConfig { type: 'json' }
  export interface ImageField extends FieldConfig { type: 'image' }
  export interface UploadField extends FieldConfig { type: 'upload' }
  export interface IconField extends FieldConfig { type: 'icon' }
  export interface SecretField extends FieldConfig { type: 'secret' }
  export interface RelationshipField extends FieldConfig { type: 'relationship'; relationTo: string }
  export interface BlocksField extends FieldConfig { type: 'blocks'; blocks: Block[] }
  export interface ArrayField extends FieldConfig { type: 'array'; fields: FieldConfig[] }
  export interface GroupField extends FieldConfig { type: 'group'; fields: FieldConfig[] }

  export type Field = FieldConfig;

  export interface Block {
    slug: string;
    label?: string;
    fields: FieldConfig[];
    [key: string]: unknown;
  }

  export interface RichTextBlock extends Block {}

  export interface KyroConfig {
    collections?: CollectionConfig[] | Record<string, CollectionConfig>;
    globals?: GlobalConfig[] | Record<string, GlobalConfig>;
    [key: string]: unknown;
  }

  export interface Permissions {
    collections?: {
      [key: string]: {
        read?: boolean;
        create?: boolean;
        update?: boolean;
        delete?: boolean;
        [key: string]: unknown;
      };
    };
    globals?: {
      [key: string]: {
        read?: boolean;
        update?: boolean;
        [key: string]: unknown;
      };
    };
    media?: {
      read?: boolean;
      create?: boolean;
      update?: boolean;
      delete?: boolean;
    };
    users?: {
      read?: boolean;
      create?: boolean;
      update?: boolean;
      delete?: boolean;
    };
    [key: string]: unknown;
  }

  export interface FilterConfig {
    field: string;
    operator: string;
    value: string;
  }

  export interface SortConfig {
    field: string;
    direction: 'asc' | 'desc';
  }

  export interface PaginationConfig {
    page: number;
    limit: number;
    total: number;
  }

  export interface ColumnConfig {
    name: string;
    label: string;
    sortable?: boolean;
    width?: string;
  }

  export interface BlockData {
    id: string;
    type: string;
    name?: string;
    data?: Record<string, unknown>;
    children?: BlockData[];
    order?: number;
    [key: string]: unknown;
  }

  export interface ApiListResponse {
    docs?: Record<string, unknown>[];
    totalDocs?: number;
    [key: string]: unknown;
  }

  export interface ApiDocResponse {
    data?: Record<string, unknown>;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    publishedAt?: string;
    [key: string]: unknown;
  }

  export interface Version {
    id: string;
    status?: string;
    changeDescription?: string;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    [key: string]: unknown;
  }

  export interface VersionDiff {
    field?: string;
    oldValue?: unknown;
    newValue?: unknown;
    [key: string]: unknown;
  }

  export const richTextStyles: string;
  export function renderRichText(content: unknown, options?: unknown): string;
}

declare module '@kyro-cms/core/client' {
  export * from '@kyro-cms/core';
}

// Ambient module for template collections (no type declarations in the package)
declare module '@kyro-cms/core/templates' {
  import type { CollectionConfig, GlobalConfig } from '@kyro-cms/core';

  export const minimalCollections: Record<string, CollectionConfig>;
  export const starterCollections: Record<string, CollectionConfig>;
  export const blogCollections: Record<string, CollectionConfig>;
  export const ecommerceCollections: Record<string, CollectionConfig>;
  export const ecommerceGlobals: GlobalConfig[];
  export const kitchenSinkCollections: Record<string, CollectionConfig>;
  export const mediaCollections: Record<string, CollectionConfig>;
  export const authCollections: Record<string, CollectionConfig>;
  export const allSettingsGlobals: GlobalConfig[];
  export const coreSettingsGlobals: GlobalConfig[];
}

// Ambient module for the Astro virtual import
declare module 'kyro:config' {
  import type { KyroConfig } from '@kyro-cms/core';
  const config: KyroConfig;
  export default config;
}

// Injected by Vite's define config during admin integration setup
declare const __KYRO_ADMIN_CONFIG_FILE__: string;
declare const __KYRO_ADMIN_PATH__: string;
declare const __KYRO_API_PATH__: string;