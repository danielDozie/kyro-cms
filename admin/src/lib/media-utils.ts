export type FileType = "image" | "video" | "audio" | "document" | "archive" | "code" | "unknown";

export function getFileType(mimeType: string, filename?: string): FileType {
  const ext = filename?.split(".").pop()?.toLowerCase();

  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";

  if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"].includes(ext || "")) return "document";
  if (["zip", "rar", "tar", "gz", "7z"].includes(ext || "")) return "archive";
  if (["js", "ts", "py", "rb", "java", "c", "cpp", "go", "rs", "css", "html", "json", "xml", "yaml", "toml", "sh"].includes(ext || "")) return "code";
  if (mimeType.startsWith("text/")) return "document";

  return "unknown";
}

export type MediaIconType = "image" | "video" | "audio" | "document" | "archive" | "unknown";
