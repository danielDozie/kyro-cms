import { Hono } from "hono";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { KyroAppOptions } from "../kyro-app.js";
import { resolveAuthContext } from "../utils/api-helpers.js";
import { ApiError } from "../../../utils/errors.js";
import { MediaService } from "../../../storage/MediaService.js";
import { DrizzleAdapter } from "../../../database/drizzle/adapter.js";
import { DEFAULT_UPLOAD_DIR, DEFAULT_MEDIA_BASE_URL, type ImageFitMode } from "../../../storage/constants.js";

export function mountMediaRoutes(
  app: Hono,
  options: KyroAppOptions,
  authMw: any
) {
  const { db, user, tenantId } = options;

  let mediaService: MediaService | null = null;
  let mediaServiceInitError: any = null;

  const getMedia = async () => {
    if (mediaServiceInitError) {
      mediaServiceInitError = null; // Reset so retry can succeed after reconnect
    }
    if (!mediaService) {
      try {
        if (typeof (db as any)?.connect === "function") {
          await (db as any).connect();
        }
        let dialect: any = "sqlite";
        if ('dialect' in db && db.dialect === "postgres") {
          dialect = "postgres";
        } else if ('dialect' in db && db.dialect === "mongodb") {
          dialect = "mongodb";
        }
        const mediaDb = dialect === "postgres" ? (db as any).client || db : db;
        mediaService = await MediaService.init(mediaDb, { dialect });
      } catch (error: any) {
        console.error("[getMedia] Init error:", error);
        mediaServiceInitError = error;
        throw error;
      }
    }
    return mediaService;
  };

  app.get("/api/media", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser) throw new ApiError(401, "Authentication required");
    const service = await getMedia();
    const origin = new URL(c.req.url).origin;
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "30");
    const search = c.req.query("search") || "";
    const type = c.req.query("type") || "";
    const folder = c.req.query("folder") || "";
    const result = await service.find({ page, limit, search, type, folder }, origin);
    return c.json(result);
  });

  app.post("/api/media/upload", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser) {
      throw new ApiError(401, "Authentication required");
    }
    const service = await getMedia();
    const contentType = c.req.header("content-type") || "";
    const origin = new URL(c.req.url).origin;
    if (contentType.includes("multipart/form-data")) {
      const formData = await c.req.formData();
      const file = formData.get("file") as File;
      const folder = (formData.get("folder") as string) || "";

      if (!file) throw new ApiError(400, "No file uploaded");

      const result = await service.upload(file, folder, origin);
      return c.json(result);
    }
    const body = await c.req.json();
    const { url } = body;
    const folder = body.folder || "";
    if (!url) throw new ApiError(400, "No URL provided");
    const result = await service.uploadFromUrl(url, folder, origin);
    return c.json(result);
  });

  app.get("/api/media/folders", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser) throw new ApiError(401, "Authentication required");
    const service = await getMedia();
    const folders = await service.listFolders();
    return c.json(folders);
  });

  app.post("/api/media/folders", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser) throw new ApiError(401, "Authentication required");
    const service = await getMedia();
    const body = await c.req.json();
    const { name, parentPath } = body;
    if (!name) {
      throw new ApiError(400, "Folder name is required");
    }
    await service.createFolder(name, parentPath || "");
    return c.json({
      message: "Folder created",
      path: parentPath ? `${parentPath}/${name}` : name,
    });
  });

  app.delete("/api/media/folders", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser) throw new ApiError(401, "Authentication required");
    const service = await getMedia();
    const path = c.req.query("path");
    if (!path) {
      throw new ApiError(400, "Path is required");
    }
    await service.deleteFolder(path);
    return c.json({ message: "Folder deleted" });
  });

  app.get("/api/media/resize", async (c) => {
    let url = c.req.query("url");
    if (url?.startsWith(new URL(c.req.url).origin + "/")) url = new URL(url).pathname;
    const w = parseInt(c.req.query("w") || "0");
    const h = parseInt(c.req.query("h") || "0");
    const fit = (c.req.query("fit") || "cover") as ImageFitMode;
    const format = (c.req.query("fmt") || c.req.query("format") || "").toLowerCase();
    const q = parseInt(c.req.query("q") || c.req.query("quality") || "80");
    const cx = parseFloat(c.req.query("cx") || "0");
    const cy = parseFloat(c.req.query("cy") || "0");
    const cw = parseFloat(c.req.query("cw") || "0");
    const ch = parseFloat(c.req.query("ch") || "0");
    const hx = parseFloat(c.req.query("hx") || "");
    const hy = parseFloat(c.req.query("hy") || "");
    const hw = parseFloat(c.req.query("hw") || "");
    const hh = parseFloat(c.req.query("hh") || "");
    if (!url) throw new ApiError(400, "URL is required");

    const service = await getMedia();
    const storage: any = (service as any).storage;
    let imageBuffer: Buffer | null = null;

    if (storage && storage.name === "local") {
      const uploadDir = storage.config?.uploadDir || DEFAULT_UPLOAD_DIR;
      const baseUrl = storage.config?.baseUrl || DEFAULT_MEDIA_BASE_URL;
      if (url.startsWith(baseUrl)) {
        const relativePath = url.replace(baseUrl, "");
        const physicalPath = join(uploadDir, relativePath);
        if (existsSync(physicalPath)) {
          imageBuffer = readFileSync(physicalPath);
        }
      }
    }

    // Remote storage or external URL: fetch buffer to enable remote storage transformations
    if (!imageBuffer) {
      try {
        const targetUrl = url.startsWith("http://") || url.startsWith("https://")
          ? url
          : new URL(url, c.req.url).href;
        const response = await fetch(targetUrl, { signal: AbortSignal.timeout(8000) });
        if (response.ok) {
          imageBuffer = Buffer.from(await response.arrayBuffer());
        }
      } catch {
        return c.redirect(url);
      }
    }

    if (!imageBuffer) {
      return c.redirect(url);
    }
    const { default: sharp } = await import("sharp");
    const { imageFrame } = await import("../../../storage/image-framing.js");

    // 1. Apply EXIF orientation first so intrinsic width & height match visual coordinates
    const orientedPipeline = sharp(imageBuffer).rotate();
    const orientedBuffer = await orientedPipeline.toBuffer();
    const imgMeta = await sharp(orientedBuffer).metadata();
    const imgW = imgMeta.width || 0;
    const imgH = imgMeta.height || 0;

    let transform = sharp(orientedBuffer);

    // 2. Compute crop region using imageFrame if crop params are given
    if (cw > 0 && ch > 0 && imgW > 0 && imgH > 0) {
      const hotspot = !isNaN(hx) && !isNaN(hy)
        ? { x: hx, y: hy, width: isNaN(hw) || hw <= 0 ? 10 : hw, height: isNaN(hh) || hh <= 0 ? 10 : hh }
        : null;
      const targetAspect = w > 0 && h > 0 ? w / h : cw / ch;

      const frame = imageFrame(imgW, imgH, { x: cx, y: cy, width: cw, height: ch }, hotspot, targetAspect);

      const left = Math.max(0, Math.min(Math.round((frame.x / 100) * imgW), imgW - 1));
      const top = Math.max(0, Math.min(Math.round((frame.y / 100) * imgH), imgH - 1));
      const width = Math.max(1, Math.min(Math.round((frame.width / 100) * imgW), imgW - left));
      const height = Math.max(1, Math.min(Math.round((frame.height / 100) * imgH), imgH - top));

      transform = transform.extract({ left, top, width, height });
    }

    // 3. Resize to requested dimensions
    if (w > 0 || h > 0) {
      transform = transform.resize({
        width: w > 0 ? w : undefined,
        height: h > 0 ? h : undefined,
        fit: fit,
      });
    }

    let outFormat = "webp";
    if (format === "avif") {
      transform = transform.avif({ quality: q });
      outFormat = "avif";
    } else if (format === "png") {
      transform = transform.png({ compressionLevel: 8 });
      outFormat = "png";
    } else if (format === "jpeg" || format === "jpg") {
      transform = transform.jpeg({ quality: q });
      outFormat = "jpeg";
    } else if (format === "webp") {
      transform = transform.webp({ quality: q });
      outFormat = "webp";
    } else {
      const metadata = await sharp(imageBuffer).metadata();
      outFormat = metadata.format || "webp";
    }

    const outputBuffer = await transform.toBuffer();
    c.header("Content-Type", `image/${outFormat}`);
    c.header("Cache-Control", "public, max-age=31536000, immutable");
    return c.body(outputBuffer as any);
  });

  app.get("/api/media/file/:key{.+$}", async (c) => {
    const key = c.req.param("key");
    const bucket = (globalThis as any).STORAGE_BUCKET;
    if (bucket) {
      const object = await bucket.get(key);
      if (!object) return c.notFound();
      
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      return new Response(object.body as any, { headers });
    }
    return c.notFound();
  });

  app.get("/api/media/test", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser) throw new ApiError(401, "Authentication required");
    const service = await getMedia();
    return c.json({
      status: service ? "initialized" : "failed",
      serviceType: service?.constructor?.name,
    });
  });

  app.get("/api/media/:id", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser) throw new ApiError(401, "Authentication required");
    const service = await getMedia();
    const id = c.req.param("id");
    const origin = new URL(c.req.url).origin;
    const doc = await service.findById(id, origin);
    if (!doc) throw new ApiError(404, "Media not found");
    return c.json(doc);
  });

  app.patch("/api/media/:id", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser) throw new ApiError(401, "Authentication required");
    const service = await getMedia();
    const id = c.req.param("id");
    const body = await c.req.json();
    const origin = new URL(c.req.url).origin;
    const updatableFields = ["folder", "metadata", "title", "alt", "caption", "originalName"];
    const updates: any = {};
    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }
    if (Object.keys(updates).length > 0) {
      const updated = await service.update(id, updates, origin);
      return c.json({ doc: updated });
    }
    throw new ApiError(400, "No valid fields to update");
  });

  app.delete("/api/media/:id", async (c) => {
    const { user: ctxUser } = await resolveAuthContext(c.req.raw, authMw, user, tenantId);
    if (!ctxUser) throw new ApiError(401, "Authentication required");
    const service = await getMedia();
    const id = c.req.param("id");
    const origin = new URL(c.req.url).origin;
    await service.delete(id, origin);
    return c.json({ success: true });
  });
}
