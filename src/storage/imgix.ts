import { createHmac } from "crypto";
import type {
  StorageProvider,
  UploadedFile,
  UploadOptions,
  ImageTransforms,
} from "./index.js";

export interface ImgixConfig {
  domain: string;
  signKey?: string;
  defaultParameters?: Record<string, string>;
}

export function createImgixStorage(config: ImgixConfig): StorageProvider {
  const signUrl = (path: string, params: URLSearchParams): string => {
    if (!config.signKey) return path;
    const signature = createHmac("sha256", config.signKey)
      .update(path + params.toString())
      .digest("hex");
    params.set("s", signature);
    return path;
  };

  return {
    name: "imgix",
    displayName: "Imgix",
    supportsDynamicResize: true,

    async upload(_file: File, _options?: UploadOptions): Promise<UploadedFile> {
      throw new Error(
        "Imgix is a transformation service. Use another provider for uploads.",
      );
    },

    async uploadFromUrl(
      url: string,
      options?: UploadOptions,
    ): Promise<UploadedFile> {
      const filename = options?.filename || url.split("/").pop() || "file";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const blob = await response.blob();
      const file = new File([blob], filename, { type: blob.type });

      return {
        id: Buffer.from(url).toString("base64").slice(0, 20),
        filename,
        originalName: filename,
        mimeType: blob.type,
        size: blob.size,
        url: this.getImageUrl(url),
        thumbnailUrl: this.getImageUrl(url, {
          width: 200,
          height: 200,
          fit: "crop",
        }),
        provider: "imgix",
        createdAt: new Date().toISOString(),
      };
    },

    async delete(_url: string): Promise<void> {
      // Imgix doesn't delete - it's a proxy/transformation service
    },

    async rename(_oldUrl: string, newKey: string): Promise<string> {
      // Imgix is a proxy service, not a storage provider
      // Return new URL derived from newKey
      return `https://${config.domain}/${newKey}`;
    },

    getImageUrl(url: string, transforms?: ImageTransforms): string {
      const parsed = new URL(url);
      const params = new URLSearchParams(parsed.search);

      // Apply default parameters
      if (config.defaultParameters) {
        Object.entries(config.defaultParameters).forEach(([key, value]) => {
          if (!params.has(key)) {
            params.set(key, value);
          }
        });
      }

      // Apply transformations
      if (transforms) {
        if (transforms.width) params.set("w", String(transforms.width));
        if (transforms.height) params.set("h", String(transforms.height));
        if (transforms.quality) params.set("q", String(transforms.quality));
        if (transforms.format) params.set("fm", transforms.format);
        if (transforms.fit) params.set("fit", transforms.fit);
        if (transforms.blur) params.set("blur", String(transforms.blur));
        if (transforms.sharpen) params.set("sharp", String(transforms.sharpen));
      }

      // Ensure secure URLs
      params.set("auto", "compress,format");

      // Sign the URL if needed
      let path = parsed.pathname + "?" + params.toString();
      if (config.signKey) {
        path = signUrl(parsed.pathname + params.toString(), params);
      }

      return `https://${config.domain}${parsed.pathname}${params.toString() ? "?" + params.toString() : ""}`;
    },

    async generateThumbnail(file: UploadedFile): Promise<string> {
      return this.getImageUrl(file.url, {
        width: 200,
        height: 200,
        fit: "crop",
      });
    },

    async list(): Promise<UploadedFile[]> {
      return [];
    },

    async exists(url: string): Promise<boolean> {
      try {
        const response = await fetch(url, { method: "HEAD" });
        return response.ok;
      } catch {
        return false;
      }
    },

    async createFolder(): Promise<void> {},
    async deleteFolder(): Promise<void> {},
  };
}
