// ============================================================================
// @kyro-cms/core
// Astro-native headless CMS with multi-database, multi-protocol, multi-vendor
// ============================================================================

// Main Factory
export { Kyro, createKyro, createKyroHandler, applyCollectionOverrides } from "./createKyro.js";

// Email Engine & Templates
export * from "./email/index.js";

// Registry
export {
  Registry,
  getRegistry,
  resetRegistry,
  createRegistry,
} from "./registry/index.js";
export type {
  KyroConfig,
  CollectionConfig,
  GlobalConfig,
  AdminConfig,
  UploadConfig,
  ImageSize,
  VersionConfig,
  AuthConfig,
  BaseAdapter,
  AdapterConfig,
  FindArgs,
  FindByIDArgs,
  CreateArgs,
  UpdateArgs,
  DeleteArgs,
  FindResult,
  CreateResult,
} from "./registry/types.js";
export {
  validateConfig,
  validateCollection,
  validateGlobal,
  validateFields,
  ConfigValidationError,
} from "./registry/validator.js";
export {
  collectionToZod,
  collectionToCreateZod,
  collectionToUpdateZod,
  collectionToWhereZod,
  globalToZod,
  fieldToZod,
} from "./registry/zod-builder.js";

// Fields
export type {
  Field,
  FieldType,
  BaseField,
  FieldAdmin,
  ValidateOptions,
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
  BlocksField,
  Block,
  RowField,
  CollapsibleField,
  TabsField,
} from "./fields/index.js";
export {
  normalizeRichTextValue,
  renderRichText,
  richTextStyles,
  isTextField,
  isNumberField,
  isRelationshipField,
  isArrayField,
  isGroupField,
  isBlocksField,
  isUploadField,
  isImageField,
  isRichTextField,
  isSelectField,
  isLayoutField,
  PRIMITIVE_FIELD_TYPES,
  COMPLEX_FIELD_TYPES,
  RELATIONAL_FIELD_TYPES,
  LAYOUT_FIELD_TYPES,
  ALL_FIELD_TYPES,
} from "./fields/index.js";

// Access Control
export type {
  AccessControl,
  AccessArgs,
  WhereClause,
  CollectionAccess,
  GlobalAccess,
  FieldAccess,
} from "./access/index.js";
export {
  evaluateAccess,
  mergeWhereClauses,
  getWhereClause,
} from "./access/index.js";

// Hooks
export type {
  Hook,
  HookArgs,
  CollectionHooks,
  FieldHooks,
  GlobalHooks,
  Request,
  User,
} from "./hooks/index.js";
export { runHooks, runFieldHooks } from "./hooks/index.js";

// Database Adapters
export { AbstractBaseAdapter } from "./database/index.js";
export type {
  DatabaseType as DbAdapterType,
  DatabaseConnectionOptions,
  DrizzleAdapterOptions,
  MongoDBAdapterOptions,
  AdapterOptions,
} from "./database/index.js";
export {
  DrizzleAdapter,
  createDrizzleAdapter,
  fieldToDrizzleType,
  collectionToDrizzleSchema,
} from "./database/index.js";
export { MongoDBAdapter, createMongoDBAdapter } from "./database/index.js";
export { LocalAdapter, createLocalAdapter } from "./database/index.js";

// API Gateways
export {
  createContext,
  createFindProcedure,
  createFindByIDProcedure,
  createCreateProcedure,
  createUpdateProcedure,
  createDeleteProcedure,
  createCountProcedure,
  createDynamicRouter,
  createKyroServer,
} from "./api/index.js";
export { buildGraphQLSchema, createGraphQLSchema } from "./api/index.js";
export { createKyroApp, createRESTAPI } from "./api/index.js";
export {
  PubSub,
  KyroPubSub,
  KyroWSServer,
  createWSServer,
} from "./api/index.js";

// Plugin System
export {
  KyroPlugin,
  PluginManager,
  type PluginHooks,
  type PluginAPI,
  SEOPlugin,
  AnalyticsPlugin,
  CommentsPlugin,
  ReviewsPlugin,
  WishlistPlugin,
  presetPlugins,
} from "./plugins/index.js";

// Styling System
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

// Authentication
export {
  Auth,
  createAuth,
  RedisAuthAdapter,
  InMemoryAuthAdapter,
  EmailTransport,
  AuditLogger,
  InMemoryAuditLogger,
  createAuditContext,
  PasswordPolicy,
  AccountLockout,
  InMemoryAccountLockout,
  RateLimiter,
  InMemoryRateLimiter,
  createAuthConfig,
  authConfig,
} from "./auth/index.js";
export type {
  KyroAuthConfig,
  DatabaseType,
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
  AuditLog,
  AuditAction,
  AuditLogFilter,
} from "./auth/index.js";

