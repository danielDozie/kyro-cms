import * as hono from 'hono';
import * as hono_types from 'hono/types';
import { S as StorageProvider, R as Registry } from './index-BJ1rwHxk.cjs';
export { C as ConfigService, E as EmailConfig, a as StorageConfig, c as createRegistry, g as getRegistry, r as resetRegistry, b as resolveProvider } from './index-BJ1rwHxk.cjs';
import { B as BaseAdapter, P as PluginManager, K as KyroConfig, k as User, R as Request$1, C as CollectionConfig, G as GlobalConfig, F as FindArgs, b as FindResult, c as FindByIDArgs, d as CreateArgs, e as UpdateArgs, D as DeleteArgs, f as FindOneArgs, g as FindVersionsArgs, h as VersionRecord, i as CreateVersionArgs } from './types-DOKMyC3y.cjs';
export { l as AccessArgs, m as AccessControl, n as AdapterConfig, A as AdminConfig, o as AnalyticsPlugin, a as AuthConfig, p as CollectionAccess, q as CollectionHooks, r as CommentsPlugin, s as CreateResult, t as FieldAccess, u as FieldHooks, v as GlobalAccess, w as GlobalHooks, H as Hook, x as HookArgs, I as ImageSize, j as KyroPlugin, y as PluginAPI, z as PluginHooks, E as ReviewsPlugin, S as SEOPlugin, U as UploadConfig, V as VersionConfig, W as WhereClause, J as WishlistPlugin, L as evaluateAccess, M as getWhereClause, N as mergeWhereClauses, O as presetPlugins, Q as runFieldHooks, X as runHooks } from './types-DOKMyC3y.cjs';
import { KyroPubSub, KyroWSServer } from './ws/index.cjs';
export { PubSub, createWSServer } from './ws/index.cjs';
import { W as WebhookPayload, D as DeliveryResult, a as WebhookDelivery, b as WebhookConfig, c as DeliveryOptions, d as WebhookService } from './WebhookService-DgIx21X-.cjs';
export { A as ALL_WEBHOOK_EVENTS, C as CreateWebhookData, U as UpdateWebhookData, e as WEBHOOK_COLLECTION, f as WEBHOOK_DELIVERY_COLLECTION, g as WEBHOOK_EVENTS, h as WebhookEvent, i as WebhookTriggerResult, j as createWebhookService } from './WebhookService-DgIx21X-.cjs';
import { F as Field } from './types-euTszc-1.cjs';
export { A as ALL_FIELD_TYPES, a as ArrayField, B as BaseField, b as Block, e as BlocksField, v as COMPLEX_FIELD_TYPES, C as CheckboxField, f as CodeField, g as CollapsibleField, h as ColorField, D as DateField, E as EmailField, j as FieldAdmin, k as FieldType, G as GroupField, l as ImageField, J as JSONField, L as LAYOUT_FIELD_TYPES, M as MarkdownField, N as NumberField, x as PRIMITIVE_FIELD_TYPES, P as PasswordField, y as RELATIONAL_FIELD_TYPES, R as RadioField, m as RelationshipField, n as RichTextBlock, o as RichTextField, p as RowField, q as SelectField, T as TabsField, r as TextField, s as TextareaField, U as UploadField, V as ValidateOptions, O as isArrayField, Q as isBlocksField, W as isGroupField, Y as isImageField, Z as isLayoutField, _ as isNumberField, $ as isRelationshipField, a0 as isRichTextField, a1 as isSelectField, a2 as isTextField, a3 as isUploadField } from './types-euTszc-1.cjs';
import { ZodTypeAny, z } from 'zod';
export { z } from 'zod';
export { n as normalizeRichTextValue, r as renderRichText, a as richTextStyles } from './richtext-DrhORshE.cjs';
import { A as AbstractBaseAdapter } from './base-DDEmdRqV.cjs';
import { Dialect } from './drizzle/index.cjs';
export { DrizzleAdapter, PostgresAuthAdapter, collectionToDrizzleSchema, createDatabase, createDrizzleAdapter, fieldToDrizzleType, runMigrations, seedDefaultRoles } from './drizzle/index.cjs';
export { MongoDBAdapter, MongoDBAuthAdapter, createMongoDBAdapter } from './mongodb/index.cjs';
export { createContext, createCountProcedure, createCreateProcedure, createDeleteProcedure, createDynamicRouter, createFindByIDProcedure, createFindProcedure, createKyroServer, createUpdateProcedure } from './trpc/index.cjs';
export { buildGraphQLSchema, createGraphQLSchema } from './graphql/index.cjs';
export { createHonoApp, createRESTAPI } from './rest/index.cjs';
export { A as AdminStylingConfig, C as CSSGenerator, F as FieldStyling, S as StylingConfig, a as StylingMode, T as ThemeBorderRadius, b as ThemeColors, c as ThemeConfig, d as ThemeFonts, e as ThemeShadows, f as ThemeSpacing, g as createAdminStyling, h as defaultDarkTheme, i as defaultFieldStyling, j as defaultLightTheme, k as ecommerce2026Theme, l as generateCSSVariables, m as generateTailwindConfig } from './index-Bz9JqRGI.cjs';
import { d as AuditLog, e as AuditLogFilter, A as AuthAdapter, U as UserRole, c as AuthUser, S as Session, b as AuthTokenConfig, R as RegisterData, a as AuthResult, L as LoginCredentials, J as JWTPayload } from './types-CpjuXbe7.cjs';
export { f as AuditAction } from './types-CpjuXbe7.cjs';
export { TemplateConfig, allGlobalSettings, blogCollections, coreGlobalSettings, createTemplateConfig, ecommerceCollections, ecommerceGlobals, kitchenSinkCollections, mediaCollections, minimalCollections, templateCollections } from './templates/index.cjs';
export { default as kyro } from './integration.cjs';
import { Loader } from 'astro/loaders';
import 'ws';
import 'drizzle-orm/postgres-js';
import 'graphql';
import 'astro';

interface LocalStorageConfig {
    uploadDir: string;
    baseUrl?: string;
}
declare function createLocalStorage(config: LocalStorageConfig): StorageProvider;

declare function signPayload(payload: string, secret: string): string;
declare function generateWebhookSecret(): string;
declare function deliverWebhook(webhook: WebhookConfig, payload: WebhookPayload, options?: DeliveryOptions): Promise<DeliveryResult>;
declare function deliverWithRetry(webhook: WebhookConfig, payload: WebhookPayload, deliveryId: string, options?: DeliveryOptions): Promise<DeliveryResult>;
declare function buildDeliveryRecord(deliveryId: string, webhookId: string, event: string, payload: WebhookPayload, attempt: number, result: DeliveryResult): WebhookDelivery;
declare function createTestPayload(): WebhookPayload;

type Redis$2 = any;

