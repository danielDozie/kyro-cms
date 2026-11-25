import type { CollectionConfig, Field } from "@kyro-cms/core/client";

export interface StudioBlockField {
  field: Field & { blocks: any[] };
  path: string;
}
const unsafe = new Set(["__proto__", "prototype", "constructor"]);
export function getStudioValue(data: unknown, path: string): any {
  return path
    .split(".")
    .reduce<any>(
      (value, key) =>
        !unsafe.has(key) && value != null && Object.prototype.hasOwnProperty.call(value, key) ? value[key] : undefined,
      data,
    );
}
export function setStudioValue(data: any, path: string, value: unknown): any {
  const keys = path.split(".");
  if (keys.some((key) => !key || unsafe.has(key))) throw new Error("Invalid Studio field path");
  const update = (current: any, index: number): any => {
    const key = keys[index];
    const copy = Array.isArray(current) ? [...current] : { ...(current || {}) };
    copy[key as any] = index === keys.length - 1 ? value : update(current?.[key], index + 1);
    return copy;
  };
  return update(data, 0);
}
export function getStudioBlockField(collection: CollectionConfig): StudioBlockField | undefined {
  const settings = (collection.admin as { studio?: { enabled?: boolean; field: string } } | undefined)?.studio;
  if (!settings || settings.enabled === false) return;
  const target = settings.field;
  function visit(fields: any[], prefix = ""): StudioBlockField | undefined {
    for (const field of fields || []) {
      if (field.hidden || field.admin?.hidden) continue;
      const path = field.name ? `${prefix}${field.name}` : prefix.replace(/\.$/, "");
      if (field.type === "blocks" && path === target) return { field, path };
      if (field.type === "tabs") {
        for (const tab of field.tabs || []) {
          const found = visit(tab.fields, tab.name ? `${prefix}${tab.name}.` : prefix);
          if (found) return found;
        }
      } else if (["row", "collapsible", "group"].includes(field.type)) {
        const found = visit(field.fields, field.type === "group" && field.name ? `${path}.` : prefix);
        if (found) return found;
      }
    }
  }
  return visit(collection.fields);
}
/** Explicitly enabled page composition, rather than every rich-text collection. */
export function isStudioCollection(collection: CollectionConfig): boolean {
  const drafts =
    typeof collection.versions === "object" && (collection.versions as { drafts?: boolean }).drafts === true;
  return (
    drafts &&
    !collection.auth &&
    collection.slug !== "media" &&
    !collection.admin?.hidden &&
    !!getStudioBlockField(collection)
  );
}
export function studioCollectionUrl(adminPath: string, collection: string): string {
  return `${adminPath}/studio?collection=${encodeURIComponent(collection)}`;
}
export function structuredCollectionUrl(adminPath: string, collection: string): string {
  return `${adminPath}/${encodeURIComponent(collection)}?view=structured`;
}
export function studioDocumentTitle(collection: CollectionConfig, doc: Record<string, unknown>): string {
  const titleField = typeof collection.admin?.useAsTitle === "string" ? collection.admin.useAsTitle : "title";
  const value = getStudioValue(doc, titleField) || doc.title || doc.name || doc.slug;
  return typeof value === "string" || typeof value === "number" ? String(value) : "Untitled";
}
export function identifyStudioBlocks(blocks: any[], createId: () => string): any[] {
  const seen = new Set<string>();
  const visit = (nodes: any[]): any[] =>
    nodes.map((block) => {
      let id = typeof block.id === "string" && block.id && !seen.has(block.id) ? block.id : createId();
      while (seen.has(id)) id = createId();
      seen.add(id);
      const next = { ...block, id };
      for (const key of ["children", "elements"]) if (Array.isArray(block[key])) next[key] = visit(block[key]);
      return next;
    });
  return visit(blocks);
}
export function reorderStudioBlocks<T>(blocks: T[], index: number, destination: number): T[] {
  if (index < 0 || destination < 0 || index >= blocks.length || destination >= blocks.length) return blocks;
  const result = [...blocks];
  const [block] = result.splice(index, 1);
  result.splice(destination, 0, block);
  return result;
}

