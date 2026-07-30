import type { CollectionConfig, GlobalConfig } from "../registry/types.js";

import { minimalCollections } from "./minimal";
import { starterCollections } from "./starter";
import { blogCollections } from "./blog";
import { ecommerceCollections, ecommerceGlobals } from "./ecommerce";
import { kitchenSinkCollections } from "./kitchen-sink";
import { authCollections } from "./auth.js";
import { mediaCollections, mediaCollection } from "./media.js";
import { menuCollections, menuCollection } from "./menu.js";
import { postsCollections, postsCollection } from "./posts.js";
import { pageCollections, pageCollection } from "./pages.js";
import { categoriesCollections, categoriesCollection, productCategoriesCollections, productCategoriesCollection } from "./categories.js";
import { productsCollections, productsCollection } from "./products.js";
import { customersCollections, customersCollection } from "./customers.js";
import { ordersCollections, ordersCollection } from "./orders.js";
import { couponsCollections, couponsCollection } from "./coupons.js";
import { formsCollections, formsCollection } from "./forms.js";
import { formEntriesCollections, formEntriesCollection } from "./form-entries.js";
import { reviewsCollections, reviewsCollection } from "./reviews.js";
import { brandsCollections, brandsCollection } from "./brands.js";


export { minimalCollections } from "./minimal";
export { starterCollections } from "./starter";
export { blogCollections } from "./blog";
export { ecommerceCollections, ecommerceGlobals } from "./ecommerce";
export { kitchenSinkCollections } from "./kitchen-sink";
export { authCollections } from "./auth.js";

export {
  mediaCollections,
  mediaCollection,
} from "./media.js";
export { menuCollections, menuCollection } from "./menu.js";
export { postsCollections, postsCollection } from "./posts.js";
export { pageCollections, pageCollection } from "./pages.js";
export { categoriesCollections, categoriesCollection, productCategoriesCollections, productCategoriesCollection } from "./categories.js";
export { productsCollections, productsCollection } from "./products.js";
export { customersCollections, customersCollection } from "./customers.js";
export { ordersCollections, ordersCollection } from "./orders.js";
export { couponsCollections, couponsCollection } from "./coupons.js";
export { formsCollections, formsCollection } from "./forms.js";
export { formEntriesCollections, formEntriesCollection } from "./form-entries.js";
export { reviewsCollections, reviewsCollection } from "./reviews.js";
export { brandsCollections, brandsCollection } from "./brands.js";

export {
  allGlobalSettings,
  coreGlobalSettings,
  settingsBySlug,
  getSettingsForTemplate,
  siteSettingsGlobal,
  seoSettingsGlobal,
  brandSettingsGlobal,
  emailSettingsGlobal,
  storageSettingsGlobal,
  accessSettingsGlobal,
  storeSettingsGlobal,
  shippingSettingsGlobal,
  systemSettingsGlobal,
} from "./settings/index.js";



function deduplicateCollections(collections: CollectionConfig[]): CollectionConfig[] {
  const map = new Map<string, CollectionConfig>();
  for (const col of collections) {
    if (!map.has(col.slug)) {
      map.set(col.slug, col);
    }
  }
  return Array.from(map.values());
}

const baseCollections = [
  ...Object.values(postsCollections),
  ...Object.values(pageCollections),
  ...Object.values(categoriesCollections),
  ...Object.values(formsCollections),
  ...Object.values(formEntriesCollections),
];

const standardCollections = [
  ...baseCollections,
  ...mediaCollections,
  ...Object.values(authCollections),
  ...Object.values(menuCollections),
];

export const templateCollections = {
  minimal: deduplicateCollections([
    ...Object.values(minimalCollections),
    ...standardCollections,
  ]),
  starter: deduplicateCollections([
    ...Object.values(starterCollections),
    ...standardCollections,
  ]),
  blog: deduplicateCollections([
    ...Object.values(blogCollections),
    ...standardCollections,
  ]),
  ecommerce: deduplicateCollections([
    ...Object.values(ecommerceCollections),
    ...Object.values(productsCollections),
    ...Object.values(customersCollections),
    ...Object.values(ordersCollections),
    ...Object.values(couponsCollections),
    ...Object.values(productCategoriesCollections),
    ...Object.values(reviewsCollections),
    ...Object.values(brandsCollections),

    ...standardCollections,
  ]),
  "kitchen-sink": deduplicateCollections([
    ...Object.values(minimalCollections),
    ...Object.values(starterCollections),
    ...Object.values(blogCollections),
    ...Object.values(ecommerceCollections),
    ...Object.values(kitchenSinkCollections),
    ...Object.values(productsCollections),
    ...Object.values(customersCollections),
    ...Object.values(ordersCollections),
    ...Object.values(couponsCollections),
    ...Object.values(productCategoriesCollections),
    ...Object.values(reviewsCollections),
    ...Object.values(brandsCollections),

    ...standardCollections,
  ]),
} as const;

import {
  allGlobalSettings,
  coreGlobalSettings,
  getSettingsForTemplate,
  settingsBySlug,
} from "./settings/index.js";

export interface TemplateConfig {
  collections?: CollectionConfig[];
  globals?: GlobalConfig[];
}

export type TemplateType = "minimal" | "starter" | "blog" | "ecommerce" | "kitchen-sink";

export interface CreateTemplateConfigOptions extends TemplateConfig {
  template?: TemplateType;
  collections?: CollectionConfig[];
  globals?: GlobalConfig[];
  includeMedia?: boolean;
  includeSettings?:
    | "all"
    | "core"
    | "site"
    | "seo"
    | "social"
    | "email"
    | "storage"
    | "access"
    | "store"
    | "shipping"
    | "system"
    | string[];
  excludeSettings?: string[];
}

export function createTemplateConfig(
  options: CreateTemplateConfigOptions,
): TemplateConfig {
  const collections: CollectionConfig[] = options.collections
    ? [...options.collections]
    : [];
  const globals: GlobalConfig[] = options.globals ? [...options.globals] : [];

  if (options.includeMedia !== false) {
    collections.push(...mediaCollections);
  }

  const templateSettings = options.template
    ? getSettingsForTemplate(options.template)
    : coreGlobalSettings;

  if (options.includeSettings) {
    if (options.includeSettings === "all") {
      globals.push(...allGlobalSettings);
    } else if (options.includeSettings === "core") {
      globals.push(...coreGlobalSettings);
    } else if (Array.isArray(options.includeSettings)) {
      for (const setting of options.includeSettings) {
        const global = settingsBySlug[setting];
        if (global) {
          globals.push(global);
        }
      }
    }
  } else if (!options.globals || options.globals.length === 0) {
    globals.push(...templateSettings);
  }

  if (options.excludeSettings && options.excludeSettings.length > 0) {
    const excludeSet = new Set(options.excludeSettings);
    const filtered = globals.filter(
      (g) =>
        !excludeSet.has(g.slug) &&
        !excludeSet.has(g.label?.toLowerCase().replace(/\s+/g, "-") || ""),
    );
    globals.length = 0;
    globals.push(...filtered);
  }

  return {
    collections: collections.length > 0 ? collections : undefined,
    globals: globals.length > 0 ? globals : undefined,
  };
}
