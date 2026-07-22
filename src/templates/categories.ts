import type { CollectionConfig } from "../registry/types.js";


export const categoriesCollection: CollectionConfig = {
  slug: "categories",
  label: "Categories",
  labelPlural: "Categories",
  singularLabel: "Category",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "slug"],
    description: "Post categories",
    layout: "split",
  },
  fields: [
    {
      name: "slug",
      type: "text",
      required: true,
      label: "Slug",
      admin: { position: "sidebar", autoGenerate: "name" },
    },
    { name: "name", type: "text", required: true, label: "Name" },
    {
      name: "description",
      type: "textarea",
      label: "Description",
    },

    {
      name: "icon",
      type: "upload",
      label: "Icon",
      relationTo: "media",
      admin: { position: "sidebar" },
    },
    {
      name: "parent",
      type: "relationship",
      label: "Parent Category",
      relationTo: "categories",
      admin: { position: "sidebar" },
    },
    {
      name: "order",
      type: "number",
      label: "Order",
      defaultValue: 0,
      admin: { position: "sidebar" },
    },
  ],
  timestamps: true,
  versions: {
    drafts: true,
    maxPerDoc: 5,
  },
};

export const categoriesCollections: Record<string, CollectionConfig> = {
  categories: categoriesCollection,
};

export const productCategoriesCollection: CollectionConfig = {
  slug: "product-categories",
  label: "Product Categories",
  labelPlural: "Product Categories",
  singularLabel: "Product Category",
  admin: {
    group: "Commerce",
    useAsTitle: "name",
    defaultColumns: ["name", "slug"],
    description: "Product categories for organizing your catalog",
    icon: "FolderTree",
  },
  fields: [
    {
      name: "slug",
      type: "text",
      required: true,
      label: "Slug",
      admin: { position: "sidebar", autoGenerate: "name" },
    },
    { name: "name", type: "text", required: true, label: "Name" },

    {
      name: "description",
      type: "textarea",
      label: "Description",
    },
    {
      name: "image",
      type: "upload",
      label: "Image",
      relationTo: "media",
      admin: { position: "sidebar" },
    },
    {
      name: "parent",
      type: "relationship",
      label: "Parent Category",
      relationTo: "product-categories",
      admin: { position: "sidebar" },
    },
  ],
  timestamps: true,
  versions: {
    drafts: true,
    maxPerDoc: 5,
  },
};

export const productCategoriesCollections: Record<string, CollectionConfig> = {
  "product-categories": productCategoriesCollection,
};

export default categoriesCollections;
