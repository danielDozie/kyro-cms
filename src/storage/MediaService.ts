import {
  resolveProvider,
  resolveProviderWithConfig,
  type StorageProvider,
  type UploadedFile,
} from "./index.js";
import { processImage } from "./processor.js";
import { ConfigService } from "../config/ConfigService.js";
import { genId as defaultGenId } from "../database/drizzle/database.js";
import type { Dialect } from "../database/drizzle/database.js";
type ExtendedDialect = Dialect | "mongodb";

let _mediaTablesEnsured = false;

function formatUuid(id: string): string;
function formatUuid(id: any): any {
  if (typeof id !== "string") return id;
  const clean = id.replace(/-/g, "").toLowerCase();
  if (clean.length === 32) {
    return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
  }
  return id;
}

export interface MediaSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  folder?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

interface MediaRow {
  id: string;
  filename: string;
  title: string | null;
  originalName: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  url: string;
  thumbnailUrl: string | null;
  folder: string | null;
  provider: string;
  alt: string | null;
  caption: string | null;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
}

export class MediaService {
  private db: any;
  private storage: StorageProvider;
  private dialect: ExtendedDialect;
  private genId: () => string;
  private mediaTable: string = "media";
  private foldersTable: string = "media_folders";

  constructor(
    db: any,
    storage: StorageProvider,
    options?: { dialect?: ExtendedDialect; genId?: () => string },
  ) {
    this.db = db;
    this.storage = storage;
    this.dialect = options?.dialect || "sqlite";
    this.genId = options?.genId || defaultGenId;
  }

  static async init(
    db: any,
    options?: { dialect?: ExtendedDialect; genId?: () => string; storageConfig?: any },
  ): Promise<MediaService> {
    let storage: StorageProvider;

    if (options?.storageConfig) {
      storage = await resolveProviderWithConfig(options.storageConfig);
    } else {
      const configService = new ConfigService(db);
      await configService.load();
      storage = await resolveProvider(configService);
    }

    const service = new MediaService(db, storage, options);
    await service.ensureTables();
    return service;
  }

