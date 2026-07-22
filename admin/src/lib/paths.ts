declare const __KYRO_ADMIN_PATH__: string;
declare const __KYRO_API_PATH__: string;

export const adminPath =
  typeof __KYRO_ADMIN_PATH__ !== "undefined" ? __KYRO_ADMIN_PATH__ : "/admin";
export const apiPath =
  typeof __KYRO_API_PATH__ !== "undefined" ? __KYRO_API_PATH__ : "/api";

export function resolveApi(url: string): string {
  // If URL is already absolute or prefixed with the correct apiPath, return as is
  if (url.startsWith("http") || url.startsWith(apiPath)) return url;
  
  // If it starts with the standard "/api/", map it to the configured apiPath
  if (url.startsWith("/api/")) {
    return apiPath + url.slice(4);
  }
  
  // Otherwise, prepend the apiPath
  const separator = url.startsWith("/") ? "" : "/";
  return `${apiPath}${separator}${url}`;
}


export function resolveAdmin(url: string): string {
  // If URL is already absolute or prefixed with the correct adminPath, return as is
  if (url.startsWith("http") || url.startsWith(adminPath)) return url;
  
  // If it's a standard "/admin/" path, map it to the configured adminPath
  if (url.startsWith("/admin/")) {
    return adminPath + url.slice(6);
  }
  
  // Otherwise, prepend the adminPath if it looks like a relative path
  if (url.startsWith("/")) {
    return adminPath + url;
  }
  
  return url;
}


export function resolveMedia(url: unknown): string {
  if (!url || typeof url !== "string") return "";
  // Absolute URLs, blob URLs, and data URLs are returned as-is
  if (url.startsWith("http") || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  
  // For relative paths, ensure they start with a single slash
  // These are relative to the site root (where /uploads/ usually lives)
  return url.startsWith("/") ? url : `/${url}`;
}


export const paths = {
  admin: adminPath,
  api: apiPath,
  resolveApi,
  resolveAdmin,
  resolveMedia,
} as const;
