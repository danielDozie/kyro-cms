export interface CodegenOptions {
  url: string;
  apiKey: string;
  output?: string;
  fetch?: typeof globalThis.fetch;
}

function capitalize(s: string): string {
  if (typeof s !== "string") return "";
  return s.replace(/[-_]\w/g, (m) => m[1].toUpperCase()).replace(/^\w/, (c) => c.toUpperCase());
}

function toTSName(slug: string): string {
  if (typeof slug !== "string") return "";
  return slug.replace(/[-_]\w/g, (m) => m[1].toUpperCase()).replace(/^_+/g, "");
}

function fieldToTS(field: any, depth = 0): string {
  const indent = "  ".repeat(depth + 1);
  if (field.type === "group" || field.type === "row" || field.type === "collapsible") {
    const fields = (field.fields ?? []).map((f: any) => fieldToTS(f, depth + 1)).join("\n");
    return `${indent}${field.name}: {\n${fields}\n${indent}}${field.required ? "" : " | null"};`;
  }
  if (field.type === "array") {
    const inner = (field.fields ?? []).map((f: any) => fieldToTS(f, depth + 2)).join("\n");
    return `${indent}${field.name}: Array<{\n${inner}\n${indent  }  }>;`;
  }
  if (field.type === "blocks") {
    const blockTypes = (field.blocks ?? []).map((b: any) => {
      const fields = b.fields.map((f: any) => fieldToTS(f, depth + 2)).join("\n");
      return `${indent}  { blockType: "${b.slug}";\n${fields}\n${indent}  }`;
    }).join(" |\n");
    return `${indent}${field.name}: Array<${blockTypes}>;\n`;
  }
  if (field.type === "tabs") {
    const all: string[] = [];
    for (const tab of field.tabs ?? []) {
      for (const f of tab.fields ?? []) {
        all.push(fieldToTS(f, depth));
      }
    }
    return all.join("\n");
  }
  if (field.type === "relationship") {
    const relType = field.hasMany ? `Array<${field.relationTo ? capitalize(field.relationTo) : "any"} | string>` : `${field.relationTo ? capitalize(field.relationTo) : "any"} | string`;
    return `${indent}${field.name}${field.required ? "" : "?"}: ${relType};`;
  }
  if (field.type === "upload") {
    const upType = field.hasMany ? "string[]" : "string";
    return `${indent}${field.name}${field.required ? "" : "?"}: ${upType};`;
  }
  if (field.type === "checkbox") {
    return `${indent}${field.name}${field.required ? "" : "?"}: boolean;`;
  }
  if (field.type === "number") {
    return `${indent}${field.name}${field.required ? "" : "?"}: number;`;
  }
  if (field.type === "date") {
    return `${indent}${field.name}${field.required ? "" : "?"}: string;`;
  }
  if (field.type === "select" || field.type === "radio") {
    if (field.hasMany && field.options) {
      return `${indent}${field.name}${field.required ? "" : "?"}: ${field.options.map((o: any) => `"${o.value}"`).join(" | ")}[];`;
    }
    if (field.options) {
      return `${indent}${field.name}${field.required ? "" : "?"}: ${field.options.map((o: any) => `"${o.value}"`).join(" | ")};`;
    }
    return `${indent}${field.name}${field.required ? "" : "?"}: string;`;
  }
  if (field.type === "code" || field.type === "json" || field.type === "richtext" || field.type === "markdown") {
    return `${indent}${field.name}${field.required ? "" : "?"}: any;`;
  }
  // text, textarea, email, password, url, color, secret
  return `${indent}${field.name}${field.required ? "" : "?"}: string;`;
}

function fieldsToInterface(name: string, fields: any[], depth = 0): string {
  const indent = "  ".repeat(depth);
  const body = fields.map((f) => fieldToTS(f, depth)).join("\n");
  return `${indent}export interface ${name} {\n${body}\n${indent}}`;
}

