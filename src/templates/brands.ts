import type { CollectionConfig } from "../registry/types.js";

export const brandsCollection: CollectionConfig = {
  slug: "brands",
  label: "Brands",
  labelPlural: "Brands",
  singularLabel: "Brand",
  admin: {
    group: "Commerce",
    useAsTitle: "name",
    defaultColumns: ["name", "slug"],
    description: "Product brands and manufacturers",
    icon: "Sparkles",
  },
  seo: true,
  fields: [
    {
      name: "slug",
      type: "text",
      required: true,
      label: "Slug",
      admin: { position: "sidebar", autoGenerate: "name" },
    },
    {
      name: "name",
      type: "text",
      required: true,
      label: "Brand Name",
    },
    {
      name: "logo",
      type: "upload",
      relationTo: "media",
      label: "Logo",
      admin: { position: "sidebar" },
    },
    {
      name: "description",
      type: "richtext",
      label: "Description",
    },

  ],
  timestamps: true,
};

export const brandsCollections: Record<string, CollectionConfig> = {
  brands: brandsCollection,
};
export default brandsCollections;
