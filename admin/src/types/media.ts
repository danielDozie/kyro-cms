export interface MediaItem {
  id: string;
  title: string;
  filename: string;
  originalName?: string;
  url: string;
  thumbnailUrl?: string;
  type: "image" | "video" | "audio" | "document" | "archive" | "other";
  mimeType: string;
  fileSize: number;
  folder?: string;
  alt?: string;
  caption?: string;
  metadata?: {
    crop?: { x: number; y: number; width: number; height: number };
    hotspot?: { x: number; y: number; width: number; height: number };
    [key: string]: any;
  };
  createdAt: string;
  updatedAt?: string;
}

export type FilterType =
  | "all"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "archive"
  | "other";

export function getAbsoluteUrl(relativeUrl: unknown): string {
  if (typeof relativeUrl !== "string" || !relativeUrl) return "";
  if (typeof window === "undefined") return relativeUrl;
  if (relativeUrl.startsWith("http") || relativeUrl.startsWith("blob:")) {
    return relativeUrl;
  }
  const sanitized = relativeUrl.replace(/^\/+/, "/");
  return `${window.location.origin}${sanitized}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getFileType(mimeType: string): FilterType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType.includes("zip") ||
    mimeType.includes("tar") ||
    mimeType.includes("archive")
  )
    return "archive";
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("doc") ||
    mimeType.includes("text")
  )
    return "document";
  return "other";
}
export function getCroppedUrl(item: MediaItem, width?: number): string | null {
  if (!item.metadata?.crop) return null;
  const { x, y, width: cw, height: ch } = item.metadata.crop;
  if (!cw || !ch) return null;
  const base = getAbsoluteUrl(item.url);
  if (!base) return null;
  const params = new URLSearchParams({ url: item.url });
  params.set("cx", String(x));
  params.set("cy", String(y));
  params.set("cw", String(cw));
  params.set("ch", String(ch));
  if (width) params.set("w", String(width));
  const resizePath = `/api/media/resize?${params.toString()}`;
  if (typeof window === "undefined") return resizePath;
  return `${window.location.origin}${resizePath}`;
}