export interface StudioTreeNode {
  block: any;
  path: string;
  parent: string;
  index: number;
  depth: number;
}
export function flattenStudioTree(blocks: any[], parent = "", depth = 0): StudioTreeNode[] {
  if (depth > 12) return [];
  return blocks.flatMap((block, index) => {
    const path = parent ? `${parent}.${index}` : String(index);
    return [
      { block, path, parent, index, depth },
      ...(["children", "elements"] as const).flatMap((key) =>
        Array.isArray(block[key]) ? flattenStudioTree(block[key], `${path}.${key}`, depth + 1) : [],
      ),
    ];
  });
}
export function getStudioNodeSchema(schemas: any[], blocks: any[], path: string): any {
  const keys = path.split(".");
  let candidates = schemas;
  let nodes = blocks;
  let schema: any;
  for (let i = 0; i < keys.length; i += 2) {
    const node = nodes?.[Number(keys[i])];
    if (!node) return;
    schema = candidates?.find((s: any) => s.slug === node.blockType);
    if (i + 1 < keys.length) {
      const field = schema?.fields?.find((f: any) => f.name === keys[i + 1]);
      candidates = field?.blocks;
      nodes = node[keys[i + 1]];
    }
  }
  return schema;
}
export function replaceStudioSiblings(blocks: any[], parent: string, next: any[]): any[] {
  return parent ? setStudioValue(blocks, parent, next) : next;
}
export function omitStudioCompositionFields(fields: any[], path: string): any[] {
  const [head, ...tail] = path.split(".");
  return fields.flatMap((field) => {
    if (field.type === "tabs")
      return [
        {
          ...field,
          tabs: (field.tabs || []).map((tab: any) => ({
            ...tab,
            fields:
              tab.name === head
                ? omitStudioCompositionFields(tab.fields || [], tail.join("."))
                : !tab.name
                  ? omitStudioCompositionFields(tab.fields || [], path)
                  : tab.fields,
          })),
        },
      ];
    if (field.name === head) {
      if (!tail.length) return [];
      if (field.fields) return [{ ...field, fields: omitStudioCompositionFields(field.fields, tail.join(".")) }];
    }
    if (["row", "collapsible"].includes(field.type))
      return [{ ...field, fields: omitStudioCompositionFields(field.fields || [], path) }];
    return [field];
  });
}
/** Move a node between valid containers. Callers validate the destination schema. */
export function moveStudioTreeNode(
  blocks: any[],
  sourcePath: string,
  destinationParent: string,
  beforeIndex?: number,
): { blocks: any[]; path?: string } {
  if (destinationParent === sourcePath || destinationParent.startsWith(`${sourcePath}.`)) return { blocks };
  const existing = flattenStudioTree(blocks).find((node) => node.path === sourcePath);
  if (!existing) return { blocks };
  blocks = identifyStudioBlocks(blocks, () => crypto.randomUUID());
  const source = flattenStudioTree(blocks).find((node) => node.path === sourcePath)!;
  const destinationOwner = destinationParent
    ? getStudioValue(blocks, destinationParent.replace(/\.(children|elements)$/, ""))
    : undefined;
  const destinationOwnerId = destinationOwner?.id;
  const sourceSiblings = source.parent ? getStudioValue(blocks, source.parent) : blocks;
  let next = replaceStudioSiblings(
    blocks,
    source.parent,
    sourceSiblings.filter((_: any, i: number) => i !== source.index),
  );
  let parent = destinationParent;
  if (destinationParent && destinationOwnerId) {
    const owner = flattenStudioTree(next).find((n) => n.block.id === destinationOwnerId);
    if (!owner) return { blocks };
    parent = `${owner.path}.${destinationParent.endsWith(".elements") ? "elements" : "children"}`;
  }
  const destination = parent ? getStudioValue(next, parent) || [] : next;
  let index = beforeIndex ?? destination.length;
  if (source.parent === destinationParent && source.index < index) index--;
  index = Math.max(0, Math.min(destination.length, index));
  const siblings = [...destination];
  siblings.splice(index, 0, source.block);
  next = replaceStudioSiblings(next, parent, siblings);
  return { blocks: next, path: parent ? `${parent}.${index}` : String(index) };
}
export function defaultsFromStudioSchema(fields: any[]): Record<string, any> {
  const result: Record<string, any> = {};
  for (const field of fields || []) {
    if (field.type === "tabs") {
      for (const tab of field.tabs || []) {
        const value = defaultsFromStudioSchema(tab.fields || []);
        if (tab.name) result[tab.name] = value;
        else Object.assign(result, value);
      }
      continue;
    }
    if (["row", "collapsible"].includes(field.type)) {
      Object.assign(result, defaultsFromStudioSchema(field.fields || []));
      continue;
    }
    if (!field.name) continue;
    if (field.defaultValue !== undefined && typeof field.defaultValue !== "function")
      result[field.name] = structuredClone(field.defaultValue);
    else if (field.type === "group") result[field.name] = defaultsFromStudioSchema(field.fields || []);
    else if (field.type === "array" || field.type === "blocks") result[field.name] = [];
  }
  return result;
}
export function mergeStudioDefaults(base: Record<string, any>, overrides: Record<string, any>): Record<string, any> {
  const result = { ...base };
  for (const [key, value] of Object.entries(overrides))
    result[key] =
      value && typeof value === "object" && !Array.isArray(value)
        ? mergeStudioDefaults(base[key] || {}, value)
        : structuredClone(value);
  return result;
}
