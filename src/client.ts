// Core Configuration and Types
export type {
  KyroConfig,
  CollectionConfig,
  GlobalConfig,
  AdminConfig,
  UploadConfig,
  ImageSize,
  VersionConfig,
  AuthConfig,
} from "./registry/types.js";

// Field Types
export type {
  Field,
  FieldType,
  FieldAdmin,
  DeclarativeCondition,
  BaseField,
  TextField,
  NumberField,
  CheckboxField,
  DateField,
  EmailField,
  PasswordField,
  TextareaField,
  SelectField,
  RadioField,
  ColorField,
  ImageField,
  RichTextField,
  RichTextBlock,
  JSONField,
  CodeField,
  UploadField,
  MarkdownField,
  RelationshipField,
  ArrayField,
  GroupField,
  Block,
  BlockAdmin,
  BlockImage,
  BlocksField,
  RowField,
  CollapsibleField,
  TabsField,
  SecretField,
  IconField,
} from "./fields/index.js";
export { renderRichText, richTextStyles, ALL_FIELD_TYPES } from "./fields/index.js";

// Authentication Types
export type {
  AuthUser,
  UserRole,
  Session as AuthSession,
  Session,
  JWTPayload,
  LoginCredentials,
  RegisterData,
  AuthResult,
  AuthAdapter,
  AuthTokenConfig,
} from "./auth/types.js";

// Styling System (Browser Safe)
export {
  type StylingMode,
  type StylingConfig,
  type ThemeConfig,
  type ThemeColors,
  type ThemeFonts,
  type ThemeSpacing,
  type ThemeBorderRadius,
  type ThemeShadows,
  type FieldStyling,
  type AdminStylingConfig,
  CSSGenerator,
  generateTailwindConfig,
  generateCSSVariables,
  defaultLightTheme,
  defaultDarkTheme,
  ecommerce2026Theme,
  createAdminStyling,
  defaultFieldStyling,
} from "./styling/index.js";

// Utility Exports (Browser Safe)
export { createAuditContext } from "./auth/security/context.js";
export {
  FIELD_DEFINITION_KEYS,
  isFieldOverrideDefinition,
  flattenFieldOverrides,
  updateFieldByPath,
  applyBlocksOverrides,
  applyTabsOverrides,
  applyCollectionOverrides,
  applyGlobalOverrides,
} from "./utils/schemaOverrides.js";

// Document Tree & Routing Hierarchy
export {
  type HierarchyNode,
  type BuildTreeOptions,
  buildDocumentTree,
  getBreadcrumbs,
  getNestedPath,
  flattenDocumentTree,
} from "./utils/hierarchy.js";

