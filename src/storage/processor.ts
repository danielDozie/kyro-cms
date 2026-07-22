// sharp is imported dynamically to prevent Vite from bundling it for the browser

export interface ProcessedImage {
  buffer: Buffer;
  thumbnailBuffer: Buffer;
  width?: number;
  height?: number;
  format: string;
}

export async function processImage(
  buffer: Buffer,
): Promise<ProcessedImage> {
  const { default: sharp } = await import("sharp");
  const metadata = await sharp(buffer).metadata();
  
  // Create main optimized version (WebP)
  const mainImage = sharp(buffer)
    .webp({ quality: 85 });
    
  // Create thumbnail (WebP, fixed width)
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
}
