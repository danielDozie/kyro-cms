import { Readable } from "stream";
import { Client, FileInfo } from "basic-ftp";
import {
  type StorageProvider,
  type UploadedFile,
  type UploadOptions,
  type ImageTransforms,
  withBaseStorage
} from "./index.js";

export interface FtpStorageConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean;
  baseUrl: string;
  prefix?: string;
  type: "ftp" | "sftp";
}

export function createFtpStorage(config: FtpStorageConfig): StorageProvider {
  let client: InstanceType<typeof Client> | null = null;

  async function getClient(): Promise<InstanceType<typeof Client>> {
    if (!client) {
      client = new Client(60000, { allowSeparateTransferHost: true });
      client.ftp.verbose = false;

      await client.access({
        host: config.host,
        port: config.port || 21,
        user: config.user,
        password: config.password,
        secure: config.secure,
        secureOptions: {},
      });
    }
    return client;
  }

  const getKey = (path: string) => {
    const prefix = config.prefix ? `${config.prefix}/` : "";
    return `${prefix}${path}`.replace(/\/+/g, "/");
  };

  const getUrl = (key: string) => {
    const base = config.baseUrl.replace(/\/$/, "");
    return `${base}/${key}`;
  };

  const getUrlPrefix = () => {
    const base = config.baseUrl.replace(/\/$/, "");
    return base + "/";
  };

  return withBaseStorage({
    name: config.type,
    displayName: config.type === "sftp" ? "SFTP Storage" : "FTP Storage",
    supportsDynamicResize: false,

    async upload(file: File, options?: UploadOptions): Promise<UploadedFile> {
      const ftp = await getClient();
      const key = getKey(
        `${options?.folder ? `${options.folder}/` : ""}${options?.filename || file.name}`,
      );

      const buffer = Buffer.from(await file.arrayBuffer());

      // Create directory structure if needed
      const parts = key.split("/").slice(0, -1);
      let currentPath = "";
      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        try {
          await ftp.ensureDir(currentPath);
        } catch {
          // Directory may already exist
        }
      }

      const readable = Readable.from(buffer);
      await ftp.uploadFrom(readable, key);

      return {
        id: Buffer.from(key).toString("base64url"),
        filename: options?.filename || file.name,
        originalName: file.name,
        mimeType: file.type,
        size: buffer.length,
        url: getUrl(key),
        thumbnailUrl: file.type.startsWith("image/") ? getUrl(key) : undefined,
        folder: options?.folder,
        provider: config.type,
        metadata: options?.metadata,
        createdAt: new Date().toISOString(),
      };
    },



    async delete(url: string): Promise<void> {
      const ftp = await getClient();
      const key = url.replace(getUrlPrefix(), "");
      await ftp.remove(key);
    },

    async rename(oldUrl: string, newKey: string): Promise<string> {
      const ftp = await getClient();
      const oldKey = oldUrl.replace(getUrlPrefix(), "");
      const fullPath = config.prefix ? `${config.prefix}/${newKey}` : newKey;

      await ftp.rename(oldKey, fullPath);

      return getUrl(fullPath);
    },



    async list(prefix?: string): Promise<UploadedFile[]> {
      const ftp = await getClient();
      const key = getKey(prefix || "");

      let items: FileInfo[];
      try {
        items = await ftp.list(key);
      } catch {
        return [];
      }

      return items
        .filter((item) => item.type === 0)
        .map((item) => ({
          id: Buffer.from(`${key}/${item.name}`).toString("base64url"),
          filename: item.name,
          originalName: item.name,
          mimeType: "application/octet-stream",
          size: Number(item.size) || 0,
          url: getUrl(`${key}/${item.name}`.replace(/\/+/g, "/")),
          provider: config.type,
          createdAt: item.modifiedAt
            ? item.modifiedAt.toISOString()
            : new Date().toISOString(),
        }));
    },

    async exists(url: string): Promise<boolean> {
      const ftp = await getClient();
      const key = url.replace(getUrlPrefix(), "");
      try {
        await ftp.size(key);
        return true;
      } catch {
        return false;
      }
    },

    async createFolder(folder: string): Promise<void> {
      const ftp = await getClient();
      const key = getKey(folder);
      await ftp.ensureDir(key);
    },

    async deleteFolder(folder: string): Promise<void> {
      const ftp = await getClient();
      const key = getKey(folder);
      await ftp.removeDir(key);
    },
  });
}
