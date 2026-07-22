import { writeFile, mkdir, unlink, readdir, stat, rename } from "fs/promises";
import { existsSync } from "fs";
import { join, extname, basename } from "path";
import process from "process";
import { createHash } from "crypto";
import {
  type StorageProvider,
  type UploadedFile,
  type UploadOptions,
  type ImageTransforms,
  withBaseStorage
} from "./index.js";

export interface LocalStorageConfig {
  uploadDir: string;
  baseUrl?: string;
}

export function createLocalStorage(
  config: LocalStorageConfig,
): StorageProvider {
  const { uploadDir = join(process.cwd(), "public", "uploads"), baseUrl = "/uploads" } = config;

  async function ensureDir(dir: string) {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  function getMimeType(filename: string): string {
    const ext = extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".avif": "image/avif",
      ".svg": "image/svg+xml",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
      ".avi": "video/x-msvideo",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".ogg": "audio/ogg",
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".zip": "application/zip",
      ".tar": "application/x-tar",
      ".gz": "application/gzip",
      ".rar": "application/vnd.rar",
      ".7z": "application/x-7z-compressed",
    };
    return mimeTypes[ext] || "application/octet-stream";
  }

  async function getImageDimensions(
    buffer: Buffer,
  ): Promise<{ width?: number; height?: number }> {
    try {
      const header = buffer.toString("hex", 0, 8);
      if (header.startsWith("89504e47")) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height };
      }
      if (header.startsWith("ffd8")) {
        let offset = 2;
        while (offset < buffer.length) {
          if (buffer[offset] !== 0xff) break;
          const marker = buffer[offset + 1];
          if (marker === 0xc0 || marker === 0xc2) {
            const height = buffer.readUInt16BE(offset + 5);
            const width = buffer.readUInt16BE(offset + 7);
            return { width, height };
          }
          offset += 2 + buffer.readUInt16BE(offset + 2);
        }
      }
    } catch {
      // Ignore errors
    }
    return {};
  }

  return withBaseStorage({
    name: "local",
    displayName: "Local Storage",
    supportsDynamicResize: true,

    async upload(file: File, options?: UploadOptions): Promise<UploadedFile> {
      await ensureDir(uploadDir);

      const buffer = Buffer.from(await file.arrayBuffer());
      const hash = createHash("md5").update(buffer).digest("hex");
      const ext = extname(file.name);
      const filename = options?.filename || `${hash}${ext}`;
      const folder = options?.folder || "";
      const targetDir = folder ? join(uploadDir, folder) : uploadDir;

      await ensureDir(targetDir);

      const filepath = join(targetDir, filename);
      await writeFile(filepath, buffer);

      const dimensions = file.type.startsWith("image/")
        ? await getImageDimensions(buffer)
        : {};

      const normalizedBaseUrl = baseUrl || "/uploads";
      const urlPath = folder ? `/${folder}/${filename}` : `/${filename}`;
      const url = normalizedBaseUrl + urlPath;

      return {
        id: hash,
        filename,
        originalName: file.name,
        mimeType: file.type || getMimeType(file.name),
        size: buffer.length,
        url,
        thumbnailUrl: file.type.startsWith("image/") ? url : undefined,
        folder: folder || undefined,
        provider: "local",
        metadata: {
          ...dimensions,
          ...options?.metadata,
        },
        createdAt: new Date().toISOString(),
      };
    },

    async uploadFromUrl(
      url: string,
      options?: UploadOptions,
    ): Promise<UploadedFile> {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition");
      let filename = options?.filename;

      if (!filename && contentDisposition) {
        const match = contentDisposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
        );
        if (match) {
          filename = match[1].replace(/['"]/g, "");
        }
      }

      if (!filename) {
        filename = basename(new URL(url).pathname);
      }

      const file = new File([blob], filename, {
        type: blob.type || getMimeType(filename),
      });
      return this.upload!(file, options);
    },

    async delete(url: string): Promise<void> {
      const filepath = join(uploadDir, url.replace(baseUrl + "/", ""));
      try {
        await unlink(filepath);
      } catch {
        // Ignore if file doesn't exist
      }
    },

    async rename(oldUrl: string, newFilename: string): Promise<string> {
      const oldPath = join(uploadDir, oldUrl.replace(baseUrl + "/", ""));
      const newPath = join(uploadDir, newFilename);
      await rename(oldPath, newPath);
      return `${baseUrl}/${newFilename}`;
    },





    async list(prefix?: string): Promise<UploadedFile[]> {
      const dir = prefix ? join(uploadDir, prefix) : uploadDir;
      if (!existsSync(dir)) return [];

      const files: UploadedFile[] = [];
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile()) {
          const filepath = join(dir, entry.name);
          const stats = await stat(filepath);
          const url = `${baseUrl}${prefix ? `/${prefix}` : ""}/${entry.name}`;

          files.push({
            id: createHash("md5").update(entry.name).digest("hex"),
            filename: entry.name,
            originalName: entry.name,
            mimeType: getMimeType(entry.name),
            size: stats.size,
            url,
            provider: "local",
            createdAt: stats.birthtime.toISOString(),
          });
        }
      }

      return files;
    },

    async exists(url: string): Promise<boolean> {
      const filepath = join(uploadDir, url.replace(baseUrl + "/", ""));
      return existsSync(filepath);
    },

    async createFolder(folder: string): Promise<void> {
      const dir = join(uploadDir, folder);
      await mkdir(dir, { recursive: true });
    },

    async deleteFolder(folder: string): Promise<void> {
      const dir = join(uploadDir, folder);
      if (existsSync(dir)) {
        const { rm } = await import("fs/promises");
        await rm(dir, { recursive: true, force: true });
      }
    },
  });
}

function getMimeType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".pdf": "application/pdf",
  };
  return mimeTypes[ext] || "application/octet-stream";
}