declare class AuditLogger {
    private redis;
    private prefix;
    private retentionDays;
    constructor(redis: Redis$2, retentionDays?: number, prefix?: string);
    log(data: Omit<AuditLog, "id" | "timestamp">): Promise<string>;
    get(id: string): Promise<AuditLog | null>;
    query(filter?: AuditLogFilter): Promise<{
        logs: AuditLog[];
        total: number;
    }>;
    getRecent(limit?: number): Promise<AuditLog[]>;
    getUserActivity(userId: string, limit?: number): Promise<AuditLog[]>;
    getStats(startDate?: Date, endDate?: Date): Promise<{
        totalEvents: number;
        byAction: Record<string, number>;
        successRate: number;
        failedLogins: number;
        uniqueUsers: Set<string>;
    }>;
    cleanup(): Promise<number>;
    private getKeyForDate;
    private getKeysForDateRange;
    private matchesFilter;
    private serializeLog;
    private deserializeLog;
}
declare function createAuditContext(req: Request): {
    ipAddress: string;
    userAgent: string;
};

declare function applyCollectionOverrides(collections: CollectionConfig[], overrides?: Record<string, any>): void;
declare class Kyro {
    registry: Registry;
    db: BaseAdapter;
    pubsub: KyroPubSub;
    webhookService: WebhookService;
    settings?: Record<string, any>;
    pluginManager: PluginManager;
    private wsServer?;
    private config;
    constructor(config: KyroConfig);
    init(): Promise<void>;
    loadSettings(): Promise<Record<string, any>>;
    loadPluginState(): Promise<void>;
    getREST(options?: {
        user?: User;
        req?: Request$1;
        tenantId?: string;
    }): Promise<hono.Hono<hono_types.BlankEnv, hono_types.BlankSchema, "/">>;
    getGraphQL(options?: {
        user?: User;
        req?: Request$1;
        tenantId?: string;
    }): {
        fetch: (request: any, locals?: any) => Promise<Response>;
        schema: any;
    };
    getTRPC(options?: {
        user?: User;
        req?: Request$1;
        tenantId?: string;
    }): {
        fetch: (request: any, locals?: any) => Promise<Response>;
        router: any;
    };
    getWS(): KyroWSServer | undefined;
    startWebSocket(options?: {
        port?: number;
        requireAuth?: boolean;
        verifyToken?: (token: string) => Promise<any>;
    }): Promise<KyroWSServer | null>;
    shutdown(): Promise<void>;
}
declare function createKyro(config: KyroConfig): Kyro;

interface BaseEmailOptions {
    title: string;
    previewText?: string;
    badgeText?: string;
    badgeType?: "success" | "info" | "warning" | "error";
    bodyHtml: string;
    ctaText?: string;
    ctaUrl?: string;
    secondaryCtaText?: string;
    secondaryCtaUrl?: string;
}
declare function renderBaseLayout(options: BaseEmailOptions): string;

declare function renderVerifyEmail(link: string, userName?: string): {
    subject: string;
    html: string;
    text: string;
};

declare function renderResetPassword(link: string, userName?: string): {
    subject: string;
    html: string;
    text: string;
};

declare function renderWelcome(userName?: string, appUrl?: string): {
    subject: string;
    html: string;
    text: string;
};

declare function renderPasswordChanged(userName?: string): {
    subject: string;
    html: string;
    text: string;
};

declare function renderMagicLink(link: string, code?: string, userName?: string): {
    subject: string;
    html: string;
    text: string;
};

declare function renderAccountLocked(attempts: number, durationMinutes: number, userName?: string): {
    subject: string;
    html: string;
    text: string;
};

declare function renderUserInvite(inviteUrl: string, roleName?: string, inviterName?: string): {
    subject: string;
    html: string;
    text: string;
};

/**
 * Returns complete EmailTemplates registry for EmailTransport
 */
declare function getEmailTemplates(): {
    verifyEmail: (link: string, userName?: string) => {
        subject: string;
        html: string;
        text: string;
    };
    resetPassword: (link: string, userName?: string) => {
        subject: string;
        html: string;
        text: string;
    };
    welcome: (userName?: string, appUrl?: string) => {
        subject: string;
        html: string;
        text: string;
    };
    passwordChanged: (userName?: string) => {
        subject: string;
        html: string;
        text: string;
    };
    magicLink: (link: string, code?: string, userName?: string) => {
        subject: string;
        html: string;
        text: string;
    };
    accountLocked: (attempts: number, durationMinutes: number, userName?: string) => {
        subject: string;
        html: string;
        text: string;
    };
    newLogin: (location: string, time: string, userName?: string) => {
        subject: string;
        html: string;
        text: string;
    };
    userInvite: (inviteUrl: string, roleName?: string, inviterName?: string) => {
        subject: string;
        html: string;
        text: string;
    };
};

declare class ConfigValidationError extends Error {
    errors: string[];
    constructor(errors: string[]);
}
declare function validateCollection(config: CollectionConfig): string[];
declare function validateGlobal(config: GlobalConfig): string[];
declare function validateFields(fields: Field[], context: string): string[];
declare function validateConfig(collections: CollectionConfig[], globals?: GlobalConfig[]): void;

declare function fieldToZod(field: Field): ZodTypeAny;
declare function collectionToZod(collection: CollectionConfig): ZodTypeAny;
declare function collectionToCreateZod(collection: CollectionConfig): ZodTypeAny;
declare function collectionToUpdateZod(collection: CollectionConfig): ZodTypeAny;
declare function collectionToWhereZod(collection: CollectionConfig): ZodTypeAny;
declare function globalToZod(global: GlobalConfig): ZodTypeAny;

type DatabaseType$1 = 'postgres' | 'sqlite' | 'mongodb';
interface DatabaseConnectionOptions {
    type: DatabaseType$1;
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    url?: string;
    ssl?: boolean | Record<string, any>;
    maxConnections?: number;
    connectionTimeout?: number;
}
interface DrizzleAdapterOptions {
    type?: 'postgres' | 'sqlite';
    client?: any;
    schema?: any;
    connectionString?: string;
    connectionOptions?: DatabaseConnectionOptions;
}
interface MongoDBAdapterOptions {
    type: 'mongodb';
    client?: any;
    database?: string;
    connectionString?: string;
    connectionOptions?: DatabaseConnectionOptions;
}
type AdapterOptions = DrizzleAdapterOptions | MongoDBAdapterOptions;

declare class LocalAdapter extends AbstractBaseAdapter {
    private db;
    private path?;
    private migrations;
    private readonly versionsTableName;
    constructor(options: {
        db?: any;
        path?: string;
    });
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    private ensureTable;
    private ensureVersionsTable;
    private resolveCol;
    private col;
    private fieldToSQL;
    private parseGlobalsSlug;
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
    updateLatestVersion<T = Record<string, any>>(args: CreateVersionArgs<T>): Promise<VersionRecord<T>>;
    deleteVersions(args: {
        collection: string;
        documentId: string;
        keepLatest?: number;
        tenantId?: string;
    }): Promise<void>;
    private rowToVersion;
    protected prepareData(data: Record<string, any>, config: CollectionConfig | GlobalConfig): Record<string, any>;
    private rowToDoc;
    private generateId;
    private getMediaById;
    private getTableNameFor;
    migrate(): Promise<void>;
    rollback(): Promise<void>;
    transaction<T>(fn: (tx: any) => Promise<T>): Promise<T>;
    getDatabase(): any;
    exec(sql: string): void;
    prepare(sql: string): any;
}
declare function createLocalAdapter(options?: {
    db?: any;
    path?: string;
}): LocalAdapter;

