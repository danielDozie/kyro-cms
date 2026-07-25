import { isEdgeRuntime } from "../utils/runtime.js";

export interface ProcessedImage {
  buffer: Buffer;
  thumbnailBuffer: Buffer;
  width?: number;
  height?: number;
  format: string;
}

/**
 * Universal Image Processor for Kyro CMS.
 * Uses `sharp` on Node.js runtimes and falls back to Web-standard passthrough on V8 Edge Isolates.
 */
export async function processImage(
  buffer: Buffer,
): Promise<ProcessedImage> {
  if (!isEdgeRuntime()) {
    try {
      // Dynamically import sharp in Node.js environment
      const { default: sharp } = await import("sharp");
      const metadata = await sharp(buffer).metadata();
      
      const mainImage = sharp(buffer).webp({ quality: 85 });
      const thumbnail = sharp(buffer)
        .resize({ width: 500, withoutEnlargement: true })
        .webp({ quality: 80 });

      return {
        buffer: await mainImage.toBuffer(),
        thumbnailBuffer: await thumbnail.toBuffer(),
        width: metadata.width,
        height: metadata.height,
        format: "webp",
      };
    } catch {
      // Fallback if sharp C++ binary fails to load
    }
  }

  // Edge / Fallback Passthrough (No C++ binary required)
  return {
    buffer,
    thumbnailBuffer: buffer,
    format: "passthrough",
  };
}
