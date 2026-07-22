import {
  type StorageProvider,
  type UploadedFile,
  type UploadOptions,
  type ImageTransforms,
  withBaseStorage
} from "./index.js";

export interface BunnyStorageConfig {
  storageZone: string;
  apiKey: string;
  cdnUrl?: string;
  prefix?: string;
}

function getUrl(key: string, config: BunnyStorageConfig): string {
  if (config.cdnUrl) {
    return `${config.cdnUrl.replace(/\/$/, "")}/${key}`;
  }
  return `https://${config.storageZone}.b-cdn.net/${key}`;
}

function getUrlPrefix(config: BunnyStorageConfig): string {
  if (config.cdnUrl) {
    return config.cdnUrl.replace(/\/$/, "") + "/";
  }
  return `https://${config.storageZone}.b-cdn.net/`;
}

export function createBunnyStorage(
  config: BunnyStorageConfig,
): StorageProvider {
  const baseUrl = `https://storage.bunnycdn.com/${config.storageZone}`;

  const getKey = (path: string) => {
    const prefix = config.prefix ? `${config.prefix}/` : "";
    return `${prefix}${path}`.replace(/\/+/g, "/");
  };

  return withBaseStorage({
    name: "bunny",
    displayName: "Bunny.net Storage",
    supportsDynamicResize: true,

    async upload(file: File, options?: UploadOptions): Promise<UploadedFile> {
      const key = getKey(
        `${options?.folder ? `${options.folder}/` : ""}${options?.filename || file.name}`,
      );

      const buffer = Buffer.from(await file.arrayBuffer());

      const response = await fetch(`${baseUrl}/${key}`, {
        method: "PUT",
        headers: {
          AccessKey: config.apiKey,
          "Content-Type": file.type,
        },
        body: buffer,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Bunny.net upload failed: ${response.status} ${errorText}`,
        );
      }

      return {
        id: Buffer.from(key).toString("base64url"),
        filename: options?.filename || file.name,
        originalName: file.name,
        mimeType: file.type,
        size: buffer.length,
        url: getUrl(key, config),
        thumbnailUrl: file.type.startsWith("image/")
          ? getUrl(key, config)
          : undefined,
        folder: options?.folder,
        provider: "bunny",
        metadata: options?.metadata,
        createdAt: new Date().toISOString(),
      };
    },



    async delete(url: string): Promise<void> {
      const key = url.replace(getUrlPrefix(config), "");

      const response = await fetch(`${baseUrl}/${key}`, {
        method: "DELETE",
        headers: {
          AccessKey: config.apiKey,
        },
      });

      if (!response.ok && response.status !== 404) {
        const errorText = await response.text();
        throw new Error(
          `Bunny.net delete failed: ${response.status} ${errorText}`,
        );
      }
    },

    async rename(oldUrl: string, newKey: string): Promise<string> {
      const oldKey = oldUrl.replace(getUrlPrefix(config), "");
      const fullPath = config.prefix ? `${config.prefix}/${newKey}` : newKey;

      const response = await fetch(`${baseUrl}/${oldKey}`, {
        method: "GET",
        headers: {
          AccessKey: config.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Bunny.net rename failed: could not read old file`);
      }

      const content = await response.arrayBuffer();

      await fetch(`${baseUrl}/${fullPath}`, {
        method: "PUT",
        headers: {
          AccessKey: config.apiKey,
          "Content-Type":
            response.headers.get("Content-Type") || "application/octet-stream",
        },
        body: content,
      });

      await this.delete(oldUrl);

      return getUrl(fullPath, config);
    },



    async list(prefix?: string): Promise<UploadedFile[]> {
      const key = getKey(prefix || "");

      const response = await fetch(`${baseUrl}/${key}`, {
        method: "GET",
        headers: {
          AccessKey: config.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Bunny.net list failed: ${response.status} ${errorText}`,
        );
      }

      const items = (await response.json()) as Array<{
        ObjectName?: string;
        Length?: number;
        LastChanged?: string;
      }>;

      return items.map((item) => ({
        id: Buffer.from(item.ObjectName || "").toString("base64url"),
        filename: item.ObjectName?.split("/").pop() || "",
        originalName: item.ObjectName?.split("/").pop() || "",
        mimeType: "application/octet-stream",
        size: item.Length || 0,
        url: getUrl(item.ObjectName || "", config),
        provider: "bunny",
        createdAt: item.LastChanged || new Date().toISOString(),
      }));
    },

    async exists(url: string): Promise<boolean> {
      const key = url.replace(getUrlPrefix(config), "");

      const response = await fetch(`${baseUrl}/${key}`, {
        method: "HEAD",
        headers: {
          AccessKey: config.apiKey,
        },
      });

      return response.ok;
    },

    async createFolder(folder: string): Promise<void> {
      const key = getKey(`${folder}/`);
      await fetch(`${baseUrl}/${key}`, {
        method: "PUT",
        headers: {
          AccessKey: config.apiKey,
          "Content-Length": "0",
        },
        body: "",
      });
    },

    async deleteFolder(folder: string): Promise<void> {
      const key = getKey(`${folder}/`);
      await fetch(`${baseUrl}/${key}`, {
        method: "DELETE",
        headers: {
          AccessKey: config.apiKey,
        },
      });
    },
  });
}
