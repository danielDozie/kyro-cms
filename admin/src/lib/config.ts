import type { CollectionConfig, GlobalConfig } from "@kyro-cms/core/client";
import type { AdminConfig } from "./core-types";
import {
  blogCollections,
  ecommerceCollections,
  minimalCollections,
  starterCollections,
  kitchenSinkCollections,
  mediaCollections,
  authCollections,
  allSettingsGlobals,
  coreSettingsGlobals,
} from "@kyro-cms/core/templates";
import { projectConfig } from "virtual:kyro-plugins";
type ConfigCollectionInput =
  | CollectionConfig[]
  | Record<string, CollectionConfig>
  | undefined;
type ConfigGlobalInput =
  | GlobalConfig[]
  | Record<string, GlobalConfig>
  | undefined;

export type AdminTemplate = "minimal" | "starter" | "blog" | "ecommerce" | "kitchen-sink";

export function toArray<T>(input: T[] | Record<string, T> | undefined): T[] {
  if (!input) return [];
  return Array.isArray(input) ? input : Object.values(input);
}

export function toCollectionMap(
  collections: CollectionConfig[],
): Record<string, CollectionConfig> {
  return collections.reduce(
    (acc, c) => {
      if (c.slug) acc[c.slug] = c;
      return acc;
    },
    {} as Record<string, CollectionConfig>,
  );
}

export function toGlobalMap(globals: GlobalConfig[]): Record<string, GlobalConfig> {
  return globals.reduce(
    (acc, g) => {
      if (g.slug) acc[g.slug] = g;
      return acc;
    },
    {} as Record<string, GlobalConfig>,
  );
}

function addMissingCollections(
  target: CollectionConfig[],
  collections: CollectionConfig[],
) {
  const existing = new Set(target.map((collection) => collection.slug));
  for (const collection of collections) {
    if (!existing.has(collection.slug)) {
      target.push(collection);
      existing.add(collection.slug);
    }
  }
}

const defaultCollectionIcons: Record<string, string> = {
  pages: "FileText",
  posts: "Newspaper",
  categories: "Tags",
  menu: "Menu",
  products: "ShoppingBag",
  customers: "Users",
  orders: "ShoppingCart",
  coupons: "Ticket",
  forms: "FileInput",
  "form-entries": "Inbox",
};

/**
 * Recursively find and update a field by its dot-notation path.
 * Example: "menu.menu_item.internal_target" navigates through nested field structures.
 */
function updateFieldByPath(
  fields: any[],
  path: string,
  updates: Record<string, any>,
): boolean {
  const parts = path.split(".");
  if (parts.length === 0) return false;

  const currentPart = parts[0];
  const remainingPath = parts.slice(1).join(".");

  for (const field of fields) {
    if (field.name === currentPart) {
      if (remainingPath) {
        // Continue traversing nested fields
        if (field.fields && Array.isArray(field.fields)) {
          return updateFieldByPath(field.fields, remainingPath, updates);
        }

        // For tabs fields, traverse into all tabs
        if (field.type === "tabs" && field.tabs && Array.isArray(field.tabs)) {
          for (const tab of field.tabs) {
            if (tab.fields && Array.isArray(tab.fields)) {
              if (updateFieldByPath(tab.fields, remainingPath, updates)) {
                return true;
              }
            }
          }
          return false;
        }

        // For blocks fields, the next path segment is the block slug
        if (field.type === "blocks" && field.blocks && Array.isArray(field.blocks)) {
          const blockSlug = remainingPath.split(".")[0];
          const restOfPath = remainingPath.split(".").slice(1).join(".");
          if (!restOfPath) return false;

          for (const block of field.blocks) {
            if (block.slug === blockSlug && block.fields && Array.isArray(block.fields)) {
              return updateFieldByPath(block.fields, restOfPath, updates);
            }
          }
          return false;
        }

        // For array fields, look in the nested fields
        if (field.type === "array" && field.fields && Array.isArray(field.fields)) {
          return updateFieldByPath(field.fields, remainingPath, updates);
        }
        return false;
      } else {
        // Found the target field, apply updates
        Object.assign(field, updates);
        return true;
      }
    }
  }

  // Pass through structural flat wrappers (unnamed tabs, rows, collapsibles)
  for (const field of fields) {
    const isFlatStructuralField =
      !field.name ||
      field.type === "tabs" ||
      field.type === "row" ||
      field.type === "collapsible";

    if (isFlatStructuralField) {
      if (field.fields && Array.isArray(field.fields)) {
        if (updateFieldByPath(field.fields, path, updates)) return true;
      }
      if (field.type === "tabs" && field.tabs && Array.isArray(field.tabs)) {
        for (const tab of field.tabs) {
          if (tab.fields && Array.isArray(tab.fields)) {
            if (updateFieldByPath(tab.fields, path, updates)) return true;
          }
        }
      }
    }
  }

  // Target field does not exist in this container.
  // If there is no remaining path, this is the terminal target container — append the new field here!
  if (!remainingPath) {
    fields.push({
      name: currentPart,
      ...updates,
    });
    return true;
  }

  return false;
}

