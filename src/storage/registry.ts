import type { Field } from "../fields/types.js";
import type { StorageProvider } from "./index.js";
import type { StorageConfig } from "../config/ConfigService.js";
import { createLocalStorage } from "./local.js";
import { createImgixStorage } from "./imgix.js";
import { createBunnyStorage } from "./bunny.js";
import { createCloudflareR2Storage } from "./cloudflare-r2.js";
import path from "path";

export interface StorageProviderRegistration {
  type: string;
  displayName: string;
  pluginName?: string;
  configFields: Field[];
  configKey?: string;
  extractConfig: (storageConfig: StorageConfig, configKey: string) => any;
  extractRawConfig: (config: any) => any;
  factory: (config: any) => StorageProvider;
}

export class StorageProviderRegistry {
  private providers = new Map<string, StorageProviderRegistration>();
  private providerToPlugin = new Map<string, string>();
  private disabledPlugins = new Set<string>();

  constructor() {
    this.registerLocal();
    this.registerImgix();
    this.registerBunny();
    this.registerCloudflareR2();
    // Backwards compatibility for legacy S3-compatible Cloudflare storage settings
    this.registerCloudflareS3();
  }

  private registerLocal(): void {
    this.register({
      type: "local",
      displayName: "Local Server",
      configKey: "local",
      configFields: [
        {
          name: "uploadDir",
          type: "text",
          label: "Upload Directory",
          defaultValue: "./public/uploads",
        },
        {
          name: "baseUrl",
          type: "text",
          label: "Base URL",
          defaultValue: "/uploads",
        },
      ],
      extractConfig: (sc, key) => (sc as any)[key] || {},
      extractRawConfig: (c) => {
        const localConfig = c?.local || c;
        const savedUploadDir = (localConfig?.uploadDir || "").trim();
        let uploadDir: string;
        if (savedUploadDir) {
          if (path.isAbsolute(savedUploadDir)) {
            uploadDir = savedUploadDir;
          } else if (
            savedUploadDir.includes("/") ||
            savedUploadDir.includes("\\")
          ) {
            uploadDir = path.resolve(process.cwd(), savedUploadDir);
          } else {
            uploadDir = path.join(process.cwd(), "public", savedUploadDir);
          }
        } else {
          uploadDir = path.join(process.cwd(), "public", "uploads");
        }
        const savedBaseUrl = (localConfig?.baseUrl || "").trim();
        let baseUrl: string;
        if (savedBaseUrl) {
          baseUrl = savedBaseUrl.startsWith("/")
            ? savedBaseUrl
            : `/${savedBaseUrl}`;
        } else {
          baseUrl = "/uploads";
        }
        return { uploadDir, baseUrl };
      },
      factory: (c) => createLocalStorage(c),
    });
  }

  private registerImgix(): void {
    this.register({
      type: "imgix",
      displayName: "Imgix",
      configKey: "imgix",
      configFields: [
        { name: "domain", type: "text", label: "Domain", required: true },
        { name: "signKey", type: "password", label: "Sign Key" },
      ],
      extractConfig: (sc, key) => (sc as any)[key] || {},
      extractRawConfig: (c) => c?.imgix || c,
      factory: (c) => createImgixStorage(c),
    });
  }

  private registerBunny(): void {
    this.register({
      type: "bunny",
      displayName: "Bunny.net",
      configKey: "bunny",
      configFields: [
        {
          name: "storageZone",
          type: "text",
          label: "Storage Zone",
          required: true,
        },
        { name: "apiKey", type: "password", label: "API Key", required: true },
        { name: "cdnUrl", type: "text", label: "CDN URL" },
        { name: "prefix", type: "text", label: "Path Prefix" },
      ],
      extractConfig: (sc, key) => (sc as any)[key] || {},
      extractRawConfig: (c) => c?.bunny || c,
      factory: (c) => createBunnyStorage(c),
    });
  }

