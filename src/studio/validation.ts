import { layoutSignature } from "./representation.js";
import type { CollectionConfig } from "../registry/types.js";
import type { Field, Block } from "../fields/types.js";
import type { StudioValidationIssue, StudioValidateOptions } from "./types.js";
import { ApiError } from "../utils/errors.js";
import { randomUUID } from "crypto";

const MAX_DEPTH_LIMIT = 16;
const MAX_NODES_LIMIT = 500;
const MAX_ARRAY_SIZE = 100;
const MAX_TEXT_LENGTH = 500000;

const SAFE_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const BOUNDED_LAYOUT = {
  width: new Set(["narrow", "content", "wide", "full"]),
  padding: new Set(["none", "small", "medium", "large"]),
  gap: new Set(["none", "small", "medium", "large"]),
  background: new Set(["white", "muted", "peach", "dark", "transparent"]),
  align: new Set(["start", "center", "end", "stretch"]),
  justify: new Set(["start", "center", "end", "between", "space-between"]),
};

// Finite layout grammar allowed children
const LAYOUT_GRAMMAR: Record<string, string[]> = {
  section: ["container", "row", "grid", "content", "spacer", "divider"],
  container: ["row", "grid", "content", "spacer", "divider"],
  row: ["column"],
  column: ["content", "spacer", "divider"],
  grid: ["column", "content", "spacer", "divider"],
};

function normalizeReferenceValues(target: any, fields: Field[]): void {
  if (!target || typeof target !== "object") return;
  for (const field of fields) {
    if (!field.name && field.type !== "row" && field.type !== "collapsible" && field.type !== "tabs") continue;

    if (field.type === "relationship" || field.type === "upload") {
      const val = target[field.name!];
      if (val === undefined || val === null) continue;
      const isPoly = Array.isArray((field as any).relationTo);
      if (isPoly) {
        if (Array.isArray(val)) {
          target[field.name!] = val.map((v) =>
            typeof v === "object" && v
              ? {
                  relationTo: v.relationTo,
                  value: v.value ?? v.id,
                  ...(v.metadata && typeof v.metadata === "object" ? { metadata: v.metadata } : {})
                }
              : v
          );
        } else if (typeof val === "object" && val) {
          target[field.name!] = {
            relationTo: val.relationTo,
            value: val.value ?? val.id,
            ...(val.metadata && typeof val.metadata === "object" ? { metadata: val.metadata } : {})
          };
        }
      } else {
        if (Array.isArray(val)) {
          target[field.name!] = val.map((v) => {
            if (typeof v === "object" && v) {
              const id = v.id ?? v.value;
              if (v.metadata && typeof v.metadata === "object" && Object.keys(v.metadata).length > 0) {
                return { id, metadata: v.metadata };
              }
              return id;
            }
            return v;
          });
        } else if (typeof val === "object" && val) {
          const id = val.id ?? val.value;
          if (val.metadata && typeof val.metadata === "object" && Object.keys(val.metadata).length > 0) {
            target[field.name!] = { id, metadata: val.metadata };
          } else {
            target[field.name!] = id;
          }
        }
      }
    } else if (field.type === "group" || field.type === "collapsible" || field.type === "row") {
      const groupData = field.name ? target[field.name] : target;
      if (groupData && typeof groupData === "object") {
        normalizeReferenceValues(groupData, (field as any).fields || []);
      }
    } else if (field.type === "tabs" && (field as any).tabs) {
      const tabData = field.name ? target[field.name] : target;
      if (tabData && typeof tabData === "object") {
        for (const tab of (field as any).tabs) {
          normalizeReferenceValues(tabData, tab.fields || []);
        }
      }
    } else if (field.type === "array" && field.name && Array.isArray(target[field.name])) {
      for (const item of target[field.name]) {
        if (item && typeof item === "object") {
          normalizeReferenceValues(item, (field as any).fields || []);
        }
      }
    }
  }
}

function isLayoutType(type: string): boolean {
  return ["section", "container", "row", "column", "grid"].includes(type);
}

export function isStudioCollection(collection: CollectionConfig): boolean {
  const studio = collection.admin?.studio;
  if (!studio) return false;
  if (typeof studio === "boolean") return studio;
  return studio.enabled !== false;
}

