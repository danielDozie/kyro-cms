import { apiPath, adminPath, resolveApi, resolveAdmin, resolveMedia } from "./paths";
import { toast } from "./stores";

export interface ApiResponse<T = any> {
  docs?: T[];
  doc?: T;
  totalDocs?: number;
  error?: string;
}

export { resolveApi as resolveApi, resolveAdmin as resolveAdminUrl, resolveApi as resolveUrl, resolveMedia as resolveMedia };

const API_BASE = apiPath;
const ADMIN_BASE = adminPath;

const TOKEN_REFRESH_URL = "/api/auth/refresh";

async function refreshToken(): Promise<boolean> {
  try {
    const response = await fetch(resolveApi(TOKEN_REFRESH_URL), {
      method: "POST",
      credentials: "include",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  headers["x-kyro-admin"] = "true";
  Object.assign(headers, options.headers as Record<string, string> | undefined);

  const response = await fetch(resolveApi(url), {
    ...options,
    credentials: "include",
    headers,
  });

  if (response.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      const retryHeaders: Record<string, string> = {};
      if (!(options.body instanceof FormData)) {
        retryHeaders["Content-Type"] = "application/json";
      }
      Object.assign(retryHeaders, options.headers as Record<string, string> | undefined);
      const retryResponse = await fetch(resolveApi(url), {
        ...options,
        credentials: "include",
        headers: retryHeaders,
      });
      return retryResponse;
    }
    window.location.href = "/admin/login";
  }

  return response;
}

export async function apiGet<T = any>(
  url: string,
  options?: RequestInit & { autoToast?: boolean },
): Promise<T> {
  const { autoToast = true, ...fetchOptions } = options || {};
  const response = await fetchWithAuth(url, fetchOptions);
  if (!response.ok) {
    const errorMsg = `GET Failed: ${response.status}`;
    if (autoToast) toast.error(errorMsg);
    throw new Error(errorMsg);
  }
  return response.json();
}

export async function apiPost<T = any>(
  url: string,
  body?: unknown,
  options?: RequestInit & { autoToast?: boolean },
): Promise<T> {
  const { autoToast = true, ...fetchOptions } = options || {};
  const response = await fetchWithAuth(url, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
    ...fetchOptions,
  });
  if (!response.ok) {
    let errorMessage = `POST Failed: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.error) errorMessage = errorData.error;
    } catch {}
    if (autoToast) toast.error(errorMessage);
    throw new Error(errorMessage);
  }
  return response.json();
}

export async function apiPatch<T = any>(
  url: string,
  body?: unknown,
  options?: RequestInit & { autoToast?: boolean },
): Promise<T> {
  const { autoToast = true, ...fetchOptions } = options || {};
  const response = await fetchWithAuth(url, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
    ...fetchOptions,
  });
  if (!response.ok) {
    let errorMessage = `Update Failed: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.error) errorMessage = errorData.error;
    } catch {}
    if (autoToast) toast.error(errorMessage);
    throw new Error(errorMessage);
  }
  return response.json();
}

export async function apiPatchNoThrow<T = any>(
  url: string,
  body?: unknown,
): Promise<{ ok: boolean; data?: T; error?: string }> {
  const response = await fetchWithAuth(url, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    return { ok: false, error: `Error: ${response.status}` };
  }
  const data = await response.json();
  return { ok: true, data };
}

export async function apiDelete<T = any>(
  url: string,
  options?: RequestInit & { autoToast?: boolean },
): Promise<T> {
  const { autoToast = true, ...fetchOptions } = options || {};
  const response = await fetchWithAuth(url, {
    method: "DELETE",
    ...fetchOptions,
  });
  if (!response.ok) {
    let errorMessage = `Delete Failed: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.error) errorMessage = errorData.error;
    } catch {}
    if (autoToast) toast.error(errorMessage);
    throw new Error(errorMessage);
  }
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text);
}

export function buildQueryString(params: Record<string, unknown>): string {
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      urlParams.set(key, String(value));
    }
  }
  return urlParams.toString();
}

export function withCacheBust(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}t=${Date.now()}`;
}

export function buildSearchQuery(
  search: string,
  fields: string[],
  limit: number = 50,
): string {
  if (!search || fields.length === 0) {
    return `limit=${limit}`;
  }
  const searchQuery = fields
    .map((f) => `where[${f}][contains]=${encodeURIComponent(search)}`)
    .join("&");
  return `${searchQuery}&limit=${limit}`;
}

export function buildCollectionUrl(
  collection: string,
  params?: Record<string, unknown>,
): string {
  let url = `${API_BASE}/${collection}`;
  if (params) {
    const query = buildQueryString(params);
    if (query) url += `?${query}`;
  }
  return withCacheBust(url);
}

export function buildDocumentUrl(
  collection: string,
  id: string,
  params?: Record<string, unknown>,
): string {
  let url = `${API_BASE}/${collection}/${id}`;
  if (params) {
    const query = buildQueryString(params);
    if (query) url += `?${query}`;
  }
  return url;
}

export async function apiUpload<T = any>(
  url: string,
  body: FormData,
  onProgress?: (percent: number) => void,
): Promise<T> {
  if (!onProgress) {
    // Fast path: no progress tracking needed
    const response = await fetchWithAuth(url, {
      method: "POST",
      body,
    });
    if (!response.ok) {
      throw new Error(`Upload Error: ${response.status}`);
    }
    return response.json();
  }

  // Use XHR for upload progress events
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", resolveApi(url));
    xhr.withCredentials = true;

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Invalid JSON response"));
        }
      } else if (xhr.status === 401) {
        // Attempt token refresh then retry once
        refreshToken().then((refreshed) => {
          if (!refreshed) { reject(new Error(`Upload Error: ${xhr.status}`)); return; }
          const xhr2 = new XMLHttpRequest();
          xhr2.open("POST", resolveApi(url));
          xhr2.withCredentials = true;
          xhr2.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
          });
          xhr2.addEventListener("load", () => {
            if (xhr2.status >= 200 && xhr2.status < 300) {
              try { resolve(JSON.parse(xhr2.responseText)); } catch { reject(new Error("Invalid JSON")); }
            } else {
              reject(new Error(`Upload Error: ${xhr2.status}`));
            }
          });
          xhr2.addEventListener("error", () => reject(new Error("Network error")));
          xhr2.send(body);
        });
      } else {
        reject(new Error(`Upload Error: ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.send(body);
  });
}