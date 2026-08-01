import type { GlobalConfig } from "../../registry/types.js";
import type { Field } from "../../fields/types.js";
import type { DeclarativeCondition } from "../../fields/types.js";
import type { StorageProviderRegistry } from "../../storage/registry.js";

// ============================================================================
// Built-in Provider Field Definitions
// ============================================================================
// These are defined statically so they are available at build time
// (for admin config serialization) without requiring a runtime registry.

const localFields: Field[] = [
  { name: "uploadDir", type: "text", label: "Upload Directory", defaultValue: "./public/uploads" },
  { name: "baseUrl", type: "text", label: "Base URL", defaultValue: "/uploads" },
];

const awsFields: Field[] = [
  { name: "bucket", type: "text", label: "Bucket Name", required: true },
  { name: "region", type: "text", label: "Region", defaultValue: "us-east-1", admin: { placeholder: "us-east-1" } },
  { name: "accessKeyId", type: "text", label: "Access Key ID", required: true },
  { name: "secretAccessKey", type: "password", label: "Secret Access Key", required: true },
  { name: "endpoint", type: "text", label: "Endpoint URL", admin: { placeholder: "https://s3.custom.com" } },
  { name: "cdnUrl", type: "text", label: "CDN URL", admin: { placeholder: "https://cdn.example.com" } },
  { name: "prefix", type: "text", label: "Path Prefix", admin: { placeholder: "uploads" } },
];

const r2Fields: Field[] = [
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
];

const cloudinaryFields: Field[] = [
  { name: "cloudName", type: "text", label: "Cloud Name", required: true },
  { name: "apiKey", type: "text", label: "API Key", required: true },
  { name: "apiSecret", type: "password", label: "API Secret", required: true },
  { name: "folder", type: "text", label: "Folder", admin: { placeholder: "Optional folder path" } },
  {
    name: "uploadPreset", type: "text", label: "Upload Preset (optional)",
    admin: { placeholder: "Leave empty for signed uploads", description: "If not set, uploads will be signed with API Secret" },
  },
];

const ftpFields: Field[] = [
  { name: "host", type: "text", label: "Host", required: true, admin: { placeholder: "ftp.example.com" } },
  { name: "port", type: "number", label: "Port", defaultValue: 21, admin: { placeholder: "21 for FTP" } },
  { name: "user", type: "text", label: "Username", required: true },
  { name: "password", type: "password", label: "Password", required: true },
  { name: "secure", type: "checkbox", label: "Use TLS/SSL", defaultValue: false, admin: { description: "Enable TLS/SSL for secure connections (FTP only)" } },
  { name: "baseUrl", type: "text", label: "Base URL", required: true, admin: { placeholder: "https://files.example.com" } },
  { name: "prefix", type: "text", label: "Path Prefix", admin: { placeholder: "uploads" } },
];

// All built-in providers and their config field groups
interface ProviderDef {
  type: string;
  displayName: string;
  configFields: Field[];
}

const cloudflareR2Fields: Field[] = [
  {
    name: "note",
    type: "text",
    label: "Storage Status",
    defaultValue: "Cloudflare R2 Native Binding ('STORAGE_BUCKET') active.",
    admin: { readOnly: true }
  }
];

const builtInProviders: ProviderDef[] = [
  { type: "local", displayName: "Local Server", configFields: localFields },
  { type: "cloudflare_r2", displayName: "Cloudflare Native Assets (R2 Binding)", configFields: cloudflareR2Fields },
  { type: "aws", displayName: "S3 Compatible (AWS, Backblaze, Wasabi, etc.)", configFields: awsFields },
  { type: "r2", displayName: "Cloudflare R2 (S3 API)", configFields: r2Fields },
  { type: "cloudinary", displayName: "Cloudinary", configFields: cloudinaryFields },
  { type: "ftp", displayName: "FTP", configFields: ftpFields },
];

// ============================================================================
// Static Storage Settings Global
// ============================================================================
// This global is included in allGlobalSettings so it's available at build time.
// It uses DeclarativeCondition instead of function conditions so the
// conditions survive JSON serialization in the admin config.

const providerOptions = builtInProviders.map((p) => ({
  label: p.displayName,
  value: p.type,
}));

const providerGroups: Field[] = builtInProviders.map((p) => ({
  name: p.type,
  type: "group" as const,
  label: `${p.displayName} Settings`,
  admin: { condition: { field: "provider", equals: p.type } as DeclarativeCondition },
  fields: p.configFields,
}));

export const storageSettingsGlobal: GlobalConfig = {
  slug: "storage-settings",
  label: "Storage Settings",
  admin: { group: "settings" },
  access: { read: () => true, update: () => true },
  fields: [
    {
      name: "provider",
      type: "select",
      label: "Storage Provider",
      defaultValue: "local",
      options: providerOptions,
    },
    ...providerGroups,
    {
      name: "limits",
      type: "group",
      label: "Upload Limits",
      fields: [
        {
          name: "maxFileSize",
          type: "number",
          label: "Max File Size (bytes)",
          defaultValue: 10485760,
        },
        {
          name: "allowedTypes",
          type: "json",
          label: "Allowed MIME Types",
          defaultValue: ["image/*", "video/*", "audio/*", "application/pdf"],
        },
        {
          name: "maxFilesPerUpload",
          type: "number",
          label: "Max Files per Upload",
          defaultValue: 10,
        },
      ],
    },
  ],
};


