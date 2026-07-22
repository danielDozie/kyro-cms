
import type { Field } from "../fields/types.js";
import type { Registry } from "../registry/index.js";
import type { StorageConfig } from "../config/ConfigService.js";
import { createS3Storage } from "../storage/s3.js";

type S3Variant =
  | "aws"
  | "r2"
  | "gcs"
  | "digitalocean"
  | "backblaze"
  | "wasabi";

interface VariantDef {
  type: S3Variant;
  configKey: string;
  displayName: string;
  configFields: Field[];
}

const s3Variants: Record<S3Variant, VariantDef> = {
  aws: {
    type: "aws",
    configKey: "s3",
    displayName: "S3 Compatible (AWS, Backblaze, Wasabi, etc.)",
    configFields: [
      { name: "bucket", type: "text", label: "Bucket Name", required: true },
      { name: "region", type: "text", label: "Region", defaultValue: "us-east-1", admin: { placeholder: "us-east-1" } },
      { name: "accessKeyId", type: "text", label: "Access Key ID", required: true },
      { name: "secretAccessKey", type: "password", label: "Secret Access Key", required: true },
      { name: "endpoint", type: "text", label: "Endpoint URL", admin: { placeholder: "https://s3.custom.com" } },
      { name: "cdnUrl", type: "text", label: "CDN URL", admin: { placeholder: "https://cdn.example.com" } },
      { name: "prefix", type: "text", label: "Path Prefix", admin: { placeholder: "uploads" } },
    ],
  },
  r2: {
    type: "r2",
    configKey: "r2",
    displayName: "Cloudflare R2",
    configFields: [
      { name: "accountId", type: "text", label: "Account ID", required: true, admin: { placeholder: "Your Cloudflare Account ID" } },
      { name: "accessKeyId", type: "text", label: "Access Key ID", required: true },
      { name: "secretAccessKey", type: "password", label: "Secret Access Key", required: true },
      { name: "bucket", type: "text", label: "Bucket Name", required: true },
      {
        name: "publicDevUrl", type: "text", label: "Public Dev URL ID",
        admin: {
          placeholder: "pub-xxxxxxxxxxxxxxxx",
          description: "Enter ONLY the ID (e.g., pub-b8d8c4cc8bcf4d868ddd95efc1b305aa). Do NOT include https:// or the full URL. Found in R2 Dashboard → Public Dev URL.",
        },
      },
      { name: "cdnUrl", type: "text", label: "Custom CDN URL", admin: { placeholder: "https://assets.example.com (optional)" } },
      { name: "prefix", type: "text", label: "Path Prefix", admin: { placeholder: "uploads (optional)", description: "Optional prefix for all object keys. Do not use '/' as prefix." } },
    ],
  },
  gcs: {
    type: "gcs",
    configKey: "gcs",
    displayName: "Google Cloud Storage",
    configFields: [
      { name: "bucket", type: "text", label: "Bucket Name", required: true },
      { name: "projectId", type: "text", label: "Project ID" },
      { name: "clientEmail", type: "text", label: "Client Email" },
      { name: "privateKey", type: "password", label: "Private Key" },
      { name: "cdnUrl", type: "text", label: "CDN URL" },
      { name: "prefix", type: "text", label: "Path Prefix" },
    ],
  },
  digitalocean: {
    type: "digitalocean",
    configKey: "digitalocean",
    displayName: "DigitalOcean Spaces",
    configFields: [
      { name: "bucket", type: "text", label: "Bucket Name", required: true },
      { name: "region", type: "text", label: "Region", defaultValue: "nyc3" },
      { name: "accessKeyId", type: "text", label: "Access Key ID", required: true },
      { name: "secretAccessKey", type: "password", label: "Secret Access Key", required: true },
      { name: "cdnUrl", type: "text", label: "CDN URL" },
      { name: "prefix", type: "text", label: "Path Prefix" },
    ],
  },
  backblaze: {
    type: "backblaze",
    configKey: "backblaze",
    displayName: "Backblaze B2",
    configFields: [
      { name: "bucket", type: "text", label: "Bucket Name", required: true },
      { name: "accountId", type: "text", label: "Account ID" },
      { name: "applicationKeyId", type: "text", label: "Application Key ID", required: true },
      { name: "applicationKey", type: "password", label: "Application Key", required: true },
      { name: "cdnUrl", type: "text", label: "CDN URL" },
      { name: "prefix", type: "text", label: "Path Prefix" },
    ],
  },
  wasabi: {
    type: "wasabi",
    configKey: "wasabi",
    displayName: "Wasabi",
    configFields: [
      { name: "bucket", type: "text", label: "Bucket Name", required: true },
      { name: "region", type: "text", label: "Region", defaultValue: "us-east-1" },
      { name: "accessKeyId", type: "text", label: "Access Key ID", required: true },
      { name: "secretAccessKey", type: "password", label: "Secret Access Key", required: true },
      { name: "cdnUrl", type: "text", label: "CDN URL" },
      { name: "prefix", type: "text", label: "Path Prefix" },
    ],
  },
};

function getEndpoint(type: S3Variant, config: any): string | undefined {
  switch (type) {
    case "r2":
      return config?.endpoint || `https://${config?.accountId || ""}.r2.cloudflarestorage.com`;
    case "digitalocean":
      return config?.endpoint || `https://${config?.region || "nyc3"}.digitaloceanspaces.com`;
    case "backblaze":
      return config?.endpoint || `https://s3.backblazeb2.com`;
    case "wasabi":
      return config?.endpoint || `https://s3.${config?.region || "us-east-1"}.wasabisys.com`;
    default:
      return config?.endpoint;
  }
}

function buildS3Config(type: S3Variant, c: any): any {
  return {
    provider: type,
    bucket: c?.bucket || "",
    region: c?.region || "us-east-1",
    accessKeyId: c?.accessKeyId || c?.clientEmail || c?.applicationKeyId || "",
    secretAccessKey: c?.secretAccessKey || c?.privateKey || c?.applicationKey || "",
    endpoint: getEndpoint(type, c),
    cdnUrl: c?.cdnUrl,
    prefix: c?.prefix,
    accountId: c?.accountId,
    publicDevUrl: c?.publicDevUrl,
  };
}

function buildS3ConfigFromStorageConfig(type: S3Variant, def: VariantDef, sc: StorageConfig): any {
  const c = (sc as any)[def.configKey] || {};
  return buildS3Config(type, c);
}

function buildS3ConfigFromRaw(type: S3Variant, def: VariantDef, raw: any): any {
  const c = raw?.[def.configKey] || raw;
  return buildS3Config(type, c);
}

import { KyroPlugin } from "./index.js";

export class S3StoragePlugin extends KyroPlugin {
  constructor() {
    super("@kyro-cms/storage-s3");
    this.version = "1.0.0";
    this.description = "S3-compatible storage (AWS R2 GCS DigitalOcean Backblaze Wasabi)";
  }

  async init(kyro: any) {
    const registry = kyro.registry?.storageProviders as import("../storage/registry.js").StorageProviderRegistry;
    if (!registry) return;

    const pluginName = this.name;

    for (const v of Object.values(s3Variants)) {
      registry.register({
        type: v.type,
        displayName: v.displayName,
        pluginName,
        configKey: v.configKey,
        configFields: v.configFields,
        extractConfig: (sc: any) => buildS3ConfigFromStorageConfig(v.type, v, sc),
        extractRawConfig: (raw: any) => buildS3ConfigFromRaw(v.type, v, raw),
        factory: (c: any) => createS3Storage(c),
      });
    }
  }
}

export const s3StoragePlugin = new S3StoragePlugin();
