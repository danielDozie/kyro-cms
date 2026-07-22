import type { BaseAdapter } from "../registry/types.js";

export interface StoreConfig {
  storeName?: string;
  storeEmail?: string;
  storePhone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  currency?: {
    code?: string;
    symbol?: string;
    position?: "before" | "after";
    decimals?: number;
  };
  tax?: {
    enabled?: boolean;
    rate?: number;
    includedInPrice?: boolean;
    taxId?: string;
  };
  shipping?: {
    enableLocalPickup?: boolean;
    flatRate?: number;
    freeShippingThreshold?: number;
  };
  orders?: {
    orderNumberPrefix?: string;
    allowGuestCheckout?: boolean;
    requirePhone?: boolean;
  };
}

export function getStoreConfigFromSettings(settings: any): StoreConfig {
  if (!settings) return {};
  return {
    storeName: settings.storeName,
    storeEmail: settings.storeEmail,
    storePhone: settings.storePhone,
    address: settings.address,
    currency: settings.currency,
    tax: settings.tax,
    shipping: settings.shipping,
    orders: settings.orders,
  };
}

export async function getStoreConfig(
  db: BaseAdapter,
  options?: { draft?: boolean },
): Promise<StoreConfig> {
  try {
    const doc = await db.findOne({
      collection: "_globals_store-settings",
      where: {},
      draft: options?.draft ?? false,
    });
    return getStoreConfigFromSettings(doc);
  } catch {
    return {};
  }
}
