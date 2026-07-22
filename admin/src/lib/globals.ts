import type { BaseAdapter } from "../../../src/registry/types.js";

export interface GlobalOptions {
  draft?: boolean;
  /** Astro request object — used to pass auth cookies to the API endpoint */
  request?: Request;
}

/**
 * Fetches a global document by its slug.
 * Uses the API endpoint when an Astro request is provided (works for all dialects),
 * falling back to the direct adapter approach.
 */
export async function getGlobal(slug: string, options?: GlobalOptions) {
  const draft = options?.draft ?? !!options?.request;

  // Strategy 1: Direct adapter access via shared kyro instance (SSR context)
  // This avoids HTTP round-trips and auth cookie forwarding issues
  const kyroInstance = (globalThis as any).__KYRO_INSTANCE__;
  if (kyroInstance?.db) {
    try {
      const db = kyroInstance.db as BaseAdapter;
      const doc = await db.findOne({
        collection: `_globals_${slug}`,
        where: {},
        draft,
      });
      if (!doc) return null;

      const mediaFields = [
        { path: ["siteFavicon"] },
        { path: ["favicon"] },
        { path: ["identity", "primaryLogo"] },
        { path: ["identity", "darkLogo"] }
      ];
      for (const field of mediaFields) {
        let parent = doc;
        let key = field.path[0];
        if (field.path.length > 1) {
          parent = doc[field.path[0]];
          key = field.path[1];
        }
        if (!parent) continue;

        const val = parent[key];
        const id = typeof val === "string" ? val : (val && typeof val === "object" && typeof val.id === "string" ? val.id : null);
        if (id) {
          try {
            const mediaDoc = await db.findByID({
              collection: "media",
              id,
            });
            if (mediaDoc) parent[key] = mediaDoc;
          } catch { /* media field stays as-is */ }
        }
      }
      return doc;
    } catch { /* fall through to API strategy */ }
  }

  // Strategy 2: Use the API endpoint (works for all dialects, adapter agnostic)
  if (options?.request) {
    try {
      const apiPath = (globalThis as any).__KYRO_API_PATH__ || "/api";
      const cookie = options.request.headers.get("cookie") || "";
      const res = await fetch(`${apiPath}/globals/${slug}${draft ? '?draft=true' : ''}`, {
        headers: { Cookie: cookie },
      });
      if (res.ok) {
        const json = await res.json();
        const doc = json.data || null;
        if (!doc) return null;
        // Resolve media fields via the same API endpoint
        const mediaFields = [
          { path: ["siteFavicon"] },
          { path: ["favicon"] },
          { path: ["identity", "primaryLogo"] },
          { path: ["identity", "darkLogo"] }
        ];
        for (const field of mediaFields) {
          let parent = doc;
          let key = field.path[0];
          if (field.path.length > 1) {
            parent = doc[field.path[0]];
            key = field.path[1];
          }
          if (!parent) continue;

          const val = parent[key];
          const id = typeof val === "string" ? val : (val && typeof val === "object" && typeof val.id === "string" ? val.id : null);
          if (id) {
            try {
              const mediaRes = await fetch(`${apiPath}/media/${id}`, {
                headers: { Cookie: cookie },
              });
              if (mediaRes.ok) {
                parent[key] = await mediaRes.json();
              }
            } catch { /* media field stays as-is */ }
          }
        }
        return doc;
      }
    } catch { /* fall through to legacy adapter */ }
  }

  // Strategy 3: Legacy direct adapter access (fallback for non-request contexts)
  const global = globalThis as any;
  const projectConfig = global.__KYRO_ADMIN_PROJECT_CONFIG__;
  if (!projectConfig) return null;

  const db = projectConfig.adapter as BaseAdapter | undefined;
  if (!db) return null;

  try {
    // Initialize adapter if needed (DrizzleAdapter needs schema/globals maps)
    if (typeof db.init === "function" && !global.__KYRO_ADAPTER_READY__) {
      await db.init(projectConfig.collections || [], projectConfig.globals || []);
      global.__KYRO_ADAPTER_READY__ = true;
    }
    const doc = await db.findOne({
      collection: `_globals_${slug}`,
      where: {},
      draft,
    });
    if (!doc) return null;

    const mediaFields = [
      { path: ["siteFavicon"] },
      { path: ["favicon"] },
      { path: ["identity", "primaryLogo"] },
      { path: ["identity", "darkLogo"] }
    ];
    for (const field of mediaFields) {
      let parent = doc;
      let key = field.path[0];
      if (field.path.length > 1) {
        parent = doc[field.path[0]];
        key = field.path[1];
      }
      if (!parent) continue;

      const val = parent[key];
      const id = typeof val === "string" ? val : (val && typeof val === "object" && typeof val.id === "string" ? val.id : null);
      if (id) {
        try {
          const mediaDoc = await db.findByID({
            collection: "media",
            id,
          });
          if (mediaDoc) parent[key] = mediaDoc;
        } catch { /* media field stays as-is */ }
      }
    }
    return doc;
  } catch { return null; }
}

/** Convenience helper to get the site settings. */
export async function getSiteSettings(options?: GlobalOptions) {
  return await getGlobal("site-settings", options);
}

/** Convenience helper to get the brand settings. */
export async function getBrandSettings(options?: GlobalOptions) {
  return await getGlobal("brand-settings", options);
}