interface NeonAdapterOptions {
    connectionString: string;
}
/**
 * Edge-Native Neon HTTP PostgreSQL Database Adapter for Kyro CMS.
 * Uses Web-standard `fetch` HTTP requests to execute SQL queries on V8 Edge Isolates.
 */
declare class NeonAdapter extends AbstractBaseAdapter {
    private connectionString;
    constructor(options: NeonAdapterOptions);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    query<T = any>(sql: string, params?: any[]): Promise<T[]>;
    find(args: any): Promise<any>;
    findByID(args: any): Promise<any>;
    create(args: any): Promise<any>;
    update(args: any): Promise<any>;
    delete(args: any): Promise<any>;
    count(args: {
        collection: string;
        where?: Record<string, any>;
        tenantId?: string;
    }): Promise<number>;
    findOne(args: FindOneArgs): Promise<any>;
    findVersions(args: any): Promise<any>;
    findVersionByID(args: {
        collection: string;
        versionId: string;
        tenantId?: string;
    }): Promise<any>;
    createVersion<T = Record<string, any>>(args: any): Promise<any>;
    updateLatestVersion<T = Record<string, any>>(args: any): Promise<any>;
    deleteVersions(args: {
        collection: string;
        documentId: string;
        keepLatest?: number;
        tenantId?: string;
    }): Promise<void>;
}
declare function createNeonAdapter(options: NeonAdapterOptions): NeonAdapter;

interface TursoAdapterOptions {
    url: string;
    authToken?: string;
}
/**
 * Edge-Native Turso / libSQL HTTP Database Adapter for Kyro CMS.
 * Executes SQL queries over Web-standard `fetch` HTTP requests on V8 Edge Isolates.
 */
declare class TursoAdapter extends AbstractBaseAdapter {
    private url;
    private authToken?;
    constructor(options: TursoAdapterOptions);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    query<T = any>(sql: string, params?: any[]): Promise<T[]>;
    find(args: any): Promise<any>;
    findByID(args: any): Promise<any>;
    create(args: any): Promise<any>;
    update(args: any): Promise<any>;
    delete(args: any): Promise<any>;
    count(args: {
        collection: string;
        where?: Record<string, any>;
        tenantId?: string;
    }): Promise<number>;
    findOne(args: FindOneArgs): Promise<any>;
    findVersions(args: any): Promise<any>;
    findVersionByID(args: {
        collection: string;
        versionId: string;
        tenantId?: string;
    }): Promise<any>;
    createVersion<T = Record<string, any>>(args: any): Promise<any>;
    updateLatestVersion<T = Record<string, any>>(args: any): Promise<any>;
    deleteVersions(args: {
        collection: string;
        documentId: string;
        keepLatest?: number;
        tenantId?: string;
    }): Promise<void>;
}
declare function createTursoAdapter(options: TursoAdapterOptions): TursoAdapter;

interface RedisAuthAdapterOptions {
    url?: string;
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
    tokenExpiration?: number;
    refreshTokenExpiration?: number;
    tls?: boolean;
}
declare class RedisAuthAdapter implements AuthAdapter {
    private _redis;
    private prefix;
    private tokenExpiration;
    private refreshExpiration;
    private options;
    constructor(options?: RedisAuthAdapterOptions);
    private getRedis;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    private userKey;
    private sessionKey;
    private refreshKey;
    private userByEmailKey;
    private passwordHistoryKey;
    createUser(data: {
        email: string;
        password: string;
        role?: UserRole;
        tenantId?: string;
    }): Promise<AuthUser>;
    findUserByEmail(email: string): Promise<AuthUser | null>;
    findUserById(userId: string): Promise<AuthUser | null>;
    updateUser(userId: string, data: Partial<AuthUser>): Promise<AuthUser | null>;
    deleteUser(userId: string): Promise<boolean>;
    hashPassword(password: string): Promise<string>;
    verifyPassword(email: string, password: string): Promise<AuthUser | null>;
    createSession(userId: string, data?: {
        ipAddress?: string;
        userAgent?: string;
    }): Promise<Session>;
    findSessionByToken(token: string): Promise<Session | null>;
    findSessionByRefreshToken(refreshToken: string): Promise<Session | null>;
    deleteSession(sessionId: string): Promise<boolean>;
    deleteUserSessions(userId: string): Promise<number>;
    addPasswordToHistory(userId: string, passwordHash: string): Promise<void>;
    getPasswordHistory(userId: string, count?: number): Promise<string[]>;
    isPasswordInHistory(password: string, userId: string, historyCount?: number): Promise<boolean>;
    private userToHash;
    private hashToUser;
    private sessionToHash;
    private hashToSession;
    private tokenKey;
    createEmailVerificationToken(userId: string): Promise<{
        token: string;
        expiresAt: Date;
    }>;
    verifyEmailToken(token: string): Promise<{
        success: boolean;
        userId?: string;
        error?: string;
    }>;
    createPasswordResetToken(email: string): Promise<{
        token: string;
        expiresAt: Date;
        error?: string;
    }>;
    resetPasswordWithToken(token: string, newPassword: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    private auditLogKey;
    private auditLogIndexKey;
    findAuditLogs(filter: {
        userId?: string;
        action?: string | string[];
        resource?: string;
        success?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<{
        logs: any[];
        total: number;
    }>;
    createAuditLog(data: any): Promise<any>;
}

interface EmailConfig {
    provider: "smtp" | "resend" | "sendgrid" | "mailgun" | "ses";
    from: string;
    fromName?: string;
    replyTo?: string;
    smtp?: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
            user: string;
            pass: string;
        };
    };
    resend?: {
        apiKey: string;
    };
    sendgrid?: {
        apiKey: string;
    };
    mailgun?: {
        apiKey: string;
        domain: string;
        region?: "us" | "eu";
    };
    ses?: {
        accessKeyId: string;
        secretAccessKey: string;
        region: string;
    };
}
interface EmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
}
interface EmailTemplates {
    verifyEmail: (link: string, userName?: string) => {
        subject: string;
        html: string;
        text: string;
    };
    resetPassword: (link: string, userName?: string) => {
        subject: string;
        html: string;
        text: string;
    };
    welcome: (userName?: string) => {
        subject: string;
        html: string;
        text: string;
    };
    accountLocked: (attempts: number, duration: number, userName?: string) => {
        subject: string;
        html: string;
        text: string;
    };
    passwordChanged: (userName?: string) => {
        subject: string;
        html: string;
        text: string;
    };
    newLogin: (location: string, time: string, userName?: string) => {
        subject: string;
        html: string;
        text: string;
    };
}
declare class EmailTransport {
    private transporter?;
    private config;
    private templates;
    private transporterInitialized;
    constructor(config: EmailConfig, templates?: Partial<EmailTemplates>);
    private ensureTransporter;
    send(options: EmailOptions): Promise<any>;
    private sendViaResend;
    private sendViaSendGrid;
    private sendViaMailgun;
    getTemplates(): EmailTemplates;
    verifyConnection(): Promise<boolean>;
    static fromConfig(db: any): Promise<EmailTransport | null>;
    static fromEnv(): EmailTransport | null;
}