  private registerCloudflareR2(): void {
    this.register({
      type: "cloudflare_r2",
      displayName: "Cloudflare R2 (Native)",
      configKey: "cloudflareR2",
      configFields: [], // No UI config fields needed, it's automatic
      extractConfig: () => ({}),
      extractRawConfig: () => ({}),
      factory: () => createCloudflareR2Storage(),
    });
  }

  // Deprecated alias for legacy S3-compatible config (maps to native R2)
  private registerCloudflareS3(): void {
    this.register({
      type: "cloudflare_s3",
      displayName: "Cloudflare R2 (S3 Compat)",
      configKey: "cloudflareR2",
      configFields: [], // No UI config fields needed, using same R2 binding
      // Emit a console warning when used to inform about deprecation
      extractConfig: () => {
        console.warn('[StorageRegistry] "cloudflare_s3" is deprecated; use "cloudflare_r2" instead.');
        return {};
      },
      extractRawConfig: () => ({}),
      factory: () => createCloudflareR2Storage(),
    });
  }

  register(registration: StorageProviderRegistration): void {
    if (this.providers.has(registration.type)) {
      console.warn(
        `[StorageRegistry] Provider "${registration.type}" already registered, skipping`,
      );
      return;
    }
    if (registration.pluginName) {
      this.providerToPlugin.set(registration.type, registration.pluginName);
    }
    this.providers.set(registration.type, registration);
  }

  unregister(type: string): void {
    this.providers.delete(type);
    this.providerToPlugin.delete(type);
  }

  get(type: string): StorageProviderRegistration | undefined {
    return this.providers.get(type);
  }

  getAll(): StorageProviderRegistration[] {
    return Array.from(this.providers.values());
  }

  getAllAvailable(isPluginEnabled?: (name: string) => boolean): StorageProviderRegistration[] {
    const all = this.getAll();
    if (!isPluginEnabled) return all;
    return all.filter((p) => {
      if (!p.pluginName) return true;
      return isPluginEnabled(p.pluginName);
    });
  }

  has(type: string): boolean {
    return this.providers.has(type);
  }

  async resolve(
    type: string,
    storageConfig: StorageConfig,
  ): Promise<StorageProvider> {
    const reg = this.providers.get(type);
    if (!reg) {
      throw new Error(
        `Unknown storage provider type: "${type}". Is the plugin that provides it enabled?`,
      );
    }
    if (reg.pluginName && this.disabledPlugins.has(reg.pluginName)) {
      throw new Error(
        `Storage provider "${type}" is not available (plugin "${reg.pluginName}" is disabled)`,
      );
    }
    const configKey = reg.configKey || type;
    const config = reg.extractConfig(storageConfig, configKey);
    return reg.factory(config);
  }

  async resolveWithConfig(type: string, config: any): Promise<StorageProvider> {
    const reg = this.providers.get(type);
    if (!reg) {
      throw new Error(
        `Unknown storage provider type: "${type}". Is the plugin that provides it enabled?`,
      );
    }
    if (reg.pluginName && this.disabledPlugins.has(reg.pluginName)) {
      throw new Error(
        `Storage provider "${type}" is not available (plugin "${reg.pluginName}" is disabled)`,
      );
    }
    const providerConfig = reg.extractRawConfig(config);
    return reg.factory(providerConfig);
  }

  getProviderPluginName(type: string): string | undefined {
    return this.providerToPlugin.get(type);
  }

  getAllPluginNames(): string[] {
    return Array.from(new Set(this.providerToPlugin.values()));
  }

  setPluginEnabled(name: string, enabled: boolean): void {
    if (enabled) {
      this.disabledPlugins.delete(name);
    } else {
      this.disabledPlugins.add(name);
    }
  }

  isPluginEnabled(name: string): boolean {
    return !this.disabledPlugins.has(name);
  }
}

let instance: StorageProviderRegistry | null = null;

export function getDefaultRegistry(): StorageProviderRegistry {
  if (!instance) {
    instance = new StorageProviderRegistry();
  }
  return instance;
}

export function resetStorageProviderRegistry(): void {
  instance = null;
}
