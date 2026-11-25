import type { CollectionConfig, StudioConfig } from "../registry/types.js";
import type { Registry } from "../registry/index.js";
import type { StudioSiteCapabilities } from "./types.js";
import { sign, verify } from "hono/jwt";

export interface CapabilitiesOptions {
  registry: Registry;
  settings?: any;
  studioConfig?: StudioConfig;
  projectId?: string;
  host?: string;
  previewOrigin?: string;
}

export function getStudioSiteCapabilities(options: CapabilitiesOptions): StudioSiteCapabilities {
  const { registry, settings, studioConfig, projectId, host, previewOrigin } = options;

  const studioSettings = studioConfig || settings?.studio || {};
  const isEnabled = studioSettings.enabled === true;
  const siteSettings = settings?.site || {};
  const origin =
    previewOrigin ||
    studioSettings.previewOrigin ||
    siteSettings.siteUrl ||
    (host ? (host.startsWith("http") ? host : `http://${host}`) : "http://localhost:4321");

  // Collect all block types across all collections
  const blockTypeSet = new Set<string>();

  function scanFields(fields: any[]) {
    if (!Array.isArray(fields)) return;
    for (const field of fields) {
      if (field.type === "blocks" && Array.isArray(field.blocks)) {
        for (const b of field.blocks) {
          if (b && b.slug) {
            blockTypeSet.add(b.slug);
            if (Array.isArray(b.fields)) scanFields(b.fields);
          }
        }
      } else if (field.type === "tabs" && Array.isArray(field.tabs)) {
        for (const t of field.tabs) {
          if (Array.isArray(t.fields)) scanFields(t.fields);
        }
      } else if ((field.type === "group" || field.type === "row" || field.type === "collapsible") && Array.isArray(field.fields)) {
        scanFields(field.fields);
      }
    }
  }

  for (const collection of registry.getCollections()) {
    scanFields(collection.fields);
  }

  // Ensure default layout blocks are included
  ["section", "container", "row", "column", "grid", "spacer", "divider"].forEach((b) =>
    blockTypeSet.add(b)
  );

  return {
    enabled: isEnabled,
    siteId: siteSettings.siteName ? siteSettings.siteName.toLowerCase().replace(/[^a-z0-9]/g, "-") : "kyro-site",
    projectId: projectId || undefined,
    previewOrigin: origin,
    rendererRevision: studioSettings.rendererRevision || "1.0.0",
    blockTypes: Array.from(blockTypeSet).filter(type => isEnabled || !["section", "container", "row", "column", "grid", "spacer", "divider"].includes(type)).sort(),
    features: {
      forms: registry.hasCollection("forms"),
      liveDrafts: true,
    },
  };
}

export function resolvePagePublicUrl(
  doc: Record<string, any>,
  collection: CollectionConfig,
  siteSettings?: any
): string {
  const slug = String(doc.slug || doc.id || "").trim();

  // Handle Home / Index page routing
  if (slug === "home" || slug === "index" || !slug) {
    return "/";
  }

  // Pages collection standard routing
  if (collection.slug === "pages") {
    return `/${slug.replace(/^\//, "")}`;
  }

  // Default collection route
  return `/${collection.slug}/${slug.replace(/^\//, "")}`;
}

export async function resolvePagePreviewUrl(
  doc: Record<string, any>,
  collection: CollectionConfig,
  previewOrigin: string,
  token?: string,
  req?: Request
): Promise<string> {
  // If collection has custom admin.preview hook, call it
  if (typeof collection.admin?.preview === "function") {
    try {
      const customUrl = await collection.admin.preview(doc, { req: req as any, token });
      if (customUrl) return customUrl;
    } catch (e) {
      console.warn(`[Studio Preview] Custom preview function failed for ${collection.slug}:`, e);
    }
  }

  const publicPath = resolvePagePublicUrl(doc, collection);
  const base = previewOrigin.replace(/\/$/, "");
  const separator = publicPath.includes("?") ? "&" : "?";
  let previewUrl = `${base}${publicPath}${separator}draft=true`;

  if (token) {
    previewUrl += `&kyroToken=${encodeURIComponent(token)}`;
  }

  return previewUrl;
}

export async function createPreviewToken(
  collection: string,
  documentId: string,
  secret: string,
  expiresInSeconds: number = 900 // 15 minutes
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return sign(
    {
      type: "studio-preview",
      collection,
      id: documentId,
      exp,
    },
    secret,
    "HS256"
  );
}

export async function verifyPreviewToken(
  token: string,
  secret: string
): Promise<{ collection: string; id: string } | null> {
  try {
    const payload = await verify(token, secret, "HS256");
    if (payload && (payload.type === "studio-preview" || payload.type === "preview")) {
      return {
        collection: String(payload.collection),
        id: String(payload.id),
      };
    }
  } catch {
    // Invalid or expired token
  }
  return null;
}
