import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import {
  type StorageProvider,
  type UploadedFile,
  type UploadOptions,
  type ImageTransforms,
  withBaseStorage
} from "./index.js";

export type S3ProviderType =
  | "aws"
  | "r2"
  | "gcs"
  | "digitalocean"
  | "backblaze"
  | "wasabi";

/**
 * Extract the Public Dev URL ID from either a full URL or just the ID.
 * Handles formats like:
 * - https://bucket.pub-xxx.r2.dev -> pub-xxx
 * - pub-xxx -> pub-xxx
 * - empty/undefined -> ""
 */
function extractPublicDevUrlId(url?: string): string {
  if (!url) return "";
  if (url.startsWith("pub-")) return url;
  const match = url.match(/pub-[a-zA-Z0-9]+/i);
  return match ? match[0] : "";
}

export interface S3StorageConfig {
  provider: S3ProviderType;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  cdnUrl?: string;
  prefix?: string;
  accountId?: string;
  publicDevUrl?: string;
}

function getPublicUrl(key: string, config: S3StorageConfig): string {
  // Ensure key has proper path format
  const normalizedKey = key.startsWith("/") ? key.slice(1) : key;

  if (config.cdnUrl) {
    const cdn = config.cdnUrl.replace(/\/$/, "");
    return `${cdn}/${normalizedKey}`;
  }

  switch (config.provider) {
    case "r2": {
      // Handle both ID and full URL for publicDevUrl
      const pubId = extractPublicDevUrlId(config.publicDevUrl);
      if (pubId) {
        return `https://${pubId}.r2.dev/${normalizedKey}`;
      }
      return `https://${config.bucket}.${config.accountId}.r2.cloudflarestorage.com/${normalizedKey}`;
    }
    case "gcs":
      return `https://storage.googleapis.com/${config.bucket}/${normalizedKey}`;
    case "digitalocean":
      return `https://${config.bucket}.${config.region}.cdn.digitaloceanspaces.com/${normalizedKey}`;
    case "backblaze":
      return `https://${config.bucket}.s3.backblazeb2.com/${normalizedKey}`;
    case "wasabi":
      return `https://${config.bucket}.s3.wasabisys.com/${normalizedKey}`;
    case "aws":
    default:
      return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${normalizedKey}`;
  }
}

function getUrlPrefix(config: S3StorageConfig): string {
  if (config.cdnUrl) {
    return config.cdnUrl.replace(/\/$/, "") + "/";
  }

  switch (config.provider) {
    case "r2": {
      const pubId = extractPublicDevUrlId(config.publicDevUrl);
      if (pubId) {
        return `https://${pubId}.r2.dev/`;
      }
      return `https://${config.bucket}.${config.accountId}.r2.cloudflarestorage.com/`;
    }
    case "gcs":
      return `https://storage.googleapis.com/${config.bucket}/`;
    case "digitalocean":
      return `https://${config.bucket}.${config.region}.cdn.digitaloceanspaces.com/`;
    case "backblaze":
      return `https://${config.bucket}.s3.backblazeb2.com/`;
    case "wasabi":
      return `https://${config.bucket}.s3.wasabisys.com/`;
    case "aws":
    default:
      return `https://${config.bucket}.s3.${config.region}.amazonaws.com/`;
  }
}

function getDisplayName(provider: S3ProviderType): string {
  switch (provider) {
    case "r2":
      return "Cloudflare R2";
    case "gcs":
      return "Google Cloud Storage";
    case "digitalocean":
      return "DigitalOcean Spaces";
    case "backblaze":
      return "Backblaze B2";
    case "wasabi":
      return "Wasabi";
    case "aws":
    default:
      return "AWS S3";
  }
}

