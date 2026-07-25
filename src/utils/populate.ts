import type { BaseAdapter } from "../registry/types.js";
import type { Registry } from "../registry/index.js";
import type { Field } from "../fields/types.js";
import { sanitizeDoc } from "./sanitize.js";

function extractRelValue(value: any): { id: string; relationTo?: string }[] {
  if (!value) return [];
  if (typeof value === "string") return [{ id: value }];
  if (Array.isArray(value)) {
    return value.map((v: any) => {
      if (typeof v === "object") {
         return { id: v.value ?? v.id ?? v, relationTo: v.relationTo };
      }
      return { id: v };
    });
  }
  if (typeof value === "object") {
    const id = value.value ?? value.id ?? value;
    if (typeof id === "string") return [{ id, relationTo: value.relationTo }];
    if (Array.isArray(id)) {
       return id.map(v => ({ id: v, relationTo: value.relationTo }));
    }
  }
  return [];
}

function collectReferences(data: any, fields: Field[], refsToFetch: Map<string, Set<string>>) {
  if (!data || typeof data !== "object") return;
  for (const field of fields) {
    if (!field.name && field.type !== "row" && field.type !== "collapsible" && field.type !== "tabs") continue;

    if (field.type === "relationship" || field.type === "upload") {
      const raw = data[field.name!];
      if (!raw) continue;
      const targetSlugs = Array.isArray(field.relationTo) ? field.relationTo : [field.relationTo];
      const items = extractRelValue(raw);
      for (const item of items) {
        if (!item.id) continue;
        const slugs = item.relationTo ? [item.relationTo] : targetSlugs;
        for (const slug of slugs) {
           if (slug === "*") continue;
           if (!refsToFetch.has(slug)) refsToFetch.set(slug, new Set());
           refsToFetch.get(slug)!.add(item.id);
        }
      }
    } else if (field.type === "group" || field.type === "collapsible" || field.type === "row") {
       const targetData = field.name ? data[field.name] : data;
       collectReferences(targetData, (field as any).fields || [], refsToFetch);
    } else if (field.type === "tabs" && (field as any).tabs) {
       const targetData = field.name ? data[field.name] : data;
       for (const tab of (field as any).tabs) {
         collectReferences(targetData, tab.fields || [], refsToFetch);
       }
    } else if (field.type === "array" && field.name && Array.isArray(data[field.name])) {
       for (const item of data[field.name]) {
         collectReferences(item, (field as any).fields || [], refsToFetch);
       }
    } else if (field.type === "blocks" && field.name && Array.isArray(data[field.name])) {
       for (const item of data[field.name]) {
          if (!item || typeof item !== "object") continue;
          const blockTypeStr = item.type || item.blockType;
          if (!blockTypeStr) continue;
          const blockDef = (field as any).blocks?.find((b: any) => b.slug === blockTypeStr);
          if (blockDef && Array.isArray(blockDef.fields)) {
            const targetData = item.data && typeof item.data === "object" ? item.data : item;
            collectReferences(targetData, blockDef.fields, refsToFetch);
          }
       }
    }
  }
}

