// ============================================================================
// Storage Provider Interface
// ============================================================================

export interface UploadOptions {
  folder?: string;
  filename?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

export interface UploadedFile {
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

export interface ImageTransforms {
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

export interface StorageProvider {
  name: string;
  displayName: string;
  supportsDynamicResize: boolean;

  upload(file: File, options?: UploadOptions): Promise<UploadedFile>;
  uploadFromUrl(url: string, options?: UploadOptions): Promise<UploadedFile>;
  delete(url: string): Promise<void>;
  rename(oldUrl: string, newKey: string): Promise<string>;

  getImageUrl(url: string, transforms?: ImageTransforms): string;
  generateThumbnail(
    file: UploadedFile,
    size: { width: number; height: number },
  ): Promise<string>;

  list(prefix?: string): Promise<UploadedFile[]>;
  exists(url: string): Promise<boolean>;
  createFolder?(folder: string): Promise<void>;
  deleteFolder?(folder: string): Promise<void>;
}

import type { ConfigService } from "../config/ConfigService.js";
import path from "path";
import { createLocalStorage } from "./local.js";
import { createS3Storage, type S3ProviderType } from "./s3.js";
import { createCloudinaryStorage } from "./cloudinary.js";
import { createImgixStorage } from "./imgix.js";
import { createBunnyStorage } from "./bunny.js";
import { createFtpStorage } from "./ftp.js";
import { getDefaultRegistry } from "./registry.js";

export async function resolveProvider(
  configService: ConfigService,
): Promise<StorageProvider> {
  const config = configService.getStorageConfig();
  const registry = getDefaultRegistry();

  try {
    return await registry.resolve(config.type, config);
  } catch (err: any) {
    console.warn(
      `[resolveProvider] ${err.message} — falling back to local storage`,
    );
    return createLocalStorage({
      uploadDir: path.join(process.cwd(), "public", "uploads"),
      baseUrl: "/uploads",
    });
  }
}

// ============================================================================
// Base Adapter
// ============================================================================

export function withBaseStorage<T extends Partial<StorageProvider>>(provider: T): StorageProvider {
  return {
    async uploadFromUrl(this: StorageProvider, url: string, options?: UploadOptions): Promise<UploadedFile> {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const blob = await response.blob();
      const filename = url.split("/").pop() || "file";
      const file = new File([blob], filename, { type: blob.type });
      return this.upload(file, options);
    },

    getImageUrl(this: StorageProvider, url: string, transforms?: ImageTransforms): string {
      if (!transforms || Object.keys(transforms).length === 0) return url;

      const params = new URLSearchParams({ url });
      if (transforms.width) params.set("w", String(transforms.width));
      if (transforms.height) params.set("h", String(transforms.height));
      if (transforms.quality) params.set("q", String(transforms.quality));
      if (transforms.format) params.set("f", transforms.format);
      if (transforms.cropWidth && transforms.cropHeight) {
        params.set("cx", String(transforms.cropX ?? 0));
        params.set("cy", String(transforms.cropY ?? 0));
        params.set("cw", String(transforms.cropWidth));
        params.set("ch", String(transforms.cropHeight));
      }

      return `/api/media/resize?${params.toString()}`;
    },

    async generateThumbnail(this: StorageProvider, file: UploadedFile): Promise<string> {
      return this.getImageUrl(file.url, { width: 400, height: 400 });
    },
    
    ...provider,
  } as StorageProvider;
}

export async function resolveProviderWithConfig(
  config: any,
): Promise<StorageProvider> {
  if (!config) {
    console.warn("[resolveProviderWithConfig] No config, using local");
    return createLocalStorage({
      uploadDir: path.join(process.cwd(), "public", "uploads"),
      baseUrl: "/uploads",
    });
  }

  const type = config.type || "local";
  const registry = getDefaultRegistry();

  try {
    return await registry.resolveWithConfig(type, config);
  } catch (err: any) {
    console.warn(
      `[resolveProviderWithConfig] ${err.message} — falling back to local storage`,
    );
    return createLocalStorage({
      uploadDir: path.join(process.cwd(), "public", "uploads"),
      baseUrl: "/uploads",
    });
  }
}

// Storage Provider Exports
export { createLocalStorage, type LocalStorageConfig } from "./local.js";
export {
  createS3Storage,
  type S3StorageConfig,
  type S3ProviderType,
} from "./s3.js";
export {
  createCloudinaryStorage,
  type CloudinaryConfig,
} from "./cloudinary.js";
export { createImgixStorage, type ImgixConfig } from "./imgix.js";
export { createBunnyStorage, type BunnyStorageConfig } from "./bunny.js";
export { createFtpStorage, type FtpStorageConfig } from "./ftp.js";
