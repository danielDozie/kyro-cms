import type { CollectionConfig } from "../registry/types.js";

export const productsCollection: CollectionConfig = {
  slug: "products",
  label: "Products",
  labelPlural: "Products",
  singularLabel: "Product",
  admin: {
    group: "Commerce",
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "price", "inventory"],
    description: "E-commerce products",
    icon: "ShoppingBag",
  },
  seo: true,
  fields: [
    {
      name: "slug",
      type: "text",
      required: true,
      label: "Slug",
      admin: { position: "sidebar", autoGenerate: "title" },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Content",
          fields: [
            { name: "title", type: "text", required: true, label: "Title" },
            { name: "description", type: "richtext", label: "Description" },
          ]
        },
        {
          label: "Inventory & Pricing",
          fields: [
            { name: "price", type: "number", required: true, label: "Price" },
            {
              name: "compareAtPrice",
              type: "number",
              label: "Compare at Price",
              admin: { description: "Original price for sale display" },
            },
            {
              name: "costPrice",
              type: "number",
              label: "Cost Price",
              admin: { description: "For profit calculation" },
            },
            { name: "sku", type: "text", required: true, label: "SKU" },
            { name: "barcode", type: "text", label: "Barcode" },
            {
              name: "inventory",
              type: "number",
              label: "Inventory",
              defaultValue: 0,
            },
            {
              name: "lowStockThreshold",
              type: "number",
              label: "Low Stock Threshold",
              defaultValue: 5,
            },

          ]
        }
      ]
    },

    {
      name: "category",
      type: "relationship",
      label: "Category",
      relationTo: "product-categories",
      admin: { position: "sidebar" },
    },
    {
      name: "brand",
      type: "relationship",
      label: "Brand",
      relationTo: "brands",
      admin: { position: "sidebar" },
    },
    {
      name: "featuredImage",
      type: "upload",
      label: "Featured Image",
      relationTo: "media",
      admin: { position: "sidebar" },
    },
    {
      name: "gallery",
      type: "upload",
      label: "Product Gallery",
      relationTo: "media",
      hasMany: true,
      admin: { position: "sidebar" },
    },
  ],
  timestamps: true,
  versions: {
    drafts: true,
  },
};

export const productsCollections: Record<string, CollectionConfig> = {
  products: productsCollection,
};
export default productsCollections;
