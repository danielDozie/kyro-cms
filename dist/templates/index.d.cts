import { G as GlobalConfig, C as CollectionConfig } from '../types-DOKMyC3y.cjs';
import '../types-euTszc-1.cjs';

declare const minimalCollections: Record<string, any>;

declare const starterCollections: Record<string, any>;

declare const siteSettingsGlobal: GlobalConfig;

declare const seoSettingsGlobal: GlobalConfig;

declare const brandSettingsGlobal: GlobalConfig;

declare const emailSettingsGlobal: GlobalConfig;

declare const accessSettingsGlobal: GlobalConfig;

declare const storeSettingsGlobal: GlobalConfig;

declare const shippingSettingsGlobal: GlobalConfig;

declare const systemSettingsGlobal: GlobalConfig;

declare const storageSettingsGlobal: GlobalConfig;

declare const allGlobalSettings: GlobalConfig[];
declare const coreGlobalSettings: GlobalConfig[];
declare const settingsBySlug: Record<string, GlobalConfig>;
declare function getSettingsForTemplate(template: "minimal" | "starter" | "blog" | "ecommerce" | "kitchen-sink"): GlobalConfig[];

declare const blogCollections: Record<string, any>;

declare const ecommerceCollections: Record<string, any>;
declare const ecommerceGlobals: GlobalConfig[];

declare const kitchenSinkCollections: Record<string, CollectionConfig>;

declare const authCollections: {
    users: CollectionConfig;
    audit_logs: CollectionConfig;
};

declare const mediaCollection: CollectionConfig;
declare const mediaCollections: CollectionConfig[];

declare const menuCollection: CollectionConfig;
declare const menuCollections: Record<string, CollectionConfig>;

declare const postsCollection: CollectionConfig;
declare const postsCollections: Record<string, CollectionConfig>;

declare const pageCollection: CollectionConfig;
declare const pageCollections: Record<string, CollectionConfig>;

declare const categoriesCollection: CollectionConfig;
declare const categoriesCollections: Record<string, CollectionConfig>;
declare const productCategoriesCollection: CollectionConfig;
declare const productCategoriesCollections: Record<string, CollectionConfig>;

declare const productsCollection: CollectionConfig;
declare const productsCollections: Record<string, CollectionConfig>;

declare const customersCollection: CollectionConfig;
declare const customersCollections: Record<string, CollectionConfig>;

declare const ordersCollection: CollectionConfig;
declare const ordersCollections: Record<string, CollectionConfig>;

declare const couponsCollection: CollectionConfig;
declare const couponsCollections: Record<string, CollectionConfig>;

declare const formsCollection: CollectionConfig;
declare const formsCollections: Record<string, CollectionConfig>;

declare const formEntriesCollection: CollectionConfig;
declare const formEntriesCollections: Record<string, CollectionConfig>;

declare const reviewsCollection: CollectionConfig;
declare const reviewsCollections: Record<string, CollectionConfig>;

declare const brandsCollection: CollectionConfig;
declare const brandsCollections: Record<string, CollectionConfig>;

declare const templateCollections: {
    readonly minimal: CollectionConfig[];
    readonly starter: CollectionConfig[];
    readonly blog: CollectionConfig[];
    readonly ecommerce: CollectionConfig[];
    readonly "kitchen-sink": CollectionConfig[];
};
interface TemplateConfig {
    collections?: CollectionConfig[];
    globals?: GlobalConfig[];
}
type TemplateType = "minimal" | "starter" | "blog" | "ecommerce" | "kitchen-sink";
interface CreateTemplateConfigOptions extends TemplateConfig {
    template?: TemplateType;
    collections?: CollectionConfig[];
    globals?: GlobalConfig[];
    includeMedia?: boolean;
    includeSettings?: "all" | "core" | "site" | "seo" | "social" | "email" | "storage" | "access" | "store" | "shipping" | "system" | string[];
    excludeSettings?: string[];
}
declare function createTemplateConfig(options: CreateTemplateConfigOptions): TemplateConfig;

export { type CreateTemplateConfigOptions, type TemplateConfig, type TemplateType, accessSettingsGlobal, allGlobalSettings, authCollections, blogCollections, brandSettingsGlobal, brandsCollection, brandsCollections, categoriesCollection, categoriesCollections, coreGlobalSettings, couponsCollection, couponsCollections, createTemplateConfig, customersCollection, customersCollections, ecommerceCollections, ecommerceGlobals, emailSettingsGlobal, formEntriesCollection, formEntriesCollections, formsCollection, formsCollections, getSettingsForTemplate, kitchenSinkCollections, mediaCollection, mediaCollections, menuCollection, menuCollections, minimalCollections, ordersCollection, ordersCollections, pageCollection, pageCollections, postsCollection, postsCollections, productCategoriesCollection, productCategoriesCollections, productsCollection, productsCollections, reviewsCollection, reviewsCollections, seoSettingsGlobal, settingsBySlug, shippingSettingsGlobal, siteSettingsGlobal, starterCollections, storageSettingsGlobal, storeSettingsGlobal, systemSettingsGlobal, templateCollections };