function applyCollectionAdminOverrides(
  collections: Record<string, CollectionConfig>,
  overrides?: Record<
    string,
    Partial<AdminConfig> & { fields?: Record<string, any> }
  >,
): void {
  for (const [slug, col] of Object.entries(collections)) {
    const defaultIcon = defaultCollectionIcons[slug];
    const override = overrides?.[slug];
    if (defaultIcon && !col.admin?.icon) {
      col.admin = { ...col.admin, icon: defaultIcon };
    }
    if (override) {
      const { fields: fieldOverrides, ...adminOverrides } = override;
      col.admin = { ...col.admin, ...adminOverrides };

      // Apply field-level overrides
      if (fieldOverrides && col.fields && Array.isArray(col.fields)) {
        for (const [fieldPath, fieldUpdates] of Object.entries(fieldOverrides)) {
          updateFieldByPath(col.fields, fieldPath, fieldUpdates);
        }
      }
    }
  }
}

export function getAdminConfig(template: AdminTemplate = "blog") {
  const collections: CollectionConfig[] = [];
  const globals: GlobalConfig[] = [];

  switch (template) {
    case "minimal":
      collections.push(...Object.values(minimalCollections));
      globals.push(...coreSettingsGlobals);
      break;
    case "starter":
      collections.push(...Object.values(starterCollections));
      globals.push(...coreSettingsGlobals);
      break;
    case "blog":
      collections.push(...Object.values(blogCollections));
      globals.push(...coreSettingsGlobals);
      break;
    case "ecommerce":
      collections.push(...Object.values(ecommerceCollections));
      globals.push(...allSettingsGlobals);
      break;
    case "kitchen-sink":
      collections.push(
        ...Object.values(minimalCollections),
        ...Object.values(starterCollections),
        ...Object.values(blogCollections),
        ...Object.values(ecommerceCollections),
        ...Object.values(kitchenSinkCollections),
      );
      globals.push(...allSettingsGlobals);
      break;
  }

  addMissingCollections(collections, Object.values(mediaCollections));
  addMissingCollections(collections, Object.values(authCollections));

  return {
    collections: toCollectionMap(collections),
    globals: toGlobalMap(globals),
  };
}

function createProjectAdminConfig(config: {
  collections?: ConfigCollectionInput;
  globals?: ConfigGlobalInput;
}) {
  const projectCollections = toArray(config.collections);
  const projectGlobals = toArray(config.globals);

  if (projectCollections.length === 0 && projectGlobals.length === 0) {
    return getAdminConfig("kitchen-sink");
  }

  const collections: CollectionConfig[] = [];
  addMissingCollections(collections, Object.values(mediaCollections));
  addMissingCollections(collections, Object.values(authCollections));
  addMissingCollections(collections, projectCollections);

  return {
    collections: toCollectionMap(collections),
    globals: toGlobalMap(projectGlobals),
  };
}

// Read config from the virtual module injected by our Vite plugin
function loadProjectConfig() {
  if (projectConfig) return projectConfig;
  return null;
}

const projectCfg = loadProjectConfig() || { collections: [], globals: [] };

const rawConfig = createProjectAdminConfig(projectCfg);
applyCollectionAdminOverrides(rawConfig.collections, (projectCfg.collectionOverrides as Record<string, any>) || {});

export const adminConfig = rawConfig;
export const collections = adminConfig.collections;
export const globals = adminConfig.globals;

export const authCollectionSlugs = ["users", "audit_logs"];
export const nonAuthCollections = Object.values(collections).filter(
  (c) => !authCollectionSlugs.includes(c.slug) && c.admin?.hidden !== true,
);