function getCompositionField(collection: CollectionConfig): { name: string; field: Field } | null {
  if (!isStudioCollection(collection)) {
    return null;
  }
  const targetFieldName =
    typeof collection.admin?.studio === "object" && collection.admin?.studio?.field
      ? collection.admin.studio.field
      : "content";

  function findField(fields: Field[]): { name: string; field: Field } | null {
    for (const f of fields) {
      if (f.name === targetFieldName && f.type === "blocks") {
        return { name: f.name, field: f };
      }
      if (f.type === "tabs" && (f as any).tabs) {
        for (const tab of (f as any).tabs) {
          const found = findField(tab.fields || []);
          if (found) return found;
        }
      }
      if ((f.type === "group" || f.type === "row" || f.type === "collapsible") && (f as any).fields) {
        const found = findField((f as any).fields);
        if (found) return found;
      }
    }
    return null;
  }

  return findField(collection.fields);
}

function collectAllKnownBlocks(blocksField: Field): Map<string, Block> {
  const map = new Map<string, Block>();
  const blocks = (blocksField as any).blocks || [];

  function registerBlock(b: Block) {
    if (!b || !b.slug || map.has(b.slug)) return;
    map.set(b.slug, b);
    for (const f of b.fields || []) {
      if (f.type === "blocks" && Array.isArray((f as any).blocks)) {
        for (const childBlock of (f as any).blocks) {
          registerBlock(childBlock);
        }
      }
    }
  }

  for (const b of blocks) {
    registerBlock(b);
  }
  return map;
}