export { SQLiteAuthAdapter } from "./auth/sqlite-adapter.js";

export {
  bootstrapAdmin,
  getBootstrapFromEnv,
  autoBootstrap,
  bootstrapWithRetry,
} from "./auth/bootstrap.js";

// Version History & Draft/Publish
export {
  VersionManager,
  createVersionManager,
  isPublished,
  isDraft,
  isArchived,
  type Version,
  type VersionStatus,
  type VersionDiff,
  type VersionAdapter,
  type CreateVersionOptions,
  type PublishVersionOptions,
  type CompareVersionsOptions,
  type VersionHistoryOptions,
  type DraftPublishConfig,
  type VersionPublishSchedule,
  getDefaultDraftPublishConfig,
} from "./versions/index.js";

// Zod re-export
export { z } from "zod";

// Database - Drizzle (auth extensions)
export { PostgresAuthAdapter } from "./database/drizzle/index.js";
export { MongoDBAuthAdapter } from "./database/mongodb/mongo-auth-adapter.js";
export {
  createDatabase,
  runMigrations,
  seedDefaultRoles,
  type Dialect,
} from "./database/drizzle/index.js";
export { NeonAdapter, createNeonAdapter, type NeonAdapterOptions } from "./database/neon.js";
export { TursoAdapter, createTursoAdapter, type TursoAdapterOptions } from "./database/turso.js";

// Media Service
export { MediaService } from "./storage/MediaService.js";
export { resolveProvider, createLocalStorage } from "./storage/index.js";

// Webhooks
export {
  WebhookService,
  createWebhookService,
  deliverWebhook,
  deliverWithRetry,
  signPayload,
  generateWebhookSecret,
  buildDeliveryRecord,
  createTestPayload,
  WEBHOOK_EVENTS,
  ALL_WEBHOOK_EVENTS,
  type WebhookEvent,
  type WebhookConfig,
  type CreateWebhookData,
  type UpdateWebhookData,
  type WebhookPayload,
  type WebhookDelivery,
  type WebhookTriggerResult,
  WEBHOOK_COLLECTION,
  WEBHOOK_DELIVERY_COLLECTION,
  type DeliveryResult,
  type DeliveryOptions,
} from "./webhooks/index.js";

// Templates
export {
  ecommerceCollections,
  ecommerceGlobals,
  blogCollections,
  minimalCollections,
  kitchenSinkCollections,
  mediaCollections,
  templateCollections,
  allGlobalSettings,
  coreGlobalSettings,
  createTemplateConfig,
} from "./templates/index";
export type { TemplateConfig } from "./templates/index";

// Configuration Service
export {
  ConfigService,
  type StorageConfig,
  type EmailConfig,
} from "./config/ConfigService.js";

// Configuration Helper
export { defineConfig, defineKyroConfig } from "./registry/config.js";

// Astro Integration
export { default as kyro } from "./integration.js";

// SEO & Analytics Helpers
export { generateSeoTags, generateAnalyticsTags, type SeoTagsOptions } from "./lib/seo.js";

// Social Links
export {
  getSocialLinks,
  getSocialLinksFromSettings,
  type SocialLink,
} from "./lib/social.js";

// Store Config
export {
  getStoreConfig,
  getStoreConfigFromSettings,
  type StoreConfig,
} from "./lib/store.js";

// Payment Config
export {
  getPaymentConfig,
  getPaymentConfigFromSettings,
  type PaymentConfig,
} from "./lib/payment.js";

// Storage
export {
  createStorage,
  createAuthStorage,
} from "./lib/storage/index.js";
export type {
  StorageAdapter,
  Environment,
  EncryptionConfig,
  StorageOptions,
  CreateStorageResult,
} from "./lib/storage/index.js";

// Secret Management
export {
  setDbAdapter,
  loadSecrets,
  getAppSecret,
  getEncryptionKey,
  getSessionConfig,
} from "./lib/secret.js";

// Native Astro 5+ Features & Utilities
export { kyroLoader, type KyroLoaderOptions } from "./loader.js";
export { kyroAction, type KyroActionOptions } from "./actions.js";
export { kyroAuthMiddleware, type KyroAuthMiddlewareOptions } from "./middleware.js";
export { generateKyroAstroTypes } from "./typegen.js";
export { kyroEnvSchema, type KyroEnvSchemaOptions } from "./env.js";
export { isEdgeRuntime } from "./utils/runtime.js";
export { Logger, logger, type LogLevel } from "./utils/logger.js";


