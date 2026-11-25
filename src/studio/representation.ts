/** Browser-safe composition policy shared by delivery and authoring. */
export const layoutBlockTypes = new Set(["section", "container", "row", "column", "grid", "spacer", "divider"]);
const wrappers = new Set(["section", "container", "row", "column", "grid"]);
const presentation = new Set([
  "layout",
  "style",
  "appearance",
  "design",
  "customCss",
  "cssClasses",
  "htmlId",
  "visibility",
]);
export function blockKind(value: any): string | undefined {
  return value && typeof value === "object"
    ? value.blockType ||
        (typeof value.type === "string" && (value.id || value.data || layoutBlockTypes.has(value.type))
          ? value.type
          : undefined)
    : undefined;
}
/** Pure projection. Never mutate the canonical document or media/reference values. */
export function contentRepresentation<T>(value: T): T {
  function visit(node: any): any {
    if (Array.isArray(node))
      return node.flatMap((item) => {
        const kind = blockKind(item);
        if (kind && wrappers.has(kind))
          return visit([
            ...(item.children || item.data?.children || []),
            ...(item.elements || item.data?.elements || []),
          ]);
        if (kind && layoutBlockTypes.has(kind)) return [];
        return [visit(item)];
      });
    if (!node || typeof node !== "object") return node;
    if (node instanceof Date) return new Date(node.getTime());
    if (typeof node.toJSON === "function") return visit(node.toJSON());
    const block = !!blockKind(node);
    return Object.fromEntries(
      Object.entries(node)
        .filter(
          ([key]) => !["__proto__", "constructor", "prototype"].includes(key) && !(block && presentation.has(key)),
        )
        .map(([key, val]) => {
          if (block && key === "data" && val && typeof val === "object") {
            return [key, visit(Object.fromEntries(Object.entries(val).filter(([name]) => !presentation.has(name))))];
          }
          return [key, visit(val)];
        }),
    );
  }
  return visit(value);
}
export function layoutSummary(value: any): {
  layouts: number;
  settings: number;
  blockTypes: Record<string, number>;
  settingNames: string[];
} {
  let layouts = 0,
    settings = 0;
  const blockTypes: Record<string, number> = {};
  const settingNames = new Set<string>();
  function visit(node: any) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (blockKind(node)) {
      if (layoutBlockTypes.has(blockKind(node)!)) {
        layouts++;
        const kind = blockKind(node)!;
        blockTypes[kind] = (blockTypes[kind] || 0) + 1;
      }
      for (const key of [...Object.keys(node), ...Object.keys(node.data || {})])
        if (presentation.has(key)) settingNames.add(key);
      settings += Object.keys(node).filter((key) => presentation.has(key)).length;
      if (node.data) settings += Object.keys(node.data).filter((key) => presentation.has(key)).length;
    }
    Object.values(node).forEach(visit);
  }
  visit(value);
  return { layouts, settings, blockTypes, settingNames: [...settingNames] };
}
/** Headless editing keeps saved layout nodes/settings frozen, while content remains editable. */
export function layoutSignature(value: any): string {
  const entries: any[] = [];
  function visit(node: any, path: string) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((item, i) => visit(item, `${path}.${blockKind(item) && item.id ? item.id : i}`));
      return;
    }
    const kind = blockKind(node);
    if (kind) {
      const visual = Object.fromEntries(Object.entries(node).filter(([key]) => presentation.has(key)));
      const dataVisual = Object.fromEntries(Object.entries(node.data || {}).filter(([key]) => presentation.has(key)));
      if (layoutBlockTypes.has(kind) || Object.keys(visual).length || Object.keys(dataVisual).length)
        entries.push([
          path,
          node.id,
          kind,
          visual,
          dataVisual,
          layoutBlockTypes.has(kind)
            ? Object.fromEntries(
                Object.entries(node.data || {}).filter(([key]) => !["children", "elements"].includes(key)),
              )
            : null,
          layoutBlockTypes.has(kind)
            ? Object.fromEntries(Object.entries(node).filter(([key]) => !["children", "data"].includes(key)))
            : null,
        ]);
    }
    Object.entries(node).forEach(([key, val]) => visit(val, `${path}.${key}`));
  }
  visit(value, "");
  const stable = (value: any): any =>
    Array.isArray(value)
      ? value.map(stable)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.keys(value)
              .sort()
              .map((key) => [key, stable(value[key])]),
          )
        : value;
  return JSON.stringify(stable(entries));
}
export function representationMode(enabled: boolean, requested?: string | null): "full" | "content" {
  if (requested && !["full", "content"].includes(requested)) throw new Error("Representation must be full or content");
  if (!enabled && requested === "full") throw new Error("Full layout output is unavailable while Studio is disabled");
  return requested === "content" || !enabled ? "content" : "full";
}

/** Remove visual choices from delivery schema while keeping the canonical registry intact. */
export function contentFields(fields: any[], insideBlock = false): any[] {
  return fields
    .filter((field) => !insideBlock || !presentation.has(field.name))
    .map((field) => ({
      ...field,
      ...(Array.isArray(field.fields) ? { fields: contentFields(field.fields, insideBlock) } : {}),
      ...(Array.isArray(field.tabs)
        ? { tabs: field.tabs.map((tab: any) => ({ ...tab, fields: contentFields(tab.fields || [], insideBlock) })) }
        : {}),
      ...(Array.isArray(field.blocks)
        ? {
            blocks: field.blocks
              .filter((block: any) => !layoutBlockTypes.has(block.slug))
              .map((block: any) => ({ ...block, fields: contentFields(block.fields || [], true) })),
          }
        : {}),
    }));
}