export function validateStudioDocument(
  doc: Record<string, any>,
  collection: CollectionConfig,
  options: StudioValidateOptions = {}
): { valid: boolean; issues: StudioValidationIssue[]; sanitizedDoc: Record<string, any> } {
  const issues: StudioValidationIssue[] = [];
  const sanitizedDoc = { ...doc };
  // Ensure non-schema HTML and duplicate studio fields are never stored in the canonical document
  delete sanitizedDoc.studioContent;
  delete sanitizedDoc.savedHtml;
  delete sanitizedDoc.__html;

  const isPublish = options.isPublish === true || doc.status === "published";
  const maxDepth = options.maxDepth || MAX_DEPTH_LIMIT;
  const maxNodes = options.maxNodes || MAX_NODES_LIMIT;

  // Normalize top-level references and upload fields while preserving placement metadata and string IDs
  normalizeReferenceValues(sanitizedDoc, collection.fields);

  const composition = getCompositionField(collection);
  if (!composition) {
    return { valid: true, issues: [], sanitizedDoc };
  }

  const fieldName = composition.name;
  const blocksField = composition.field;
  const knownBlocks = collectAllKnownBlocks(blocksField);
  const seenIds = new Set<string>();
  let totalNodeCount = 0;

  const rawBlocks = doc[fieldName];
  if (!rawBlocks) {
    return { valid: true, issues: [], sanitizedDoc };
  }

  if (!Array.isArray(rawBlocks)) {
    issues.push({
      code: "invalid-nesting",
      path: fieldName,
      message: `Field "${fieldName}" must be an array of blocks`,
    });
    return { valid: false, issues, sanitizedDoc };
  }

  // Security check: reject prototype keys on root doc
  for (const key of Object.keys(doc)) {
    if (FORBIDDEN_KEYS.has(key)) {
      issues.push({
        code: "prototype-pollution",
        path: key,
        message: `Forbidden object property "${key}" detected`,
      });
    }
  }

  function validateLayoutSettings(layout: any, path: string) {
    if (!layout || typeof layout !== "object") return;
    for (const [prop, val] of Object.entries(layout)) {
      if (typeof val === "string" && BOUNDED_LAYOUT[prop as keyof typeof BOUNDED_LAYOUT]) {
        if (!BOUNDED_LAYOUT[prop as keyof typeof BOUNDED_LAYOUT].has(val)) {
          issues.push({
            code: "invalid-layout-value",
            path: `${path}.layout.${prop}`,
            message: `Invalid layout ${prop} "${val}". Expected one of: ${Array.from(BOUNDED_LAYOUT[prop as keyof typeof BOUNDED_LAYOUT]).join(", ")}`,
          });
        }
      }
      if (prop === "columns") {
        const num = Number(val);
        if (isNaN(num) || num < 1 || num > 4) {
          issues.push({
            code: "invalid-layout-value",
            path: `${path}.layout.columns`,
            message: `Grid columns must be an integer between 1 and 4, got ${val}`,
          });
        }
      }
    }
  }

  function validateNode(
    block: any,
    path: string,
    depth: number,
    parentType?: string
  ): any {
    totalNodeCount++;
    if (totalNodeCount > maxNodes) {
      issues.push({
        code: "max-nodes-exceeded",
        path,
        message: `Total node count exceeds limit of ${maxNodes}`,
      });
      return block;
    }

    if (depth > maxDepth) {
      issues.push({
        code: "max-depth-exceeded",
        path,
        message: `Layout nesting exceeds the maximum supported depth of ${maxDepth}`,
      });
      return block;
    }

    if (!block || typeof block !== "object") {
      issues.push({
        code: "invalid-nesting",
        path,
        message: `Block at ${path} must be an object`,
      });
      return block;
    }

    // Security check: Prototype pollution
    for (const key of Object.keys(block)) {
      if (FORBIDDEN_KEYS.has(key)) {
        issues.push({
          code: "prototype-pollution",
          path: `${path}.${key}`,
          message: `Forbidden property "${key}" detected`,
        });
      }
    }

    const blockType = block.blockType || block.type;
    if (!blockType || typeof blockType !== "string") {
      issues.push({
        code: "unknown-block",
        path,
        message: `Block at ${path} is missing a valid blockType`,
      });
      return block;
    }

    const clonedBlock = { ...block, blockType };

    // Validate or assign stable ID
    if (clonedBlock.id) {
      if (typeof clonedBlock.id !== "string" || !SAFE_ID_REGEX.test(clonedBlock.id) || clonedBlock.id.length > 64) {
        issues.push({
          code: "invalid-id",
          path: `${path}.id`,
          message: `Block ID "${clonedBlock.id}" is malformed. Must be alphanumeric with dashes or underscores up to 64 chars.`,
        });
      } else if (seenIds.has(clonedBlock.id)) {
        // Duplicate ID detected
        if (isPublish) {
          issues.push({
            code: "invalid-id",
            path: `${path}.id`,
            message: `Duplicate block ID "${clonedBlock.id}" detected at ${path}`,
          });
        } else {
          // In draft, generate a fresh stable UUID to resolve collision cleanly
          clonedBlock.id = randomUUID();
          seenIds.add(clonedBlock.id);
        }
      } else {
        seenIds.add(clonedBlock.id);
      }
    } else {
      // Assign stable UUID if missing
      clonedBlock.id = randomUUID();
      seenIds.add(clonedBlock.id);
    }

    // Check finite layout grammar
    if (parentType) {
      const allowedGrammar = LAYOUT_GRAMMAR[parentType];
      if (allowedGrammar) {
        const isChildLayout = isLayoutType(blockType);
        const matchesGrammar = isChildLayout
          ? allowedGrammar.includes(blockType)
          : allowedGrammar.includes("content") || allowedGrammar.includes(blockType);

        if (!matchesGrammar) {
          issues.push({
            code: "invalid-nesting",
            path,
            message: `"${blockType}" is not allowed inside "${parentType}"`,
          });
        }
      }
    }

    // Check block schema recognition
    const blockDef = knownBlocks.get(blockType);
    if (!blockDef) {
      if (isPublish) {
        issues.push({
          code: "unknown-block",
          path,
          message: `Unrecognized block type "${blockType}" cannot be published`,
        });
      }
    } else {
      // Validate fields inside block
      if (isPublish && blockDef.fields) {
        for (const field of blockDef.fields) {
          if (!field.name) continue;
          const val = clonedBlock[field.name];

          if (field.required && (val === undefined || val === null || val === "")) {
            issues.push({
              code: "required-field-missing",
              path: `${path}.${field.name}`,
              message: `Field "${field.name}" in block "${blockType}" is required`,
            });
          }

          if (field.type === "text" || field.type === "textarea") {
            if (typeof val === "string" && val.length > MAX_TEXT_LENGTH) {
              issues.push({
                code: "max-length-exceeded",
                path: `${path}.${field.name}`,
                message: `Text in "${field.name}" exceeds max length of ${MAX_TEXT_LENGTH} chars`,
              });
            }
          }

          if (field.type === "array" && Array.isArray(val)) {
            if (val.length > MAX_ARRAY_SIZE) {
              issues.push({
                code: "max-nodes-exceeded",
                path: `${path}.${field.name}`,
                message: `Array "${field.name}" exceeds max size of ${MAX_ARRAY_SIZE} items`,
              });
            }
          }
        }
      }

      // Check formEmbed block
      if (blockType === "formEmbed") {
        const formRef = clonedBlock.form;
        const formId = typeof formRef === "object" && formRef ? formRef?.id || formRef?.value : formRef;
        if (!formId && isPublish) {
          issues.push({
            code: "required-field-missing",
            path: `${path}.form`,
            message: `Form reference is required for formEmbed block`,
          });
        }
        if (formId) {
          clonedBlock.form = formId;
        }
      }

      // Normalize populated reference objects back to scalar IDs or { relationTo, value }
      if (blockDef.fields) {
        normalizeReferenceValues(clonedBlock, blockDef.fields);
      }

      // Check spacer block bounds
      if (blockType === "spacer") {
        const size = Number(clonedBlock.size ?? 32);
        if (isNaN(size) || size < 0 || size > 240) {
          issues.push({
            code: "invalid-layout-value",
            path: `${path}.size`,
            message: `Spacer size must be between 0 and 240px, got ${clonedBlock.size}`,
          });
        }
      }
    }

    // Validate layout properties
    if (clonedBlock.layout) {
      validateLayoutSettings(clonedBlock.layout, path);
    }

    // Recursively walk children
    if (Array.isArray(clonedBlock.children)) {
      if (clonedBlock.children.length > MAX_ARRAY_SIZE) {
        issues.push({
          code: "max-nodes-exceeded",
          path: `${path}.children`,
          message: `Children array exceeds max size of ${MAX_ARRAY_SIZE}`,
        });
      }
      clonedBlock.children = clonedBlock.children.map((child: any, idx: number) =>
        validateNode(child, `${path}.children.${idx}`, depth + 1, blockType)
      );
    }

    // Recursively walk elements
    if (Array.isArray(clonedBlock.elements)) {
      if (clonedBlock.elements.length > MAX_ARRAY_SIZE) {
        issues.push({
          code: "max-nodes-exceeded",
          path: `${path}.elements`,
          message: `Elements array exceeds max size of ${MAX_ARRAY_SIZE}`,
        });
      }
      clonedBlock.elements = clonedBlock.elements.map((elem: any, idx: number) =>
        validateNode(elem, `${path}.elements.${idx}`, depth + 1, blockType)
      );
    }

    return clonedBlock;
  }

  // Walk root blocks
  sanitizedDoc[fieldName] = rawBlocks.map((b: any, index: number) =>
    validateNode(b, `${fieldName}.${index}`, 1, undefined)
  );

  // Field readOnly and access restrictions enforcement
  const SYSTEM_LIFECYCLE_FIELDS = new Set(["id", "status", "updatedAt", "createdAt", "_version", "_hasUnpublishedChanges"]);
  if (options.originalDoc) {
    for (const f of collection.fields) {
      if (!f.name || SYSTEM_LIFECYCLE_FIELDS.has(f.name)) continue;
      const isReadOnly = (f as any).readOnly === true || f.admin?.readOnly === true;
      if (isReadOnly && doc[f.name] !== undefined) {
        const originalVal = options.originalDoc[f.name];
        const newVal = doc[f.name];
        if (JSON.stringify(originalVal) !== JSON.stringify(newVal)) {
          // If user is not super_admin / admin or if field is immutable:
          const userRole = options.user?.role;
          if (userRole !== "admin" && userRole !== "super_admin") {
            issues.push({
              code: "read-only-mutation",
              path: f.name,
              message: `Field "${f.name}" is read-only and cannot be modified`,
            });
            // Revert field to original
            sanitizedDoc[f.name] = originalVal;
          }
        }
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    sanitizedDoc,
  };
}

export function enforceStudioValidation(
  doc: Record<string, any>,
  collection: CollectionConfig,
  options: StudioValidateOptions = {}
): Record<string, any> {
  if (options.studioEnabled === false) {
    const merged = { ...(options.originalDoc || {}), ...doc };
    if (layoutSignature(merged) !== layoutSignature(options.originalDoc || {})) {
      throw new ApiError(400, "Layout authoring is disabled. Enable Studio, or use Convert to content only to remove saved layouts.");
    }
  }
  const result = validateStudioDocument(doc, collection, options);
  if (options.studioEnabled === false && layoutSignature({ ...(options.originalDoc || {}), ...result.sanitizedDoc }) !== layoutSignature(options.originalDoc || {})) {
    throw new ApiError(400, "Layout authoring is disabled. Enable Studio, or convert this document to content only.");
  }
  if (!result.valid) {
    const firstIssue = result.issues[0];
    throw new ApiError(400, `Validation failed at ${firstIssue.path}: ${firstIssue.message}`, {
      code: "STUDIO_VALIDATION_ERROR",
      issues: result.issues,
    });
  }
  return result.sanitizedDoc;
}
