import {
  type CollectionConfig,
  type GlobalConfig,
  applyCollectionOverrides,
  applyGlobalOverrides,
} from "@kyro-cms/core/client";
import type { AdminConfig } from "./core-types";
import {
  blogCollections,
  ecommerceCollections,
  minimalCollections,
  starterCollections,
  kitchenSinkCollections,
  mediaCollections,
  authCollections,
  allGlobalSettings,
  coreGlobalSettings,
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



function applyCollectionAdminOverrides(
  collections: Record<string, CollectionConfig>,
  overrides?: Record<string, any>,
): void {
  for (const [slug, col] of Object.entries(collections)) {
    const defaultIcon = defaultCollectionIcons[slug];
    if (defaultIcon && !col.admin?.icon) {
      col.admin = { ...col.admin, icon: defaultIcon };
    }
  }
  if (overrides) {
    applyCollectionOverrides(Object.values(collections), overrides);
  }
}

function applyGlobalAdminOverrides(
  globals: Record<string, GlobalConfig>,
  overrides?: Record<string, any>,
): void {
  if (overrides) {
    applyGlobalOverrides(Object.values(globals), overrides);
  }
}

export function getAdminConfig(template: AdminTemplate = "blog") {
  const collections: CollectionConfig[] = [];
  const globals: GlobalConfig[] = [];

  switch (template) {
    case "minimal":
      collections.push(...Object.values(minimalCollections));
      globals.push(...coreGlobalSettings);
      break;
    case "starter":
      collections.push(...Object.values(starterCollections));
      globals.push(...coreGlobalSettings);
      break;
    case "blog":
      collections.push(...Object.values(blogCollections));
      globals.push(...coreGlobalSettings);
      break;
    case "ecommerce":
      collections.push(...Object.values(ecommerceCollections));
      globals.push(...allGlobalSettings);
      break;
    case "kitchen-sink":
      collections.push(
        ...Object.values(minimalCollections),
        ...Object.values(starterCollections),
        ...Object.values(blogCollections),
        ...Object.values(ecommerceCollections),
        ...Object.values(kitchenSinkCollections),
      );
      globals.push(...allGlobalSettings);
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
applyGlobalAdminOverrides(rawConfig.globals, (projectCfg.globalOverrides as Record<string, any>) || {});

export const adminConfig = rawConfig;
export const collections = adminConfig.collections;
export const globals = adminConfig.globals;

export const authCollectionSlugs = ["users", "audit_logs"];
export const nonAuthCollections = Object.values(collections).filter(
  (c) => !authCollectionSlugs.includes(c.slug) && c.admin?.hidden !== true,
);
