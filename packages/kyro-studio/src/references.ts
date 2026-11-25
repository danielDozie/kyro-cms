import type { StudioBlock, StudioContext, StudioIssue } from "./types";
import { safeStudioUrl } from "./primitives";
export interface StudioReference {
  collection: string;
  id: string;
  path: string;
}
const mediaFields = new Set(["image", "backgroundImage", "backgroundVideo", "coverImage", "avatar", "companyLogo", "logo", "file"]);
export function collectStudioReferences(blocks: StudioBlock[]): StudioReference[] {
  const refs: StudioReference[] = [];
  const add = (value: any, collection: string, path: string) => {
    if (!value) return;
    if (value?.relationTo) collection = value.relationTo;
    value = value?.value ?? value;
    if (typeof value === "object" && (value.url || value.title || value.name || value.fields)) return;
    if (collection === "media" && typeof value === "string" && safeStudioUrl(value)) return;
    const id = typeof value === "string" ? value : value?.id;
    if (id) refs.push({ collection, id: String(id), path });
  };
  const walk = (value: any, path: string, depth = 0) => {
    if (depth > 20 || value == null) return;
    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, `${path}.${i}`, depth + 1));
      return;
    }
    if (typeof value !== "object") return;
    for (const [key, v] of Object.entries(value)) {
      const p = path ? `${path}.${key}` : key;
      if (mediaFields.has(key)) add(v, "media", p);
      else if (key === "form") add(v, "forms", p);
      else if (key === "selectedItems" && Array.isArray(v))
        v.forEach((item, i) => add(item, item?.relationTo || "*", `${p}.${i}`));
      else walk(v, p, depth + 1);
    }
  };
  blocks.forEach((b, i) => walk(b, String(i)));
  return refs;
}
export function getStudioReferenceIssues(blocks: StudioBlock[], context?: StudioContext): StudioIssue[] {
  return collectStudioReferences(blocks)
    .filter((ref) => !context?.references?.has(`${ref.collection}/${ref.id}`))
    .map((ref) => ({
      code: "unresolved-reference",
      path: ref.path,
      message: `Resolve ${ref.collection} reference ${ref.id} before publishing.`,
    }));
}
/** Runs on a frontend server or client. The caller supplies its authenticated API/SDK read. */
export async function resolveStudioReferences(
  blocks: StudioBlock[],
  fetchReference: (collection: string, id: string) => Promise<Record<string, any> | undefined>,
): Promise<Map<string, Record<string, any>>> {
  const pending = [
    ...new Map(collectStudioReferences(blocks).map((ref) => [`${ref.collection}/${ref.id}`, ref])).values(),
  ];
  const references = new Map<string, Record<string, any>>();
  // Bound concurrency; never put credentials in serialized page content.
  for (let start = 0; start < pending.length; start += 6)
    await Promise.all(
      pending.slice(start, start + 6).map(async (ref) => {
        if (ref.collection === "*") return;
        try {
          const doc = await fetchReference(ref.collection, ref.id);
          if (doc) references.set(`${ref.collection}/${ref.id}`, doc);
        } catch {
          /* Unresolved references are surfaced by preflight. */
        }
      }),
    );
  return references;
}