function injectReferences(data: any, fields: Field[], fetchedDocs: Map<string, Map<string, any>>) {
  if (!data || typeof data !== "object") return;
  for (const field of fields) {
    if (!field.name && field.type !== "row" && field.type !== "collapsible" && field.type !== "tabs") continue;

    if (field.type === "relationship" || field.type === "upload") {
      const raw = data[field.name!];
      if (!raw) continue;
      
      const targetSlugs = Array.isArray(field.relationTo) ? field.relationTo : [field.relationTo];
      const setValue = (val: any) => { data[field.name!] = val; };
      
      const findDoc = (id: string, relTo?: string) => {
         const slugs = relTo ? [relTo] : targetSlugs;
         for (const slug of slugs) {
            const docMap = fetchedDocs.get(slug);
            if (docMap && docMap.has(id)) return docMap.get(id);
         }
         return null;
      };

      if (typeof raw === "string") {
        const doc = findDoc(raw);
        setValue(doc ? doc : { id: raw });
      } else if (Array.isArray(raw)) {
        setValue(raw.map((v: any) => {
          const id = typeof v === "object" ? (v.value ?? v.id) : v;
          const relTo = typeof v === "object" ? v.relationTo : undefined;
          const doc = findDoc(id, relTo);
          return doc ? doc : { id: id };
        }));
      } else if (typeof raw === "object") {
        const id = raw.value ?? raw.id;
        const relTo = raw.relationTo;
        const doc = findDoc(id, relTo);
        setValue(doc ? doc : { id });
      }
    } else if (field.type === "group" || field.type === "collapsible" || field.type === "row") {
       const targetData = field.name ? data[field.name] : data;
       injectReferences(targetData, (field as any).fields || [], fetchedDocs);
    } else if (field.type === "tabs" && (field as any).tabs) {
       const targetData = field.name ? data[field.name] : data;
       for (const tab of (field as any).tabs) {
         injectReferences(targetData, tab.fields || [], fetchedDocs);
       }
    } else if (field.type === "array" && field.name && Array.isArray(data[field.name])) {
       for (const item of data[field.name]) {
         injectReferences(item, (field as any).fields || [], fetchedDocs);
       }
    } else if (field.type === "blocks" && field.name && Array.isArray(data[field.name])) {
       for (const item of data[field.name]) {
          if (!item || typeof item !== "object") continue;
          const blockTypeStr = item.type || item.blockType;
          if (!blockTypeStr) continue;
          const blockDef = (field as any).blocks?.find((b: any) => b.slug === blockTypeStr);
          if (blockDef && Array.isArray(blockDef.fields)) {
            const targetData = item.data && typeof item.data === "object" ? item.data : item;
            injectReferences(targetData, blockDef.fields, fetchedDocs);
          }
       }
    }
  }
}

export async function populateRelationships(
  docs: any[],
  fields: Field[],
  db: BaseAdapter,
  registry: Registry,
  currentDepth: number = 1,
  maxDepth: number = 0
): Promise<void> {
  if (!docs || docs.length === 0) return;
  if (currentDepth > maxDepth) return;

  const refsToFetch = new Map<string, Set<string>>();
  for (const doc of docs) {
    collectReferences(doc, fields, refsToFetch);
  }

  if (refsToFetch.size === 0) return;

  const fetchedDocs = new Map<string, Map<string, any>>();
  
  // Array to hold all newly fetched documents for the next recursion layer
  const nextLayerDocsBySlug = new Map<string, any[]>();

  for (const [slug, idSet] of refsToFetch.entries()) {
    if (idSet.size === 0) continue;
    const targetCollection = registry.getCollection(slug);
    if (!targetCollection) continue;
    
    const docMap = new Map<string, any>();
    const idArr = Array.from(idSet);
    const newDocs: any[] = [];
    
    for (const id of idArr) {
      try {
        const relDoc = await db.findByID({ collection: slug, id, draft: true });
        if (relDoc) {
          docMap.set(id, relDoc);
          newDocs.push(relDoc);
        }
      } catch {
        // ignore
      }
    }
    
    fetchedDocs.set(slug, docMap);
    if (newDocs.length > 0) {
      nextLayerDocsBySlug.set(slug, newDocs);
    }
  }

  // If there's more depth to cover, recursively populate the fetched documents
  if (currentDepth < maxDepth) {
    for (const [slug, newDocs] of nextLayerDocsBySlug.entries()) {
      const targetCollection = registry.getCollection(slug);
      if (targetCollection) {
        await populateRelationships(newDocs, targetCollection.fields, db, registry, currentDepth + 1, maxDepth);
      }
    }
  }

  // Inject the fetched (and potentially populated) docs back into the parent docs
  for (let i = 0; i < docs.length; i++) {
    injectReferences(docs[i], fields, fetchedDocs);
    docs[i] = sanitizeDoc(docs[i]);
  }
}
