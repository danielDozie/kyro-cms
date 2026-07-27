import { apiPath, adminPath } from "./paths";

export interface AuthServerResult {
  user: any | null;
  permissions: any | null;
}

export interface RequireAuthOptions {
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  collectionRead?: string;
  collectionCreate?: string;
}

/**
 * Resolves authenticated user and permissions directly on the server during Astro SSR requests.
 * Uses dynamic apiPath to support custom API endpoint configurations.
 */
export async function getAuthServer(request: Request): Promise<AuthServerResult> {
  try {
    const cookie = request.headers.get("cookie") || "";
    if (!cookie) return { user: null, permissions: null };

    const url = new URL(request.url);
    const origin = url.origin;
    const cleanApiPath = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;

    const [meRes, accessRes] = await Promise.all([
      fetch(`${origin}${cleanApiPath}/auth/me`, {
        headers: { cookie },
      }).catch(() => null),
      fetch(`${origin}${cleanApiPath}/auth/access`, {
        headers: { cookie },
      }).catch(() => null),
    ]);

    const meData = meRes && meRes.ok ? await meRes.json() : null;
    const permissions = accessRes && accessRes.ok ? await accessRes.json() : null;

    return {
      user: meData?.user || null,
      permissions,
    };
  } catch (err) {
    console.error("[getAuthServer] Error resolving SSR auth:", err);
    return { user: null, permissions: null };
  }
}

/**
 * Declarative server-side SSR route guard helper.
 * Returns a 302 HTTP Response redirect if the authenticated user lacks permissions,
 * or null if access is authorized.
 */
export async function requireAuthServer(
  request: Request,
  options?: RequireAuthOptions
): Promise<Response | null> {
  const { user, permissions } = await getAuthServer(request);
  if (!user) return null;

  const isSuperAdmin = user.role === "super_admin";
  const isAdmin = user.role === "admin" || isSuperAdmin;

  let hasAccess = true;

  if (options?.requireSuperAdmin && !isSuperAdmin) {
    hasAccess = false;
  } else if (options?.requireAdmin && !isAdmin) {
    hasAccess = false;
  } else if (options?.collectionRead) {
    const col = options.collectionRead;
    if (col === "settings" && !isAdmin) {
      hasAccess = false;
    } else if (col !== "settings") {
      const canRead = isAdmin || permissions?.collections?.[col]?.read === true;
      if (!canRead) hasAccess = false;
    }
  } else if (options?.collectionCreate) {
    const col = options.collectionCreate;
    if (col === "settings" && !isAdmin) {
      hasAccess = false;
    } else if (col !== "settings") {
      const canCreate = isAdmin || permissions?.collections?.[col]?.create === true;
      if (!canCreate) hasAccess = false;
    }
  }

  if (!hasAccess) {
    const url = new URL(request.url);
    const targetUrl = `${url.origin}${adminPath}/403`;
    return Response.redirect(targetUrl, 302);
  }

  return null;
}
