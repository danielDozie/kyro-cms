import { C as CollectionConfig, G as GlobalConfig, j as KyroPlugin } from './types-BjivdGbU.cjs';
import { F as Field } from './types-euTszc-1.cjs';
import { ZodTypeAny } from 'zod';

interface S3CompatibleConfig {
    bucket?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    endpoint?: string;
    cdnUrl?: string;
    prefix?: string;
}
interface R2Config {
    accountId?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    bucket?: string;
    cdnUrl?: string;
    prefix?: string;
    publicDevUrl?: string;
}
interface GCSConfig {
    bucket?: string;
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
    cdnUrl?: string;
    prefix?: string;
}
interface BackblazeConfig {
    bucket?: string;
    accountId?: string;
    applicationKeyId?: string;
    applicationKey?: string;
    cdnUrl?: string;
    prefix?: string;
}
interface BunnyConfig {
    storageZone?: string;
    apiKey?: string;
    cdnUrl?: string;
    prefix?: string;
}
interface FTPConfig {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    secure?: boolean;
    baseUrl?: string;
    prefix?: string;
}
interface StorageConfig {
    type: string;
    s3: S3CompatibleConfig;
    r2: R2Config;
    gcs: GCSConfig;
    digitalocean: S3CompatibleConfig;
    backblaze: BackblazeConfig;
    wasabi: S3CompatibleConfig;
    bunny: BunnyConfig;
    ftp: FTPConfig;
    cloudinary: {
        cloudName?: string;
        apiKey?: string;
        apiSecret?: string;
        folder?: string;
    };
    imgix: {
        domain?: string;
        signKey?: string;
    };
    local: {
        uploadDir?: string;
        baseUrl?: string;
    };
}
interface EmailConfig {
    provider?: string;
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    pass?: string;
    from?: string;
    fromName?: string;
    replyTo?: string;
}
declare class ConfigService {
    private db;
    private cache;
    private loaded;
    private static readonly SENSITIVE_KEYS;
    constructor(db: any);
    /**
     * Initialize the service by loading all settings from the database
     */
    load(): Promise<void>;
    private ensureSettingsTable;
    /**
     * Load settings from the _globals_storage-settings table (SQLite fallback)
     * Maps nested global structure to flat key-value cache
     */
    private loadFromGlobals;
    /**
     * Get a settings value with environment fallback
     */
    get(key: string, envKey?: string, defaultValue?: string): string | undefined;
    /**
     * Get storage configuration
     */
    getStorageConfig(): StorageConfig;
    /**
     * Get email configuration
     */
    getEmailConfig(): EmailConfig;
    /**
     * Mask sensitive values for display
     */
    maskSensitive(key: string, value: string | undefined): string | undefined;
    /**
     * Update a setting in the database
     */
    set(key: string, value: string, description?: string): Promise<void>;
}

interface UploadOptions {
    folder?: string;
    filename?: string;
    mimeType?: string;
    metadata?: Record<string, unknown>;
}
interface UploadedFile {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    folder?: string;
    provider: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
}
interface ImageTransforms {
    width?: number;
    height?: number;
    fit?: "clip" | "crop" | "fill" | "fillmax" | "scale" | "max" | "min";
    format?: "webp" | "avif" | "jpeg" | "jpg" | "png" | "gif";
    quality?: number;
    blur?: number;
    sharpen?: number;
    /** Crop region as percentages (0-100) of the original image */
    cropX?: number;
    cropY?: number;
    cropWidth?: number;
    cropHeight?: number;
}
interface StorageProvider {
    name: string;
    displayName: string;
    supportsDynamicResize: boolean;
    upload(file: File, options?: UploadOptions): Promise<UploadedFile>;
    uploadFromUrl(url: string, options?: UploadOptions): Promise<UploadedFile>;
    delete(url: string): Promise<void>;
    rename(oldUrl: string, newKey: string): Promise<string>;
    getImageUrl(url: string, transforms?: ImageTransforms): string;
    generateThumbnail(file: UploadedFile, size: {
        width: number;
        height: number;
    }): Promise<string>;
    list(prefix?: string): Promise<UploadedFile[]>;
    exists(url: string): Promise<boolean>;
    createFolder?(folder: string): Promise<void>;
    deleteFolder?(folder: string): Promise<void>;
}

