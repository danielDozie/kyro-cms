/**
 * Local type declarations for core types that TSC cannot resolve
 * from the barrel `@kyro-cms/core/client` due to tsup's chunked
 * .d.ts re-export format.
 *
 * These types mirror the definitions in the core source and are
 * used only for compile-time type checking in the admin package.
 * At runtime, Vite resolves the actual types correctly.
 */

/** Minimal BaseField shape needed for IconField/SecretField */
interface BaseField {
  type: string;
  name: string;
  label?: string;
  required?: boolean;
  admin?: Record<string, any>;
  [key: string]: unknown;
}

// --- Field Types ---

export interface IconField extends BaseField {
  type: "icon";
}

export interface SecretField extends BaseField {
  type: "secret";
}

export type DeclarativeCondition =
  | {
      field: string;
      equals?: string | number | boolean;
      notEquals?: string | number | boolean;
      in?: (string | number | boolean)[];
      greaterThan?: number;
    }
  | { and: DeclarativeCondition[] }
  | { or: DeclarativeCondition[] };

// --- Config Types ---

export interface AdminConfig {
  /** Admin panel title */
  title?: string;
  /** Sidebar label override */
  label?: string;
  /** Description shown in the admin */
  description?: string;
  /** Admin panel icon (lucide icon name) */
  icon?: string;
  /** Hide from navigation */
  hidden?: boolean;
  /** Default columns shown in the list view */
  listColumns?: string[];
  /** Default sort field */
  defaultSort?: string;
  /** Enable/disable search */
  enableSearch?: boolean;
  /** Custom admin group */
  group?: string;
  /** Pagination settings */
  pagination?: {
    defaultLimit?: number;
    limits?: number[];
  };
  /** Preview URL function */
  preview?: (doc: Record<string, any>) => string | null;
  /** Live preview configuration */
  livePreview?: {
    url?: string | ((doc: Record<string, any>) => string);
  };
  /** Custom CSS class for the admin view */
  className?: string;
  /** Disable create button */
  disableCreate?: boolean;
}
