import {
  type StorageProvider,
  type UploadedFile,
  type UploadOptions,
  withBaseStorage,
} from "./index.js";

export function createCloudflareR2Storage(): StorageProvider {
  const getBucket = () => {
    const bucket = (globalThis as any).STORAGE_BUCKET;
    if (!bucket) {
      throw new Error(
        "Cloudflare R2 native binding 'STORAGE_BUCKET' not found in global scope."
      );
    }
    return bucket;
  };

  const getUrl = (key: string) => `/api/media/file/${key}`;

  const getKey = (path: string) =>
    path.replace(/\/+/g, "/").replace(/^\/+/, "");

  return withBaseStorage({
    name: "cloudflare_r2",
    displayName: "Cloudflare R2 (Native)",
    supportsDynamicResize: true,

    async upload(file: File, options?: UploadOptions): Promise<UploadedFile> {
      const bucket = getBucket();
      const key = getKey(
        `${options?.folder ? `${options.folder}/` : ""}${options?.filename || file.name}`
      );
      const buffer = await file.arrayBuffer();

      const object = await bucket.put(key, buffer, {
        httpMetadata: { contentType: file.type },
        customMetadata: (options?.metadata as Record<string, string>) || {},
      });

      return {
        id: Buffer.from(key).toString("base64url"),
        filename: options?.filename || file.name,
        originalName: file.name,
        mimeType: file.type,
        size: object.size,
        url: getUrl(key),
        thumbnailUrl: file.type.startsWith("image/") ? getUrl(key) : undefined,
        folder: options?.folder,
        provider: "cloudflare_r2",
        metadata: {
          ...options?.metadata,
          etag: object.etag,
        },
        createdAt: new Date().toISOString(),
      };
    },

    async delete(url: string): Promise<void> {
      const bucket = getBucket();
      // Extract key from /api/media/file/key
      const key = url.replace(/^\/api\/media\/file\//, "");
      await bucket.delete(key);
    },

    async rename(oldUrl: string, newKey: string): Promise<string> {
      const bucket = getBucket();
      const oldKey = oldUrl.replace(/^\/api\/media\/file\//, "");
      const newKeyNormalized = getKey(newKey);

      const obj = await bucket.get(oldKey);
      if (!obj) throw new Error("File not found");

      await bucket.put(newKeyNormalized, obj.body, {
        httpMetadata: obj.httpMetadata,
        customMetadata: obj.customMetadata,
      });
      await bucket.delete(oldKey);

      return getUrl(newKeyNormalized);
    },

    async list(prefix?: string): Promise<UploadedFile[]> {
      const bucket = getBucket();
      const key = getKey(prefix || "");
      const response = await bucket.list({ prefix: key });

      return response.objects.map((item: any) => ({
        id: Buffer.from(item.key).toString("base64url"),
        filename: item.key.split("/").pop() || "",
        originalName: item.key.split("/").pop() || "",
        mimeType: item.httpMetadata?.contentType || "application/octet-stream",
        size: item.size,
        url: getUrl(item.key),
        provider: "cloudflare_r2",
        createdAt: item.uploaded.toISOString(),
      }));
    },

    async exists(url: string): Promise<boolean> {
      try {
        const bucket = getBucket();
        const key = url.replace(/^\/api\/media\/file\//, "");
        const head = await bucket.head(key);
        return head !== null;
      } catch {
        return false;
      }
    },
  });
}