  private async ensureTables(): Promise<void> {
    if (this.dialect === "mongodb") {
      const db = this.db.db;
      await db.collection(this.mediaTable).createIndex({ filename: 1 }, { unique: true });
      await db.collection(this.foldersTable).createIndex({ path: 1 }, { unique: true });
      _mediaTablesEnsured = true;
      return;
    }
    if (this.dialect === "sqlite") {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS media (
          id TEXT PRIMARY KEY,
          filename TEXT NOT NULL UNIQUE,
          title TEXT,
          original_name TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          width INTEGER,
          height INTEGER,
          url TEXT NOT NULL UNIQUE,
          thumbnail_url TEXT,
          folder TEXT,
          provider TEXT NOT NULL,
          alt TEXT,
          caption TEXT,
          metadata TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_media_folder ON media(folder);
        CREATE INDEX IF NOT EXISTS idx_media_provider ON media(provider);
        CREATE INDEX IF NOT EXISTS idx_media_filename ON media(filename);
      `);

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS media_folders (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          path TEXT NOT NULL,
          parent_path TEXT,
          created_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_media_folders_path ON media_folders(path);
      `);
    } else if (this.dialect === "postgres") {
      if (_mediaTablesEnsured) return;
      const { sql } = await import("drizzle-orm");
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS "media" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "filename" VARCHAR(255) NOT NULL UNIQUE,
          "title" VARCHAR(255),
          "original_name" VARCHAR(255) NOT NULL,
          "mime_type" VARCHAR(100),
          "file_size" INTEGER,
          "width" INTEGER,
          "height" INTEGER,
          "url" TEXT NOT NULL UNIQUE,
          "thumbnail_url" TEXT,
          "folder" VARCHAR(255),
          "provider" VARCHAR(50) NOT NULL,
          "alt" TEXT,
          "caption" TEXT,
          "metadata" JSONB,
          "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_media_folder" ON "media" ("folder")`);
      await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_media_provider" ON "media" ("provider")`);
      await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_media_filename" ON "media" ("filename")`);

      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS "media_folders" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "name" VARCHAR(255) NOT NULL,
          "path" TEXT NOT NULL,
          "parent_path" TEXT,
          "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      await this.db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_media_folders_path" ON "media_folders" ("path")`);
      _mediaTablesEnsured = true;
    }
  }

  private now(): string {
    return new Date().toISOString();
  }

  private buildFindConditions(params: MediaSearchParams): {
    where: string;
    params: any[];
    orderBy: string;
    sortCol: string;
  } {
    const conditions: string[] = [];
    const p: any[] = [];
    const sortCol =
      params.sortBy === "name"
        ? "title"
        : params.sortBy === "createdAt"
          ? "created_at"
          : params.sortBy === "updatedAt"
            ? "updated_at"
            : params.sortBy || "created_at";
    const sortDir = params.sortDir === "asc" ? "ASC" : "DESC";

    if (params.search) {
      conditions.push(
        `(title LIKE ? OR filename LIKE ? OR original_name LIKE ? OR alt LIKE ?)`,
      );
      const s = `%${params.search}%`;
      p.push(s, s, s, s);
    }
    if (params.type && params.type !== "all") {
      conditions.push(`mime_type LIKE ?`);
      p.push(`${params.type}/%`);
    }
    if (params.folder) {
      conditions.push(`(folder = ? OR folder LIKE ?)`);
      p.push(params.folder, `${params.folder}/%`);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    return { where, params: p, orderBy: sortDir, sortCol };
  }

  private rowToMedia(row: any, origin?: string): MediaRow {
    return {
      id: row.id,
      filename: row.filename,
      title: row.title ?? null,
      originalName: row.original_name ?? row.originalName,
      mimeType: row.mime_type ?? row.mimeType,
      fileSize: row.file_size ?? row.fileSize,
      width: row.width ?? null,
      height: row.height ?? null,
      url: MediaService.resolveMediaUrl(row.url, origin) as string,
      thumbnailUrl: MediaService.resolveMediaUrl(row.thumbnail_url ?? row.thumbnailUrl ?? null, origin),
      folder: row.folder ?? null,
      provider: row.provider,
      alt: row.alt ?? null,
      caption: row.caption ?? null,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata ?? null),
      createdAt: row.created_at ?? row.createdAt,
      updatedAt: row.updated_at ?? row.updatedAt,
    };
  }

  static resolveMediaUrl(url: string | null | undefined, origin?: string): string | null {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) return url;
    const base = (process.env.KYRO_BASE_URL || origin || "http://localhost:4321").replace(/\/+$/, "");
    return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
  }

  private async sqliteRun(sql: string, params: any[] = []): Promise<any> {
    const stmt = this.db.prepare(sql);
    const sqlLower = sql.trim().toLowerCase();

    // For INSERT/UPDATE/DELETE statements, use .run() instead of .all()
    if (
      sqlLower.startsWith("insert") ||
      sqlLower.startsWith("update") ||
      sqlLower.startsWith("delete")
    ) {
      return stmt.run(...params);
    }

    // For SELECT statements, use .all()
    return stmt.all(...params);
  }

  private sqliteGet(sql: string, params: any[] = []): any {
    const stmt = this.db.prepare(sql);
    return stmt.get(...params);
  }

  async upload(file: File, folder: string = "", origin?: string): Promise<MediaRow> {
    const isImage = file.type.startsWith("image/");
    let processed;
    let uploadFile: File = file;
    let filename = file.name;
    let width: number | null = null;
    let height: number | null = null;

    if (isImage && !file.type.includes("svg")) {
      const buffer = Buffer.from(await file.arrayBuffer());
      processed = await processImage(buffer);
      const originalName = file.name.replace(/\.[^/.]+$/, "");
      const safeName = originalName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .substring(0, 50);
      filename = `${safeName}.webp`;
      width = processed.width ?? null;
      height = processed.height ?? null;
      uploadFile = new File([processed.buffer as unknown as BlobPart], filename, {
        type: "image/webp",
      });
    }

    const storageResult: UploadedFile = await this.storage.upload(uploadFile, {
      folder,
      filename,
    });

    const thumbnailUrl = await this.storage.generateThumbnail(
      {
        ...storageResult,
        id: "",
        provider: this.storage.name,
        createdAt: this.now(),
      },
      { width: 400, height: 400 },
    );

    let id = this.genId();
    const now = this.now();

    if (this.dialect === "mongodb") {
      const mime = storageResult.mimeType;
      const mediaType = mime.startsWith("image/") ? "image"
        : mime.startsWith("video/") ? "video"
        : mime.startsWith("audio/") ? "audio"
        : mime.startsWith("application/pdf") ? "document"
        : ["application/zip","application/x-zip","application/x-tar","application/gzip","application/x-7z"].includes(mime) ? "archive"
        : "other";

      await this.db.db.collection(this.mediaTable).insertOne({
          _id: id,
          id,
          filename: storageResult.filename,
          title: file.name.replace(/\.[^/.]+$/, ""),
          originalName: file.name,
          mimeType: mime,
          fileSize: storageResult.size,
          width,
          height,
          url: storageResult.url,
          thumbnailUrl,
          folder: folder || "",
          provider: this.storage.name,
          type: mediaType,
          status: "active",
          alt: null,
          caption: null,
          createdAt: new Date(),
          updatedAt: new Date(),
      });
      return this.rowToMedia({
          id,
          filename: storageResult.filename,
          title: file.name.replace(/\.[^/.]+$/, ""),
          originalName: file.name,
          mimeType: mime,
          fileSize: storageResult.size,
          width,
          height,
          url: storageResult.url,
          thumbnailUrl,
          folder: folder || "",
          provider: this.storage.name,
          type: mediaType,
          status: "active",
          alt: null,
          caption: null,
          createdAt: new Date(),
          updatedAt: new Date(),
      }, origin);
    }
    if (this.dialect === "sqlite") {
      await this.sqliteRun(
        `INSERT INTO ${this.mediaTable}
          (id, filename, title, original_name, mime_type, file_size, width, height, url, thumbnail_url, folder, provider, alt, caption, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          storageResult.filename,
          file.name.replace(/\.[^/.]+$/, ""),
          file.name,
          storageResult.mimeType,
          storageResult.size,
          width,
          height,
          storageResult.url,
          thumbnailUrl,
          folder || null,
          this.storage.name,
          null,
          null,
          null,
          now,
          now,
        ],
      );
    } else {
      const { media: mediaSchema } = await import(
        "../database/drizzle/schema/media.js"
      );
      const mime = storageResult.mimeType;
      const mediaType = mime.startsWith("image/") ? "image"
        : mime.startsWith("video/") ? "video"
        : mime.startsWith("audio/") ? "audio"
        : mime.startsWith("application/pdf") ? "document"
        : ["application/zip","application/x-zip","application/x-tar","application/gzip","application/x-7z"].includes(mime) ? "archive"
        : "other";
      const rows = await this.db
        .insert(mediaSchema)
        .values({
          id,
          filename: storageResult.filename,
          title: file.name.replace(/\.[^/.]+$/, ""),
          originalName: file.name,
          mimeType: mime,
          fileSize: storageResult.size,
          width,
          height,
          url: storageResult.url,
          thumbnailUrl,
          folder: folder || "",
          provider: this.storage.name,
          type: mediaType,
          status: "active",
          alt: null,
          caption: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      if (rows && rows[0]) {
        id = rows[0].id;
      }
    }

    return {
      id,
      filename: storageResult.filename,
      title: file.name.replace(/\.[^/.]+$/, ""),
      originalName: file.name,
      mimeType: storageResult.mimeType,
      fileSize: storageResult.size,
      width,
      height,
      url: storageResult.url,
      thumbnailUrl,
      folder: folder || null,
      provider: this.storage.name,
      alt: null,
      caption: null,
      metadata: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async uploadFromUrl(url: string, folder: string = "", origin?: string): Promise<MediaRow> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    const blob = await response.blob();
    const originalName = url.split("/").pop() || "url-image";
    const mimeType = response.headers.get("content-type") || blob.type || "application/octet-stream";
    const file = new File([blob], originalName, { type: mimeType });
    return this.upload(file, folder, origin);
  }

  async delete(id: string, origin?: string): Promise<void> {
    if (this.dialect === "postgres") {
      id = formatUuid(id);
    }
    let item: MediaRow | null = await this.findById(id, origin);

    if (!item) return;
    await this.deleteFile(item.url);

    if (
      item.thumbnailUrl &&
      item.thumbnailUrl !== item.url &&
      item.thumbnailUrl !== item.url + "?thumb"
    ) {
      try {
        await this.deleteFile(item.thumbnailUrl);
      } catch {}
    }

    if (this.dialect === "mongodb") {
      await this.db.db.collection(this.mediaTable).deleteOne({ id });
      return;
    }
    if (this.dialect === "sqlite") {
      await this.sqliteRun(`DELETE FROM ${this.mediaTable} WHERE id = ?`, [id]);
    } else {
      const { media: mediaSchema } = await import(
        "../database/drizzle/schema/media.js"
      );
      const { eq } = await import("drizzle-orm");
      await this.db.delete(mediaSchema).where(eq(mediaSchema.id, id));
    }
  }

  async deleteFile(url: string): Promise<void> {
    await this.storage.delete(url);
  }

  async rename(id: string, newKey: string, origin?: string): Promise<MediaRow | null> {
    if (this.dialect === "postgres") {
      id = formatUuid(id);
    }
    let item: MediaRow | null = await this.findById(id, origin);

    if (!item) return null;

    const newUrl = await this.storage.rename(item.url, newKey);

    // For Cloudinary, construct thumbnail URL with transformations
    let newThumbnailUrl: string | undefined;
    if (item.thumbnailUrl || this.storage.name === "cloudinary") {
      // Get version from newUrl (format: .../upload/v{version}/...)
      const versionMatch = newUrl.match(/\/upload\/(v\d+)\//);
      const version = versionMatch ? versionMatch[1] + "/" : "";

      // Extract base URL (everything before /upload/)
      const baseUrlMatch = newUrl.match(/(.+?)\/upload\//);
      const baseUrl = baseUrlMatch
        ? baseUrlMatch[1]
        : "https://res.cloudinary.com/" +
            (this.storage as any).config?.cloudName || "unknown";

      // newKey already includes folder path
      newThumbnailUrl = `${baseUrl}/upload/w_200,h_200,c_fill/${version}${newKey}`;
    }

    const ext = item.filename.split(".").pop();
    const newFilename = newKey.includes(".") ? newKey : `${newKey}.${ext}`;

    const updateData = {
      url: newUrl,
      filename: newFilename,
      thumbnailUrl: newThumbnailUrl,
    };

    if (this.dialect === "mongodb") {
      await this.db.db.collection(this.mediaTable).updateOne(
        { id },
        { $set: { url: newUrl, thumbnailUrl: newThumbnailUrl || null, updatedAt: new Date() } }
      );
      return this.findById(id, origin);
    }
    if (this.dialect === "sqlite") {
      // Map thumbnailUrl to thumbnail_url for SQLite
      const sqliteUpdateData: Record<string, any> = { ...updateData };
      if ("thumbnailUrl" in sqliteUpdateData) {
        sqliteUpdateData.thumbnail_url = sqliteUpdateData.thumbnailUrl;
        delete sqliteUpdateData.thumbnailUrl;
      }

      const sets = Object.keys(sqliteUpdateData)
        .map((k) => `${k} = ?`)
        .join(", ");
      const vals = Object.values(sqliteUpdateData);
      await this.sqliteRun(
        `UPDATE ${this.mediaTable} SET ${sets}, updated_at = ? WHERE id = ?`,
        [...vals, this.now(), id],
      );
    } else {
      const { media: mediaSchema } = await import(
        "../database/drizzle/schema/media.js"
      );
      const { eq } = await import("drizzle-orm");
      await this.db
        .update(mediaSchema)
        .set({ ...updateData, updatedAt: this.now() })
        .where(eq(mediaSchema.id, id));
    }

    return {
      ...item,
      ...updateData,
      updatedAt: this.now(),
      thumbnailUrl: updateData.thumbnailUrl ?? null,
    };
  }

  async findById(id: string, origin?: string): Promise<MediaRow | null> {
    if (this.dialect === "postgres") {
      id = formatUuid(id);
    }
    if (this.dialect === "mongodb") {
      const doc = await this.db.db.collection(this.mediaTable).findOne({ id });
      if (!doc) return null;
      return this.rowToMedia(doc, origin);
    }
    if (this.dialect === "sqlite") {
      const row = this.sqliteGet(
        `SELECT * FROM ${this.mediaTable} WHERE id = ?`,
        [id],
      );
      return row ? this.rowToMedia(row, origin) : null;
    }

    const { media: mediaSchema } = await import(
      "../database/drizzle/schema/media.js"
    );
    const { eq } = await import("drizzle-orm");

    const [row] = await this.db
      .select()
      .from(mediaSchema)
      .where(eq(mediaSchema.id, id));

    return row ? this.rowToMedia(row, origin) : null;
  }

  async find(params: MediaSearchParams = {}, origin?: string): Promise<{
    docs: MediaRow[];
    totalDocs: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 30,
      search = "",
      type = "",
      folder = "",
      sortBy = "createdAt",
      sortDir = "desc",
    } = params;

    const {
      where,
      params: p,
      orderBy,
      sortCol,
    } = this.buildFindConditions({
      page,
      limit,
      search,
      type,
      folder,
      sortBy,
      sortDir,
    });

    const offset = (page - 1) * limit;

    if (this.dialect === "mongodb") {
      const filter: any = {};
      const { search, type, folder, sortBy = "createdAt", sortDir = "desc" } = params;
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: "i" } },
          { filename: { $regex: search, $options: "i" } },
          { originalName: { $regex: search, $options: "i" } },
          { alt: { $regex: search, $options: "i" } },
        ];
      }
      if (type && type !== "all") {
        filter.mimeType = { $regex: `^${type}/` };
      }
      if (folder) {
        filter.$or = [
          { folder: folder },
          { folder: { $regex: `^${folder}/` } }
        ];
      }
      const sortColMongo = sortBy === "name" ? "title" : sortBy;
      const sortMap: any = { [sortColMongo]: sortDir === "asc" ? 1 : -1 };

      const total = await this.db.db.collection(this.mediaTable).countDocuments(filter);
      const docs = await this.db.db.collection(this.mediaTable).find(filter).sort(sortMap).skip(offset).limit(limit).toArray();

      return {
        docs: docs.map((doc: any) => this.rowToMedia(doc, origin)),
        totalDocs: total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    }
    if (this.dialect === "sqlite") {
      const countRow = this.sqliteGet(
        `SELECT COUNT(*) as cnt FROM ${this.mediaTable} ${where}`,
        p,
      );
      const totalDocs = countRow?.cnt ?? 0;

      const rows = await this.sqliteRun(
        `SELECT * FROM ${this.mediaTable} ${where} ORDER BY ${sortCol} ${orderBy} LIMIT ? OFFSET ?`,
        [...p, limit, offset],
      );

      return {
        docs: rows.map((r: any) => this.rowToMedia(r, origin)),
        totalDocs,
        page,
        limit,
        totalPages: Math.ceil(totalDocs / limit),
      };
    }

    const { media: mediaSchema } = await import(
      "../database/drizzle/schema/media.js"
    );
    const { like, or, and, asc, desc, eq, sql } = await import(
      "drizzle-orm"
    );

    const conditions: any[] = [];
    if (search) {
      conditions.push(
        or(
          like(mediaSchema.title, `%${search}%`),
          like(mediaSchema.filename, `%${search}%`),
          like(mediaSchema.originalName, `%${search}%`),
          like(mediaSchema.alt, `%${search}%`),
        ),
      );
    }
    if (type && type !== "all") {
      conditions.push(like(mediaSchema.mimeType, `${type}/%`));
    }
    if (folder) {
      conditions.push(
        or(
          eq(mediaSchema.folder, folder),
          like(mediaSchema.folder, `${folder}/%`),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const sortKey: Record<string, string> = {
      created_at: "createdAt",
      updated_at: "updatedAt",
      title: "title",
      filename: "filename",
      file_size: "fileSize",
      mime_type: "mimeType",
      original_name: "originalName",
    };
    const col = (mediaSchema as any)[sortKey[sortCol] || "createdAt"];
    const order = sortDir === "asc" ? asc(col) : desc(col);

    const docs = await this.db
      .select()
      .from(mediaSchema)
      .where(whereClause)
      .orderBy(order)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql`count(*)` })
      .from(mediaSchema)
      .where(whereClause);

    const totalDocs = Number(count);
    return {
      docs: docs.map((r: any) => this.rowToMedia(r, origin)),
      totalDocs,
      page,
      limit,
      totalPages: Math.ceil(totalDocs / limit),
    };
  }

  async update(
    id: string,
    data: { title?: string; alt?: string; caption?: string; folder?: string; metadata?: any; originalName?: string },
    origin?: string,
  ): Promise<MediaRow | null> {
    if (this.dialect === "postgres") {
      id = formatUuid(id);
    }
    const now = this.now();

    if (this.dialect === "mongodb") {
      await this.db.db.collection(this.mediaTable).updateOne(
        { id },
        { $set: { ...data, updatedAt: new Date() } }
      );
      return this.findById(id, origin);
    }
    if (this.dialect === "sqlite") {
      const sets: string[] = ["updated_at = ?"];
      const p: any[] = [now];
      if (data.title !== undefined) {
        sets.push("title = ?");
        p.push(data.title);
      }
      if (data.alt !== undefined) {
        sets.push("alt = ?");
        p.push(data.alt);
      }
      if (data.caption !== undefined) {
        sets.push("caption = ?");
        p.push(data.caption);
      }
      if (data.folder !== undefined) {
        sets.push("folder = ?");
        p.push(data.folder);
      }
      if (data.metadata !== undefined) {
        sets.push("metadata = ?");
        p.push(data.metadata === null ? null : JSON.stringify(data.metadata));
      }
      if (data.originalName !== undefined) {
        sets.push("original_name = ?");
        p.push(data.originalName);
      }
      p.push(id);
      await this.sqliteRun(
        `UPDATE ${this.mediaTable} SET ${sets.join(", ")} WHERE id = ?`,
        p,
      );
      const row = this.sqliteGet(
        `SELECT * FROM ${this.mediaTable} WHERE id = ?`,
        [id],
      );
      return row ? this.rowToMedia(row, origin) : null;
    }

    const { media: mediaSchema } = await import(
      "../database/drizzle/schema/media.js"
    );
    const { eq } = await import("drizzle-orm");
    const [updated] = await this.db
      .update(mediaSchema)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(mediaSchema.id, id))
      .returning();
    return updated ? this.rowToMedia(updated, origin) : null;
  }

  async updateMany(ids: string[], data: { folder?: string }): Promise<void> {
    if (this.dialect === "postgres") {
      ids = ids.map(formatUuid);
    }
    const now = this.now();
    if (this.dialect === "mongodb") {
      for (const id of ids) {
        await this.db.db.collection(this.mediaTable).updateOne(
          { id },
          { $set: { ...data, updatedAt: new Date() } }
        );
      }
      return;
    }
    if (this.dialect === "sqlite") {
      for (const id of ids) {
        const sets = ["updated_at = ?"];
        const p: any[] = [now];
        if (data.folder !== undefined) {
          sets.push("folder = ?");
          p.push(data.folder || null);
        }
        p.push(id);
        await this.sqliteRun(
          `UPDATE ${this.mediaTable} SET ${sets.join(", ")} WHERE id = ?`,
          p,
        );
      }
    } else {
      const { media: mediaSchema } = await import(
        "../database/drizzle/schema/media.js"
      );
      const { eq } = await import("drizzle-orm");
      for (const id of ids) {
        await this.db
          .update(mediaSchema)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(mediaSchema.id, id));
      }
    }
  }

  async listFolders(): Promise<string[]> {
    if (this.dialect === "mongodb") {
      const foldersFromFolders = await this.db.db.collection(this.foldersTable).find({}, { projection: { path: 1 } }).toArray();
      const foldersFromMedia = await this.db.db.collection(this.mediaTable).distinct('folder');
      const all = new Set([
        ...foldersFromFolders.map((r: any) => r.path),
        ...foldersFromMedia
      ]);
      return Array.from(all).filter((f: any) => f && f !== "").sort() as string[];
    }
    if (this.dialect === "sqlite") {
      const rows = await this.sqliteRun(
        `SELECT path FROM ${this.foldersTable} UNION
         SELECT folder as path FROM ${this.mediaTable} WHERE folder IS NOT NULL AND folder != ''`,
      );
      return rows
        .map((r: any) => r.path)
        .filter((f: any) => f && f !== "")
        .sort();
    }

    const { media: mediaSchema, mediaFolders: folderSchema } = await import(
      "../database/drizzle/schema/media.js"
    );
    const { eq, sql } = await import(
      "drizzle-orm"
    );

    const fromMedia = await this.db
      .select({ folder: mediaSchema.folder })
      .from(mediaSchema)
      .groupBy(mediaSchema.folder);

    const fromFolders = await this.db
      .select({ path: folderSchema.path })
      .from(folderSchema);

    const allPaths = new Set([
      ...fromMedia.map((r: any) => r.folder),
      ...fromFolders.map((r: any) => r.path),
    ]);

    return Array.from(allPaths)
      .filter((f: any) => f && f !== "")
      .sort() as string[];
  }

  async createFolder(name: string, parentPath: string = ""): Promise<void> {
    const fullPath = parentPath ? `${parentPath}/${name}` : name;

    await this.storage.createFolder?.(fullPath);

    const now = this.now();

    if (this.dialect === "mongodb") {
      const existing = await this.db.db.collection(this.foldersTable).findOne({ path: fullPath });
      if (!existing) {
        await this.db.db.collection(this.foldersTable).insertOne({
          _id: this.genId(),
          name,
          path: fullPath,
          parentPath: parentPath || null,
          createdAt: new Date()
        });
      }
      return;
    }
    if (this.dialect === "sqlite") {
      await this.sqliteRun(
        `INSERT OR IGNORE INTO ${this.foldersTable} (path, name, parent_path, created_at) VALUES (?, ?, ?, ?)`,
        [fullPath, name, parentPath || null, now],
      );
    } else {
      const { mediaFolders: folderSchema } = await import(
        "../database/drizzle/schema/media.js"
      );
      await this.db
        .insert(folderSchema)
        .values({
          path: fullPath,
          name,
          parentPath: parentPath || null,
          createdAt: new Date(),
        })
        .onConflictDoNothing();
    }
  }

  async deleteFolder(folder: string): Promise<void> {
    const result = await this.find({ folder, limit: 10000 });
    for (const item of result.docs) {
      await this.delete(item.id);
    }

    await this.storage.deleteFolder?.(folder);

    if (this.dialect === "mongodb") {
      await this.db.db.collection(this.foldersTable).deleteMany({
        $or: [
          { path: folder },
          { path: { $regex: `^${folder}/` } }
        ]
      });
      return;
    }
    if (this.dialect === "sqlite") {
      await this.sqliteRun(
        `DELETE FROM ${this.foldersTable} WHERE path = ? OR path LIKE ?`,
        [folder, `${folder}/%`],
      );
    } else {
      const { mediaFolders: folderSchema } = await import(
        "../database/drizzle/schema/media.js"
      );
      const { like, or, eq } = await import(
        "drizzle-orm"
      );
      await this.db
        .delete(folderSchema)
        .where(
          or(
            eq(folderSchema.path, folder),
            like(folderSchema.path, `${folder}/%`),
          ),
        );
    }
  }
}