interface BootstrapConfig {
    authAdapter?: AuthAdapter;
    authDbPath?: string;
    adminEmail: string;
    adminPassword: string;
    adminRole?: string;
    tenantId?: string;
    emailConfig?: EmailConfig;
    sendWelcomeEmail?: boolean;
}
interface BootstrapResult {
    success: boolean;
    user?: AuthUser;
    error?: string;
}
declare function bootstrapAdmin(config: BootstrapConfig): Promise<BootstrapResult>;
declare function getBootstrapFromEnv(): BootstrapConfig | null;
declare function autoBootstrap(authAdapter?: AuthAdapter): Promise<BootstrapResult | null>;
declare function bootstrapWithRetry(config: BootstrapConfig, maxRetries?: number, retryDelayMs?: number): Promise<BootstrapResult>;

interface PasswordPolicyConfig {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventReuse: number;
    maxLength?: number;
}
interface ValidationResult {
    valid: boolean;
    errors: string[];
}
declare class PasswordPolicy {
    private config;
    constructor(config?: Partial<PasswordPolicyConfig>);
    validate(password: string): ValidationResult;
    checkReuse(passwordHash: string, history: string[], verifyFn: (password: string, hash: string) => Promise<boolean>): Promise<ValidationResult>;
    isInHistory(password: string, history: string[], verifyFn: (password: string, hash: string) => Promise<boolean>): Promise<boolean>;
    generatePassword(length?: number): string;
    getStrength(password: string): {
        score: number;
        label: string;
        feedback: string[];
    };
    setConfig(config: Partial<PasswordPolicyConfig>): void;
    getConfig(): PasswordPolicyConfig;
}

type Redis$1 = any;
interface LockoutConfig {
    maxAttempts: number;
    lockDuration: number;
    notifyUser: boolean;
    notifyAdmin: boolean;
    adminNotifyAfter: number;
}
interface LockoutStatus {
    locked: boolean;
    attemptsRemaining: number;
    lockedUntil?: Date;
    totalAttempts: number;
}
declare class AccountLockout {
    private redis;
    private prefix;
    private config;
    constructor(redis: Redis$1, config?: Partial<LockoutConfig>, prefix?: string);
    private lockKey;
    private historyKey;
    checkLockout(userId: string): Promise<LockoutStatus>;
    recordFailedAttempt(userId: string): Promise<LockoutStatus>;
    lockAccount(userId: string, duration?: number): Promise<void>;
    unlockAccount(userId: string): Promise<void>;
    resetAttempts(userId: string): Promise<void>;
    getLockoutHistory(userId: string, limit?: number): Promise<Date[]>;
    getLockoutStats(userId: string): Promise<{
        totalFailedAttempts: number;
        lockoutCount: number;
        lastLockout: Date | null;
        averageAttemptsBeforeLockout: number;
    }>;
    shouldNotifyAdmin(currentAttempts: number): boolean;
    getConfig(): LockoutConfig;
    setConfig(config: Partial<LockoutConfig>): void;
}

type Redis = any;
interface RateLimitConfig {
    window: number;
    max: number;
}
interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
}
declare class RateLimiter {
    private redis;
    private prefix;
    private limits;
    private userLimits;
    constructor(redis: Redis, limits?: Record<string, RateLimitConfig>, userLimits?: Record<string, RateLimitConfig>, prefix?: string);
    private getKey;
    check(type: string, identifier: string): Promise<RateLimitResult>;
    checkUser(type: string, userId: string, identifier: string): Promise<RateLimitResult>;
    reset(type: string, identifier: string): Promise<void>;
    resetUser(type: string, userId: string, identifier: string): Promise<void>;
    getStatus(type: string, identifier: string): Promise<{
        count: number;
        limit: number;
        remaining: number;
        resetAt: number;
    }>;
    setLimit(type: string, config: RateLimitConfig): void;
    setUserLimit(type: string, config: RateLimitConfig): void;
}

declare class InMemoryRateLimiter {
    private storage;
    private userStorage;
    private limits;
    private userLimits;
    constructor(limits?: Record<string, RateLimitConfig>, userLimits?: Record<string, RateLimitConfig>);
    private getKey;
    private getUserKey;
    private cleanupOldEntries;
    check(type: string, identifier: string): Promise<RateLimitResult>;
    checkUser(type: string, userId: string, identifier: string): Promise<RateLimitResult>;
    reset(type: string, identifier: string): Promise<void>;
    resetUser(type: string, userId: string, identifier: string): Promise<void>;
    getStatus(type: string, identifier: string): Promise<{
        count: number;
        limit: number;
        remaining: number;
        resetAt: number;
    }>;
    setLimit(type: string, config: RateLimitConfig): void;
    setUserLimit(type: string, config: RateLimitConfig): void;
}

declare class InMemoryAccountLockout {
    private storage;
    private history;
    private config;
    constructor(config?: Partial<LockoutConfig>);
    checkLockout(userId: string): Promise<LockoutStatus>;
    recordFailedAttempt(userId: string): Promise<LockoutStatus>;
    lockAccount(userId: string, duration?: number): Promise<void>;
    unlockAccount(userId: string): Promise<void>;
    resetAttempts(userId: string): Promise<void>;
    getLockoutHistory(userId: string, limit?: number): Promise<Date[]>;
    getLockoutStats(userId: string): Promise<{
        totalFailedAttempts: number;
        lockoutCount: number;
        lastLockout: Date | null;
        averageAttemptsBeforeLockout: number;
    }>;
    shouldNotifyAdmin(currentAttempts: number): boolean;
    getConfig(): LockoutConfig;
    setConfig(config: Partial<LockoutConfig>): void;
}

declare class InMemoryAuditLogger {
    private logs;
    private retentionDays;
    constructor(retentionDays?: number);
    log(data: Omit<AuditLog, "id" | "timestamp">): Promise<string>;
    get(id: string): Promise<AuditLog | null>;
    query(filter?: AuditLogFilter): Promise<{
        logs: AuditLog[];
        total: number;
    }>;
    getRecent(limit?: number): Promise<AuditLog[]>;
    getUserActivity(userId: string, limit?: number): Promise<AuditLog[]>;
    getStats(startDate?: Date, endDate?: Date): Promise<{
        totalEvents: number;
        byAction: Record<string, number>;
        successRate: number;
        failedLogins: number;
        uniqueUsers: Set<string>;
    }>;
    cleanup(): Promise<number>;
    private cleanupOldLogs;
}