export function generateDTS(schema: any): string {
  const lines: string[] = [
    "// ============================================================================",
    "// Kyro CMS — Generated Type Definitions",
    "// Run: npx kyro-codegen --url <url> --api-key <key>",
    "// ============================================================================",
    "",
    "/* eslint-disable */",
    "/* @ts-nocheck */",
    "",
  ];

  // Per-collection doc types and input types
  const routerEntries: string[] = [];

  for (const [slug, col] of Object.entries<any>(schema.collections ?? {})) {
    const name = capitalize(toTSName(slug));
    const fields = col.fields ?? [];

    // Doc type
    lines.push(fieldsToInterface(name, fields));
    lines.push("");

    // Find input
    lines.push(`export interface ${name}FindInput {`);
    lines.push(`  where?: Record<string, any>;`);
    lines.push(`  sort?: string;`);
    lines.push(`  limit?: number;`);
    lines.push(`  page?: number;`);
    lines.push(`  depth?: number;`);
    lines.push(`  select?: string[];`);
    lines.push(`  draft?: boolean;`);
    lines.push(`}`);
    lines.push("");

    // Find output
    lines.push(`export interface ${name}FindOutput {`);
    lines.push(`  docs: ${name}[];`);
    lines.push(`  totalDocs: number;`);
    lines.push(`  limit: number;`);
    lines.push(`  totalPages: number;`);
    lines.push(`  page: number;`);
    lines.push(`  pagingCounter: number;`);
    lines.push(`  hasPrevPage: boolean;`);
    lines.push(`  hasNextPage: boolean;`);
    lines.push(`  prevPage: number | null;`);
    lines.push(`  nextPage: number | null;`);
    lines.push(`}`);
    lines.push("");

    // FindByID input
    lines.push(`export interface ${name}FindByIDInput {`);
    lines.push(`  id: string;`);
    lines.push(`  depth?: number;`);
    lines.push(`  select?: string[];`);
    lines.push(`  draft?: boolean;`);
    lines.push(`}`);
    lines.push("");

    // Create input
    lines.push(`export interface ${name}CreateInput {`);
    lines.push(`  data: Partial<${name}>;`);
    lines.push(`  depth?: number;`);
    lines.push(`  select?: string[];`);
    lines.push(`}`);
    lines.push("");

    // Update input
    lines.push(`export interface ${name}UpdateInput {`);
    lines.push(`  id: string;`);
    lines.push(`  data: Partial<${name}>;`);
    lines.push(`  depth?: number;`);
    lines.push(`  select?: string[];`);
    lines.push(`  baseUpdatedAt?: string;`);
    lines.push(`}`);
    lines.push("");

    // Delete input
    lines.push(`export interface ${name}DeleteInput {`);
    lines.push(`  id: string;`);
    lines.push(`}`);
    lines.push("");

    // Count input
    lines.push(`export interface ${name}CountInput {`);
    lines.push(`  where?: Record<string, any>;`);
    lines.push(`}`);
    lines.push("");

    // Router entry
    routerEntries.push(`    "${slug}": {`);
    routerEntries.push(`      find: { input: ${name}FindInput; output: ${name}FindOutput };`);
    routerEntries.push(`      findByID: { input: ${name}FindByIDInput; output: ${name} };`);
    routerEntries.push(`      create: { input: ${name}CreateInput; output: { doc: ${name} } };`);
    routerEntries.push(`      update: { input: ${name}UpdateInput; output: { doc: ${name} } };`);
    routerEntries.push(`      delete: { input: ${name}DeleteInput; output: { doc: ${name}; message: string } };`);
    routerEntries.push(`      count: { input: ${name}CountInput; output: { totalDocs: number } };`);
    routerEntries.push(`    };`);
  }

  // Global types
  for (const [slug, global] of Object.entries<any>(schema.globals ?? {})) {
    const name = `${capitalize(toTSName(slug))}Global`;
    const fields = global.fields ?? [];
    lines.push(fieldsToInterface(name, fields));
    lines.push("");

    routerEntries.push(`    "_globals_${slug}": {`);
    routerEntries.push(`      get: { input?: { depth?: number; draft?: boolean; select?: string[] }; output: ${name} };`);
    routerEntries.push(`      update: { input: { data: Partial<${name}> }; output: ${name} };`);
    routerEntries.push(`    };`);
  }

  // KyroAppRouter
  lines.push("export interface KyroAppRouter extends Record<string, unknown> {");
  lines.push(routerEntries.join("\n"));
  lines.push("}");
  lines.push("");

  return lines.join("\n");
}
