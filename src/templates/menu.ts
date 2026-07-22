import type { CollectionConfig } from "../registry/types.js";

export const menuCollection: CollectionConfig = {
  slug: "menu",
  label: "Menu",
  singularLabel: "Menu Item",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "menuLocation"],
  },
  fields: [
    { name: "title", type: "text", label: "Title", required: true },
    {
      name: "menuLocation",
      type: "select",
      label: "Location",
      options: [
        { label: "Choose Location", value: "" },
        { label: "Header", value: "header" },
        { label: "Footer", value: "footer" },
        { label: "Sidebar", value: "sidebar" },
        { label: "Primary", value: "primary" },
        { label: "Secondary", value: "secondary" },
      ],
      required: true,
      admin: { position: "sidebar" },
    },
    {
      name: "order",
      type: "number",
      label: "Order",
      admin: { position: "sidebar" },
    },
    {
      name: "menu",
      type: "group",
      fields: [
        {
          name: "menuItem",
          label: "Menu Item",
          type: "array",
          fields: [
            {
              name: "linkType",
              type: "select",
              label: "Type",
              options: [
                { label: "Internal", value: "internal" },
                { label: "External", value: "external" },
              ],
            },
            {
              name: "internalTarget",
              type: "relationship",
              label: "Target",
              relationTo: ["pages", "posts"],
              admin: {
                condition: { field: "linkType", equals: "internal" },
              },
            },
            {
              name: "externalUrl",
              type: "text",
              label: "URL",
              admin: {
                condition: { field: "linkType", equals: "external" },
              },
            },
          ],
        },
      ],
    },
  ],
};

export const menuCollections: Record<string, CollectionConfig> = {
  menu: menuCollection,
};

export default menuCollections;
