// ============================================================================
// Settings Globals Index
// ============================================================================

export { siteSettingsGlobal } from "./site.js";
export { seoSettingsGlobal } from "./seo.js";
export { brandSettingsGlobal } from "./brand.js";
export { emailSettingsGlobal } from "./email.js";
export { accessSettingsGlobal } from "./access.js";
export { storeSettingsGlobal } from "./store.js";
export { shippingSettingsGlobal } from "./shipping.js";
export { systemSettingsGlobal } from "./system.js";
export { storageSettingsGlobal } from "./storage.js";

import { siteSettingsGlobal } from "./site.js";
import { seoSettingsGlobal } from "./seo.js";
import { brandSettingsGlobal } from "./brand.js";
import { emailSettingsGlobal } from "./email.js";
import { accessSettingsGlobal } from "./access.js";
import { storeSettingsGlobal } from "./store.js";
import { shippingSettingsGlobal } from "./shipping.js";
import { systemSettingsGlobal } from "./system.js";
import { storageSettingsGlobal } from "./storage.js";
import type { GlobalConfig } from "../../registry/types.js";

export const allGlobalSettings: GlobalConfig[] = [
  siteSettingsGlobal,
  seoSettingsGlobal,
  brandSettingsGlobal,
  emailSettingsGlobal,
  storageSettingsGlobal,
  accessSettingsGlobal,
  storeSettingsGlobal,
  shippingSettingsGlobal,
  systemSettingsGlobal,
];

export const coreGlobalSettings: GlobalConfig[] = [
  siteSettingsGlobal,
  seoSettingsGlobal,
  brandSettingsGlobal,
  emailSettingsGlobal,
  storageSettingsGlobal,
  accessSettingsGlobal,
  systemSettingsGlobal,
];

export const settingsBySlug: Record<string, GlobalConfig> = {
  [siteSettingsGlobal.slug]: siteSettingsGlobal,
  [seoSettingsGlobal.slug]: seoSettingsGlobal,
  [brandSettingsGlobal.slug]: brandSettingsGlobal,
  [emailSettingsGlobal.slug]: emailSettingsGlobal,
  [storageSettingsGlobal.slug]: storageSettingsGlobal,
  [accessSettingsGlobal.slug]: accessSettingsGlobal,
  [storeSettingsGlobal.slug]: storeSettingsGlobal,
  [shippingSettingsGlobal.slug]: shippingSettingsGlobal,
  [systemSettingsGlobal.slug]: systemSettingsGlobal,
};

export function getSettingsForTemplate(
  template: "minimal" | "starter" | "blog" | "ecommerce" | "kitchen-sink",
): GlobalConfig[] {
  switch (template) {
    case "ecommerce":
    case "kitchen-sink":
      return allGlobalSettings;
    default:
      return coreGlobalSettings;
  }
}