export function createS3Storage(config: S3StorageConfig): StorageProvider {


  // For R2 and other S3-compatible providers, use custom HTTP client with proper TLS
  const client = new S3Client({
    region: config.region || "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
    tls: true,
    // R2 requires specific SSL configuration
    ...(config.provider === "r2" && {
      requestHandler: new NodeHttpHandler(),
    }),
  });

  const getKey = (path: string) => {
    const prefix = config.prefix ? `${config.prefix}/` : "";
    return `${prefix}${path}`.replace(/\/+/g, "/");
  };

  const getUrl = (key: string) => getPublicUrl(key, config);

  return withBaseStorage({
    name: config.provider,
    displayName: getDisplayName(config.provider),
    supportsDynamicResize: true,

    async upload(file: File, options?: UploadOptions): Promise<UploadedFile> {
      const key = getKey(
        `${options?.folder ? `${options.folder}/` : ""}${options?.filename || file.name}`,
      );

      const buffer = Buffer.from(await file.arrayBuffer());

      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: buffer,
          ContentType: file.type,
          Metadata: options?.metadata as Record<string, string>,
        }),
      );

      const head = await client.send(
        new HeadObjectCommand({
          Bucket: config.bucket,
          Key: key,
        }),
      );

      return {
        id: Buffer.from(key).toString("base64url"),
        filename: options?.filename || file.name,
        originalName: file.name,
        mimeType: file.type,
        size: buffer.length,
        url: getUrl(key),
        thumbnailUrl: file.type.startsWith("image/") ? getUrl(key) : undefined,
        folder: options?.folder,
        provider: config.provider,
        metadata: {
          ...options?.metadata,
          etag: head.ETag,
        },
        createdAt: new Date().toISOString(),
      };
    },

    async delete(url: string): Promise<void> {
      const key = url.replace(getUrlPrefix(config), "");
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: key,
        }),
      );
    },

    async rename(oldUrl: string, newKey: string): Promise<string> {
      const oldKey = oldUrl.replace(getUrlPrefix(config), "");
      const newKeyWithPrefix = config.prefix
        ? `${config.prefix}/${newKey}`
        : newKey;

      await client.send(
        new CopyObjectCommand({
          Bucket: config.bucket,
          CopySource: `${config.bucket}/${oldKey}`,
          Key: newKeyWithPrefix,
        }),
      );

      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: oldKey,
        }),
      );

      return getUrl(newKeyWithPrefix);
    },

    async list(prefix?: string): Promise<UploadedFile[]> {
      const key = getKey(prefix || "");
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: config.bucket,
          Prefix: key,
        }),
      );

      return (response.Contents || []).map((item) => ({
        id: Buffer.from(item.Key || "").toString("base64url"),
        filename: item.Key?.split("/").pop() || "",
        originalName: item.Key?.split("/").pop() || "",
        mimeType: "application/octet-stream",
        size: item.Size || 0,
        url: getUrl(item.Key || ""),
        provider: config.provider,
        createdAt: item.LastModified?.toISOString() || new Date().toISOString(),
      }));
    },

    async exists(url: string): Promise<boolean> {
      try {
        const key = url.replace(getUrlPrefix(config), "");
        await client.send(
          new HeadObjectCommand({
            Bucket: config.bucket,
            Key: key,
          }),
        );
        return true;
      } catch {
        return false;
      }
    },

    async createFolder(folder: string): Promise<void> {
      const key = getKey(`${folder}/`);
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: "",
        }),
      );
    },

    async deleteFolder(folder: string): Promise<void> {
      const prefix = getKey(`${folder}/`);
      let continuationToken: string | undefined;
      do {
        const listResponse = await client.send(
          new ListObjectsV2Command({
            Bucket: config.bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          }),
        );
        if (listResponse.Contents?.length) {
          const objects = listResponse.Contents.map((item) => ({
            Key: item.Key,
          }));
          await client.send(
            new DeleteObjectsCommand({
              Bucket: config.bucket,
              Delete: { Objects: objects },
            }),
          );
        }
        continuationToken = listResponse.IsTruncated
          ? listResponse.NextContinuationToken
          : undefined;
      } while (continuationToken);
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: prefix,
        }),
      );
    },
  });
}
