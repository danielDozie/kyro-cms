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
export interface ImageProcessOptions {
  format?: "webp" | "avif" | "jpeg" | "png";
  quality?: number;
}

/**
 * Universal Image Processor for Kyro CMS.
 * Uses `sharp` on Node.js runtimes and supports WebP, AVIF, JPEG, and PNG conversions with V8 Edge fallback.
 */
export async function processImage(
  buffer: Buffer,
  options?: ImageProcessOptions
): Promise<ProcessedImage> {
  const targetFormat = options?.format || "webp";
  const quality = options?.quality ?? (targetFormat === "avif" ? 80 : 85);

  if (!isEdgeRuntime()) {
    try {
      const { default: sharp } = await import("sharp");
      const metadata = await sharp(buffer).metadata();
      
      let mainPipeline = sharp(buffer);
      let thumbPipeline = sharp(buffer).resize({ width: 500, withoutEnlargement: true });

      if (targetFormat === "avif") {
        mainPipeline = mainPipeline.avif({ quality });
        thumbPipeline = thumbPipeline.avif({ quality: Math.min(quality, 75) });
      } else if (targetFormat === "png") {
        mainPipeline = mainPipeline.png({ compressionLevel: 8 });
        thumbPipeline = thumbPipeline.png({ compressionLevel: 8 });
      } else if (targetFormat === "jpeg" || targetFormat === "jpg" as any) {
        mainPipeline = mainPipeline.jpeg({ quality });
        thumbPipeline = thumbPipeline.jpeg({ quality: Math.min(quality, 80) });
      } else {
        // Default: webp
        mainPipeline = mainPipeline.webp({ quality });
        thumbPipeline = thumbPipeline.webp({ quality: Math.min(quality, 80) });
      }

      return {
        buffer: await mainPipeline.toBuffer(),
        thumbnailBuffer: await thumbPipeline.toBuffer(),
        width: metadata.width,
        height: metadata.height,
        format: targetFormat,
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
