import { join } from "node:path";

export const DEFAULT_UPLOAD_DIR = join(process.cwd(), "public", "uploads");
export const DEFAULT_MEDIA_BASE_URL = "/uploads";
export const ALLOWED_IMAGE_FORMATS = ["webp", "avif", "png", "jpeg", "jpg"] as const;
export type ImageFormat = (typeof ALLOWED_IMAGE_FORMATS)[number];
export type ImageFitMode = "cover" | "contain" | "fill" | "inside" | "outside";