declare function resolveProvider(configService: ConfigService): Promise<StorageProvider>;

interface StorageProviderRegistration {
    type: string;
    displayName: string;
    pluginName?: string;
    configFields: Field[];
    configKey?: string;
    extractConfig: (storageConfig: StorageConfig, configKey: string) => any;
    extractRawConfig: (config: any) => any;
    factory: (config: any) => StorageProvider;
}
declare class StorageProviderRegistry {
    private providers;
    private providerToPlugin;
    private disabledPlugins;
    constructor();
    private registerLocal;
    private registerImgix;
    private registerBunny;
    private registerCloudflareR2;
    private registerCloudflareS3;
    register(registration: StorageProviderRegistration): void;
    unregister(type: string): void;
    get(type: string): StorageProviderRegistration | undefined;
    getAll(): StorageProviderRegistration[];
    getAllAvailable(isPluginEnabled?: (name: string) => boolean): StorageProviderRegistration[];
    has(type: string): boolean;
    resolve(type: string, storageConfig: StorageConfig): Promise<StorageProvider>;
    resolveWithConfig(type: string, config: any): Promise<StorageProvider>;
    getProviderPluginName(type: string): string | undefined;
    getAllPluginNames(): string[];
    setPluginEnabled(name: string, enabled: boolean): void;
    isPluginEnabled(name: string): boolean;
}

declare class Registry {
    storageProviders: StorageProviderRegistry;
    private collections;
    private globals;
    private plugins;
    private schemaCache;
    private initialized;
    addCollection(config: CollectionConfig): void;
    addCollections(configs: CollectionConfig[]): void;
    getCollection(slug: string): CollectionConfig | undefined;
    getCollections(): CollectionConfig[];
    getCollectionSlugs(): string[];
    hasCollection(slug: string): boolean;
    removeCollection(slug: string): boolean;
    addGlobal(config: GlobalConfig): void;
    /**
     * Add a global after the registry is already initialized.
     * Only for internal use (e.g. storage settings form built at startup).
     */
    addGlobalPostInit(config: GlobalConfig): void;
    private _addGlobalUnsafe;
    addGlobals(configs: GlobalConfig[]): void;
    getGlobal(slug: string): GlobalConfig | undefined;
    getGlobals(): GlobalConfig[];
    getGlobalSlugs(): string[];
    hasGlobal(slug: string): boolean;
    removeGlobal(slug: string): boolean;
    addPlugin(plugin: KyroPlugin): void;
    getPlugins(): KyroPlugin[];
    getZodSchema(slug: string): ZodTypeAny;
    getCreateZodSchema(slug: string): ZodTypeAny;
    getUpdateZodSchema(slug: string): ZodTypeAny;
    getWhereZodSchema(slug: string): ZodTypeAny;
    getFieldZodSchema(field: Field): ZodTypeAny;
    private clearSchemaCache;
    private applyFieldDefaults;
    getFields(slug: string): Field[];
    getFieldMap(slug: string): Map<string, Field>;
    getVisibleFields(slug: string): Field[];
    validate(): void;
    init(kyroInstance?: any): Promise<void>;
    isInitialized(): boolean;
    getPaginationDefaults(slug: string): {
        defaultLimit: number;
        limits: number[];
    };
    getDefaultSort(slug: string): string;
    getDefaultColumns(slug: string): string[];
    getAdminTitle(slug: string): string;
    getAdminLabel(slug: string): string;
    getAdminGroup(slug: string): string | undefined;
    getStats(): {
        collections: number;
        globals: number;
        plugins: number;
        fields: number;
    };
    toJSON(): {
        collections: CollectionConfig[];
        globals: GlobalConfig[];
    };
}
declare function getRegistry(): Registry;
declare function resetRegistry(): void;
declare function createRegistry(): Registry;

export { ConfigService as C, type EmailConfig as E, Registry as R, type StorageProvider as S, type StorageConfig as a, resolveProvider as b, createRegistry as c, getRegistry as g, resetRegistry as r };