interface AuthRoutesConfig {
    redis: AuthAdapter;
    jwtSecret?: string;
    jwtExpiresIn?: string;
    jwtIssuer?: string;
    jwtAudience?: string;
    email?: EmailTransport;
    passwordPolicy?: PasswordPolicy;
    lockout?: InMemoryAccountLockout;
    rateLimiter?: InMemoryRateLimiter;
    auditLogger?: InMemoryAuditLogger;
    baseUrl?: string;
    emailVerificationRequired?: boolean;
}
declare class AuthRoutes {
    private authAdapter;
    private email?;
    private passwordPolicy;
    private lockout?;
    private rateLimiter?;
    private auditLogger?;
    private baseUrl;
    private emailVerificationRequired;
    constructor(config: AuthRoutesConfig);
    private getBaseUrl;
    register(req: Request): Promise<Response>;
    login(req: Request): Promise<Response>;
    logout(req: Request): Promise<Response>;
    refresh(req: Request): Promise<Response>;
    me(req: Request): Promise<Response>;
    changePassword(req: Request): Promise<Response>;
    forgotPassword(req: Request): Promise<Response>;
    resetPassword(req: Request): Promise<Response>;
    verifyEmail(req: Request): Promise<Response>;
    private recordFailedLogin;
    private sanitizeUser;
    private jsonResponse;
    listSessions(req: Request): Promise<Response>;
    revokeSession(req: Request, sessionId: string): Promise<Response>;
    revokeOtherSessions(req: Request): Promise<Response>;
    renameSession(req: Request, sessionId: string): Promise<Response>;
    refreshSession(req: Request): Promise<Response>;
    private errorResponse;
    private rateLimitResponse;
}

type DatabaseType = "sqlite" | "postgres" | "mongodb" | "memory";
interface KyroAuthConfig {
    authAdapter: AuthAdapter;
    databaseType?: string;
    email?: EmailTransport;
    passwordPolicy: PasswordPolicy;
    lockout?: InMemoryAccountLockout;
    rateLimiter?: InMemoryRateLimiter;
    auditLogger?: InMemoryAuditLogger;
    routes: AuthRoutes;
}
declare function createAuthConfig(databaseType?: string, db?: any): Promise<KyroAuthConfig>;
declare const authConfig: Promise<any>;

