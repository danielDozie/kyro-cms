import type { BaseAdapter } from "../registry/types.js";
import type { Registry } from "../registry/index.js";
import { sanitizeDoc } from "../utils/sanitize.js";

export interface ReferenceIdentifier {
  collection: string;
  id: string;
}

export interface ResolveReferencesOptions {
  tenantId?: string;
  user?: any;
}

const PUBLIC_FORM_FIELDS = new Set([
  "id",
  "name",
  "slug",
  "subtitle",
  "submitButtonText",
  "consentCheckboxText",
  "redirectUrl",
  "fields",
  "createdAt",
  "updatedAt",
]);

export function sanitizePublicForm(form: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const key of Object.keys(form)) {
    if (PUBLIC_FORM_FIELDS.has(key)) {
      sanitized[key] = form[key];
    }
  }
  // Exclude entries and private notification/secret settings
  delete sanitized.entries;
  delete sanitized.webhooks;
  delete sanitized.notificationEmails;
  delete sanitized.secretKey;
  return sanitized;
}

export function formatMediaMetadata(media: Record<string, any>): Record<string, any> {
  const result = { ...media };
  // Ensure url, alt, and dimensions are accessible
  if (!result.url && result.filename) {
    result.url = `/uploads/${result.filename}`;
  }
  if (!result.alt && result.altText) {
    result.alt = result.altText;
  }
  return result;
}

export async function resolveStudioReferencesServer(
  registry: Registry,
  db: BaseAdapter,
  references: ReferenceIdentifier[],
  options: ResolveReferencesOptions = {}
): Promise<{ references: Record<string, Record<string, any>> }> {
  const { tenantId, user } = options;
  const resultMap: Record<string, Record<string, any>> = {};

  if (!Array.isArray(references) || references.length === 0) {
    return { references: resultMap };
  }

  // Deduplicate and group by collection
  const grouped = new Map<string, Set<string>>();
  for (const ref of references) {
    if (!ref || !ref.collection || !ref.id || ref.collection === "*") continue;
    if (!grouped.has(ref.collection)) {
      grouped.set(ref.collection, new Set());
    }
    grouped.get(ref.collection)!.add(String(ref.id));
  }

  // Bounded batch queries per collection
  for (const [collectionSlug, idSet] of grouped.entries()) {
    const collection = registry.getCollection(collectionSlug);
    if (!collection) continue;

    // Check read access if user provided
    if (user && collection.access?.read) {
      const allowed = typeof collection.access.read === "function"
        ? await collection.access.read({ req: undefined as any, user })
        : collection.access.read;
      if (!allowed) continue;
    }

    const idList = Array.from(idSet);
    if (idList.length === 0) continue;

    try {
      const batchResult = await db.find<Record<string, any>>({
        collection: collectionSlug,
        where: { id: { in: idList } },
        limit: idList.length,
        tenantId,
        draft: true,
      });

      const docs = batchResult?.docs || [];
      for (const rawDoc of docs) {
        if (!rawDoc || !rawDoc.id) continue;
        let sanitized = sanitizeDoc(rawDoc);

        if (collectionSlug === "forms") {
          sanitized = sanitizePublicForm(sanitized);
        } else if (collectionSlug === "media") {
          sanitized = formatMediaMetadata(sanitized);
        }

        resultMap[`${collectionSlug}/${rawDoc.id}`] = sanitized;
      }
    } catch {
      // Fallback to per-id lookup
      for (const id of idList) {
        try {
          const doc = await db.findByID({
            collection: collectionSlug,
            id,
            tenantId,
            draft: true,
          });
          if (doc) {
            let sanitized = sanitizeDoc(doc);
            if (collectionSlug === "forms") {
              sanitized = sanitizePublicForm(sanitized);
            } else if (collectionSlug === "media") {
              sanitized = formatMediaMetadata(sanitized);
            }
            resultMap[`${collectionSlug}/${id}`] = sanitized;
          }
        } catch {
          // Unresolved reference remains omitted
        }
      }
    }
  }

  return { references: resultMap };
}