declare class InMemoryAuthAdapter implements AuthAdapter {
    private users;
    private sessions;
    private refreshTokens;
    private emailToUserId;
    private passwordHistory;
    private emailVerificationTokens;
    private passwordResetTokens;
    private auditLogs;
    private externalDb;
    constructor();
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    createUser(data: {
        email: string;
        password: string;
        role?: UserRole;
        tenantId?: string;
    }): Promise<AuthUser>;
    findUserByEmail(email: string): Promise<AuthUser | null>;
    findUserById(userId: string): Promise<AuthUser | null>;
    updateUser(userId: string, data: Partial<AuthUser>): Promise<AuthUser | null>;
    deleteUser(userId: string): Promise<boolean>;
    hashPassword(password: string): Promise<string>;
    verifyPassword(email: string, password: string): Promise<AuthUser | null>;
    createSession(userId: string, data?: {
        ipAddress?: string;
        userAgent?: string;
    }): Promise<Session>;
    findSessionByToken(token: string): Promise<Session | null>;
    findSessionByRefreshToken(refreshToken: string): Promise<Session | null>;
    deleteSession(sessionId: string): Promise<boolean>;
    deleteUserSessions(userId: string): Promise<number>;
    addPasswordToHistory(userId: string, passwordHash: string): Promise<void>;
    getPasswordHistory(userId: string, count?: number): Promise<string[]>;
    isPasswordInHistory(password: string, userId: string, historyCount?: number): Promise<boolean>;
    createEmailVerificationToken(userId: string): Promise<{
        token: string;
        expiresAt: Date;
    }>;
    verifyEmailToken(token: string): Promise<{
        success: boolean;
        userId?: string;
        error?: string;
    }>;
    createPasswordResetToken(email: string): Promise<{
        token: string;
        expiresAt: Date;
        error?: string;
    }>;
    resetPasswordWithToken(token: string, newPassword: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    hasAnyUsers(): Promise<boolean>;
    findAuditLogs(filter: {
        userId?: string;
        action?: string | string[];
        resource?: string;
        success?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<{
        logs: any[];
        total: number;
    }>;
    createAuditLog(data: any): Promise<any>;
}

declare class Auth {
    private adapter;
    private config;
    constructor(adapter: AuthAdapter, config: AuthTokenConfig);
    register(data: RegisterData): Promise<AuthResult>;
    login(credentials: LoginCredentials): Promise<AuthResult>;
    logout(token: string): Promise<void>;
    refreshToken(refreshToken: string): Promise<AuthResult>;
    verifyToken(token: string): Promise<JWTPayload | null>;
    getUserFromToken(token: string): Promise<AuthUser | null>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<AuthResult>;
    resetPassword(email: string, newPassword: string): Promise<AuthResult>;
    sendEmailVerification(userId: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    verifyEmail(token: string): Promise<{
        success: boolean;
        userId?: string;
        error?: string;
    }>;
    requestPasswordReset(email: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    resetPasswordWithToken(token: string, newPassword: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    deleteAccount(userId: string): Promise<AuthResult>;
    private createSessionForUser;
    private generateToken;
    private hashPassword;
    private parseExpiresIn;
}
declare function createAuth(adapter: AuthAdapter, config: AuthTokenConfig): Auth;

interface SQLiteAuthAdapterOptions {
    path?: string;
    db?: any;
    saltRounds?: number;
    busyTimeout?: number;
    walAutoCheckpoint?: number;
    cacheSize?: number;
    mmapSize?: number;
}
declare class SQLiteAuthAdapter implements AuthAdapter {
    private db;
    private path;
    private saltRounds;
    private externalDb;
    private busyTimeout;
    private walAutoCheckpoint;
    private cacheSize;
    private mmapSize;
    private preparedStatements;
    constructor(options?: SQLiteAuthAdapterOptions);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    private ensureConnected;
    private ensureTables;
    private prepareStatements;
    private stmt;
    cleanupExpiredSessions(): Promise<number>;
    cleanupOldAuditLogs(retentionDays?: number): Promise<number>;
    getStats(): Promise<{
        userCount: number;
        activeSessionCount: number;
        auditLogCount: number;
    }>;
    createUser(data: {
        email: string;
        password: string;
        name?: string;
        role?: UserRole;
        avatar?: string;
        tenantId?: string;
    }): Promise<AuthUser>;
    findUserByEmail(email: string): Promise<AuthUser | null>;
    findUserById(userId: string): Promise<AuthUser | null>;
    updateUser(userId: string, data: Partial<AuthUser>): Promise<AuthUser | null>;
    deleteUser(userId: string): Promise<boolean>;
    hashPassword(password: string): Promise<string>;
    verifyPassword(email: string, password: string): Promise<AuthUser | null>;
    createSession(userId: string, data?: {
        ipAddress?: string;
        userAgent?: string;
    }): Promise<Session>;
    findSessionByToken(token: string): Promise<Session | null>;
    findSessionByRefreshToken(refreshToken: string): Promise<Session | null>;
    deleteSession(sessionId: string): Promise<boolean>;
    deleteUserSessions(userId: string): Promise<number>;
    hasAnyUsers(): Promise<boolean>;
    findUsers(options?: {
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<{
        users: AuthUser[];
        total: number;
    }>;
    addPasswordToHistory(userId: string, passwordHash: string): Promise<void>;
    getPasswordHistory(userId: string, count?: number): Promise<string[]>;
    isPasswordInHistory(password: string, userId: string, historyCount?: number): Promise<boolean>;
    recordFailedAttempt(userId: string): Promise<void>;
    resetAttempts(userId: string): Promise<void>;
    checkLockout(userId: string): Promise<{
        locked: boolean;
        attemptsRemaining: number;
        lockedUntil?: Date;
        totalAttempts: number;
    }>;
    logAudit(data: {
        action: string;
        userId?: string;
        userEmail?: string;
        role?: string;
        resource: string;
        resourceId?: string;
        ipAddress?: string;
        userAgent?: string;
        success: boolean;
        error?: string;
        metadata?: Record<string, unknown>;
    }): Promise<string>;
    queryAuditLogs(options?: {
        action?: string;
        userId?: string;
        resource?: string;
        success?: boolean;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }): Promise<{
        logs: Array<{
            id: string;
            timestamp: Date;
            action: string;
            userId?: string;
            userEmail?: string;
            resource: string;
            resourceId?: string;
            ipAddress?: string;
            userAgent?: string;
            success: boolean;
            error?: string;
            metadata?: Record<string, unknown>;
        }>;
        total: number;
    }>;
    private rowToUser;
    private rowToSession;
    findAuditLogs(filter: AuditLogFilter): Promise<{
        logs: AuditLog[];
        total: number;
    }>;
    createAuditLog(data: Omit<AuditLog, "id" | "timestamp">): Promise<AuditLog>;
    createEmailVerificationToken(userId: string): Promise<{
        token: string;
        expiresAt: Date;
    }>;
    verifyEmailToken(token: string): Promise<{
        success: boolean;
        userId?: string;
        error?: string;
    }>;
    createPasswordResetToken(email: string): Promise<{
        token: string;
        expiresAt: Date;
        error?: string;
    }>;
    resetPasswordWithToken(token: string, newPassword: string): Promise<{
        success: boolean;
        error?: string;
    }>;
}

type VersionStatus = 'draft' | 'published' | 'archived';
interface Version<T = Record<string, unknown>> {
    id: string;
    collection: string;
    documentId: string;
    version: number;
    status: VersionStatus;
    data: T;
    createdBy: string;
    createdAt: Date;
    publishedAt?: Date;
    changeDescription?: string;
}
interface VersionDiff {
    field: string;
    oldValue: unknown;
    newValue: unknown;
}
interface VersionHistoryOptions {
    collection: string;
    documentId: string;
    limit?: number;
    offset?: number;
}
interface CreateVersionOptions<T = Record<string, unknown>> {
    collection: string;
    documentId: string;
    data: T;
    status?: VersionStatus;
    createdBy: string;
    changeDescription?: string;
}
interface PublishVersionOptions {
    collection: string;
    documentId: string;
    versionId: string;
    publishedBy: string;
}
interface CompareVersionsOptions {
    collection: string;
    documentId: string;
    versionA: string | number;
    versionB: string | number;
}
interface VersionAdapter {
    createVersion<T>(options: CreateVersionOptions<T>): Promise<Version<T>>;
    getVersion<T>(collection: string, versionId: string): Promise<Version<T> | null>;
    getVersions<T>(options: VersionHistoryOptions): Promise<Version<T>[]>;
    getLatestVersion<T>(collection: string, documentId: string): Promise<Version<T> | null>;
    getPublishedVersion<T>(collection: string, documentId: string): Promise<Version<T> | null>;
    publishVersion(options: PublishVersionOptions): Promise<void>;
    revertToVersion<T>(options: {
        collection: string;
        documentId: string;
        versionId: string;
        userId: string;
    }): Promise<Version<T>>;
    compareVersions<T>(options: CompareVersionsOptions): Promise<VersionDiff[]>;
    deleteVersions(collection: string, documentId: string): Promise<void>;
}
interface DraftPublishConfig {
    enabled?: boolean;
    draftsEnabled?: boolean;
    publishEnabled?: boolean;
    scheduleEnabled?: boolean;
    versioningEnabled?: boolean;
    maxVersionsPerDocument?: number;
    autoPublish?: boolean;
    requirePublishPermission?: boolean;
}
interface VersionPublishSchedule {
    versionId: string;
    scheduledFor: Date;
    status: 'pending' | 'published' | 'cancelled';
}
declare function getDefaultDraftPublishConfig(): Required<DraftPublishConfig>;

declare class VersionManager<T = Record<string, unknown>> {
    private adapter;
    private config;
    constructor(adapter: VersionAdapter, config?: DraftPublishConfig);
    createVersion(options: Omit<CreateVersionOptions<T>, 'version'>): Promise<Version<T>>;
    publishVersion(options: PublishVersionOptions): Promise<void>;
    unpublishDocument(collection: string, documentId: string): Promise<void>;
    revertToVersion(collection: string, documentId: string, versionId: string, userId: string): Promise<Version<T>>;
    getVersionHistory(collection: string, documentId: string, limit?: number, offset?: number): Promise<Version<T>[]>;
    compareTwoVersions(collection: string, documentId: string, versionA: string | number, versionB: string | number): Promise<VersionDiff[]>;
    getLatestDraft(collection: string, documentId: string): Promise<Version<T> | null>;
    getPublishedVersion(collection: string, documentId: string): Promise<Version<T> | null>;
    getVersion(collection: string, versionId: string): Promise<Version<T> | null>;
    schedulePublish(collection: string, documentId: string, versionId: string, scheduledFor: Date): Promise<void>;
    deleteVersionHistory(collection: string, documentId: string): Promise<void>;
    private pruneOldVersions;
}
declare function createVersionManager<T>(adapter: VersionAdapter, config?: DraftPublishConfig): VersionManager<T>;
declare function isPublished(status: VersionStatus): boolean;
declare function isDraft(status: VersionStatus): boolean;
declare function isArchived(status: VersionStatus): boolean;

type ExtendedDialect = Dialect | "mongodb";
interface MediaSearchParams {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    folder?: string;
    sortBy?: string;
    sortDir?: "asc" | "desc";
}
interface MediaRow {
    id: string;
    filename: string;
    title: string | null;
    originalName: string;
    mimeType: string;
    fileSize: number;
    width: number | null;
    height: number | null;
    url: string;
    thumbnailUrl: string | null;
    folder: string | null;
    provider: string;
    alt: string | null;
    caption: string | null;
    metadata: string | null;
    createdAt: string;
    updatedAt: string;
}
declare class MediaService {
    private db;
    private storage;
    private dialect;
    private genId;
    private mediaTable;
    private foldersTable;
    constructor(db: any, storage: StorageProvider, options?: {
        dialect?: ExtendedDialect;
        genId?: () => string;
    });
    static init(db: any, options?: {
        dialect?: ExtendedDialect;
        genId?: () => string;
        storageConfig?: any;
    }): Promise<MediaService>;
    private ensureTables;
    private now;
    private buildFindConditions;
    private rowToMedia;
    static resolveMediaUrl(url: string | null | undefined, origin?: string): string | null;
    private sqliteRun;
    private sqliteGet;
    upload(file: File, folder?: string, origin?: string): Promise<MediaRow>;
    uploadFromUrl(url: string, folder?: string, origin?: string): Promise<MediaRow>;
    delete(id: string, origin?: string): Promise<void>;
    deleteFile(url: string): Promise<void>;
    rename(id: string, newKey: string, origin?: string): Promise<MediaRow | null>;
    findById(id: string, origin?: string): Promise<MediaRow | null>;
    find(params?: MediaSearchParams, origin?: string): Promise<{
        docs: MediaRow[];
        totalDocs: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    update(id: string, data: {
        title?: string;
        alt?: string;
        caption?: string;
        folder?: string;
        metadata?: any;
        originalName?: string;
    }, origin?: string): Promise<MediaRow | null>;
    updateMany(ids: string[], data: {
        folder?: string;
    }): Promise<void>;
    listFolders(): Promise<string[]>;
    createFolder(name: string, parentPath?: string): Promise<void>;
    deleteFolder(folder: string): Promise<void>;
}

declare function defineConfig(config: {
    collections?: CollectionConfig[] | Record<string, CollectionConfig>;
    globals?: GlobalConfig[] | Record<string, GlobalConfig>;
    adapter: KyroConfig["adapter"];
    plugins?: KyroConfig["plugins"];
    auth?: KyroConfig["auth"];
    cors?: KyroConfig["cors"];
    admin?: KyroConfig["admin"];
    upload?: KyroConfig["upload"];
    graphQL?: KyroConfig["graphQL"];
    typescript?: KyroConfig["typescript"];
    localization?: KyroConfig["localization"];
    rateLimit?: KyroConfig["rateLimit"];
    debug?: KyroConfig["debug"];
}): KyroConfig;
declare const defineKyroConfig: typeof defineConfig;

interface SeoTagsOptions {
    siteSettings: any;
    seoSettings?: any;
    title?: string;
    description?: string;
    image?: string;
    url?: string;
}
/**
 * Generates standard SEO meta tags based on global site settings and page overrides.
 */
declare function generateSeoTags(options: SeoTagsOptions): string;
/**
 * Generates analytics script tags based on global site settings.
 */
declare function generateAnalyticsTags(siteSettings: any): string;

interface SocialLink {
    platform: string;
    url: string;
    label: string;
}
declare function getSocialLinksFromSettings(socialSettings: any): SocialLink[];
declare function getSocialLinks(db: BaseAdapter, options?: {
    draft?: boolean;
}): Promise<SocialLink[]>;

interface StoreConfig {
    storeName?: string;
    storeEmail?: string;
    storePhone?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
    };
    currency?: {
        code?: string;
        symbol?: string;
        position?: "before" | "after";
        decimals?: number;
    };
    tax?: {
        enabled?: boolean;
        rate?: number;
        includedInPrice?: boolean;
        taxId?: string;
    };
    shipping?: {
        enableLocalPickup?: boolean;
        flatRate?: number;
        freeShippingThreshold?: number;
    };
    orders?: {
        orderNumberPrefix?: string;
        allowGuestCheckout?: boolean;
        requirePhone?: boolean;
    };
}
declare function getStoreConfigFromSettings(settings: any): StoreConfig;
declare function getStoreConfig(db: BaseAdapter, options?: {
    draft?: boolean;
}): Promise<StoreConfig>;

interface PaymentConfig {
    testMode?: boolean;
    provider?: "stripe" | "paypal" | "square" | "manual";
    stripe?: {
        enabled?: boolean;
        publishableKey?: string;
        secretKey?: string;
        webhookSecret?: string;
    };
    paypal?: {
        enabled?: boolean;
        clientId?: string;
        clientSecret?: string;
        mode?: "sandbox" | "live";
    };
    square?: {
        enabled?: boolean;
        applicationId?: string;
        accessToken?: string;
        locationId?: string;
    };
    methods?: {
        cod?: boolean;
        bankTransfer?: boolean;
        cash?: boolean;
        check?: boolean;
    };
    bankTransfer?: {
        bankName?: string;
        accountName?: string;
        accountNumber?: string;
        routingNumber?: string;
        iban?: string;
        swift?: string;
    };
}
declare function getPaymentConfigFromSettings(settings: any): PaymentConfig;
declare function getPaymentConfig(db: BaseAdapter, options?: {
    draft?: boolean;
}): Promise<PaymentConfig>;

type StorageAdapter = 'indexeddb' | 'fs' | 'redis' | 'sqlite' | 'postgres';
type Environment = 'browser' | 'node';
interface EncryptionConfig {
    enabled: boolean;
    algorithm?: 'AES-256-GCM' | 'ChaCha20-Poly1305';
}
interface StorageConfig {
    environment: Environment;
    adapter?: StorageAdapter;
    connectionString?: string;
    encryption?: EncryptionConfig;
}
interface StorageOptions {
    namespace?: string;
    ttl?: number;
}
type CreateStorageResult = {
    storage: {
        getItem: (name: string) => string | null | Promise<string | null>;
        setItem: (name: string, value: string) => void | Promise<void>;
        removeItem: (name: string) => void | Promise<void>;
    };
    cleanup?: () => Promise<void>;
};

declare function createStorage(config: StorageConfig): Promise<CreateStorageResult & {
    storage: _StateStorage;
}>;
type _StateStorage = {
    getItem: (name: string) => string | null | Promise<string | null>;
    setItem: (name: string, value: string) => void | Promise<void>;
    removeItem: (name: string) => void | Promise<void>;
};
declare function createAuthStorage(config: StorageConfig): Promise<CreateStorageResult>;

declare function setDbAdapter(adapter: any): void;
declare function loadSecrets(): Promise<void>;
declare function getAppSecret(): string;
declare function getEncryptionKey(): string;
declare function getSessionConfig(): {
    maxAge: number;
    maxSessionsPerUser: number;
};

interface KyroLoaderOptions {
    collection: string;
    drafts?: boolean;
    limit?: number;
    configPath?: string;
}
/**
 * Native Astro 5+ Content Layer Loader for Kyro CMS.
 * Feeds Kyro CMS collection documents directly into Astro's `getCollection()` store.
 */
declare function kyroLoader(options: KyroLoaderOptions): Loader;

interface KyroActionOptions<TInput extends z.ZodTypeAny> {
    collection: string;
    action: 'create' | 'update' | 'delete' | 'find';
    schema?: TInput;
    access?: 'public' | 'authenticated' | 'admin';
}
/**
 * Type-safe Astro Actions handler for Kyro CMS collections.
 * Automatically validates incoming form submissions or RPC inputs against collection schemas.
 */
declare function kyroAction<TInput extends z.ZodTypeAny = z.ZodObject<any>>(options: KyroActionOptions<TInput>): {
    input: TInput | z.ZodObject<{}, "passthrough", z.ZodTypeAny, z.objectOutputType<{}, z.ZodTypeAny, "passthrough">, z.objectInputType<{}, z.ZodTypeAny, "passthrough">>;
    handler: (input: z.infer<TInput>, context: any) => Promise<{
        success: boolean;
        collection: string;
        action: "create" | "update" | "delete" | "find";
        data: z.TypeOf<TInput>;
        timestamp: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        collection?: undefined;
        action?: undefined;
        data?: undefined;
        timestamp?: undefined;
    }>;
};

interface KyroAuthMiddlewareOptions {
    protectedRoutes?: string[];
    loginPath?: string;
    cookieName?: string;
}
/**
 * Native Astro Middleware for Kyro CMS authentication & session management.
 * Populates `Astro.locals.kyroUser` and handles protected route authorization.
 */
declare function kyroAuthMiddleware(options?: KyroAuthMiddlewareOptions): (context: any, next: () => Promise<Response>) => Promise<any>;

/**
 * Helper to generate TypeScript declarations for Kyro CMS collections.
 * Can be invoked automatically during `npx astro sync` or dev server startup.
 */
declare function generateKyroAstroTypes(config: Record<string, any>): string;

interface KyroEnvSchemaOptions {
    requireDatabase?: boolean;
}
/**
 * Type-safe environment variable schema helper for Astro 5 (`astro:env`).
 */
declare function kyroEnvSchema(options?: KyroEnvSchemaOptions): {
    APP_SECRET: {
        context: "server";
        access: "secret";
        type: "string";
        optional: boolean;
    };
    DATABASE_URL: {
        context: "server";
        access: "secret";
        type: "string";
        optional: boolean;
    };
    PUBLIC_KYRO_URL: {
        context: "client";
        access: "public";
        type: "string";
        optional: boolean;
        default: string;
    };
};

interface KyroDevToolbarOptions {
    enabled?: boolean;
}
/**
 * Astro Integration Hook helper to register the Kyro CMS Dev Toolbar widget.
 */
declare function kyroDevToolbarIntegration(options?: KyroDevToolbarOptions): {
    name: string;
    hooks: {
        'astro:config:setup': ({ addDevToolbarApp }: any) => void;
    };
};

/**
 * Edge Runtime detection utility for Kyro CMS.
 * Detects V8 Isolate runtimes (Vercel Edge, Cloudflare Workers, Deno Deploy, Netlify Edge).
 */
declare function isEdgeRuntime(): boolean;

type LogLevel = "debug" | "info" | "warn" | "error" | "none";
declare class Logger {
    private level;
    constructor();
    setLevel(level: LogLevel): void;
    getLevel(): LogLevel;
    private shouldLog;
    debug(...args: any[]): void;
    info(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
}
declare const logger: Logger;

export { AbstractBaseAdapter, AccountLockout, type AdapterOptions, AuditLog, AuditLogFilter, AuditLogger, Auth, AuthAdapter, AuthResult, Session as AuthSession, AuthTokenConfig, AuthUser, BaseAdapter, type BaseEmailOptions, CollectionConfig, type CompareVersionsOptions, ConfigValidationError, CreateArgs, type CreateStorageResult, type CreateVersionOptions, type DatabaseConnectionOptions, type DatabaseType, type DatabaseType$1 as DbAdapterType, DeleteArgs, DeliveryOptions, DeliveryResult, Dialect, type DraftPublishConfig, type DrizzleAdapterOptions, EmailTransport, type EncryptionConfig, type Environment, Field, FindArgs, FindByIDArgs, FindResult, GlobalConfig, InMemoryAccountLockout, InMemoryAuditLogger, InMemoryAuthAdapter, InMemoryRateLimiter, JWTPayload, Kyro, type KyroActionOptions, type KyroAuthConfig, type KyroAuthMiddlewareOptions, KyroConfig, type KyroDevToolbarOptions, type KyroEnvSchemaOptions, type KyroLoaderOptions, KyroPubSub, KyroWSServer, LocalAdapter, type LogLevel, Logger, LoginCredentials, MediaService, type MongoDBAdapterOptions, NeonAdapter, type NeonAdapterOptions, PasswordPolicy, type PaymentConfig, PluginManager, type PublishVersionOptions, RateLimiter, RedisAuthAdapter, RegisterData, Registry, Request$1 as Request, SQLiteAuthAdapter, type SeoTagsOptions, Session, type SocialLink, type StorageAdapter, type StorageOptions, type StoreConfig, TursoAdapter, type TursoAdapterOptions, UpdateArgs, User, UserRole, type Version, type VersionAdapter, type VersionDiff, type VersionHistoryOptions, VersionManager, type VersionPublishSchedule, type VersionStatus, WebhookConfig, WebhookDelivery, WebhookPayload, WebhookService, applyCollectionOverrides, authConfig, autoBootstrap, bootstrapAdmin, bootstrapWithRetry, buildDeliveryRecord, collectionToCreateZod, collectionToUpdateZod, collectionToWhereZod, collectionToZod, createAuditContext, createAuth, createAuthConfig, createAuthStorage, createKyro, createLocalAdapter, createLocalStorage, createNeonAdapter, createStorage, createTestPayload, createTursoAdapter, createVersionManager, defineConfig, defineKyroConfig, deliverWebhook, deliverWithRetry, fieldToZod, generateAnalyticsTags, generateKyroAstroTypes, generateSeoTags, generateWebhookSecret, getAppSecret, getBootstrapFromEnv, getDefaultDraftPublishConfig, getEmailTemplates, getEncryptionKey, getPaymentConfig, getPaymentConfigFromSettings, getSessionConfig, getSocialLinks, getSocialLinksFromSettings, getStoreConfig, getStoreConfigFromSettings, globalToZod, isArchived, isDraft, isEdgeRuntime, isPublished, kyroAction, kyroAuthMiddleware, kyroDevToolbarIntegration, kyroEnvSchema, kyroLoader, loadSecrets, logger, renderAccountLocked, renderBaseLayout, renderMagicLink, renderPasswordChanged, renderResetPassword, renderUserInvite, renderVerifyEmail, renderWelcome, setDbAdapter, signPayload, validateCollection, validateConfig, validateFields, validateGlobal };
