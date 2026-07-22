import type { CollectionConfig } from "../registry/types.js";
import { coreSemanticBlocks } from "./blocks.js";


export const pageCollection: CollectionConfig = {
  slug: "pages",
  label: "Pages",
  labelPlural: "Pages",
  singularLabel: "Page",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "status", "updatedAt"],
    description: "Standard web pages",
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
      name: "tabs",
      type: "tabs",
      tabs: [
        {
          label: "Content",
          fields: [
            {
              name: "title",
              type: "text",
              required: true,
              label: "Title",
              admin: {
                description:
                  "The main title of the page as it will appear publicly.",
              },
            },
            {
              name: "content",
              type: "blocks",
              label: "Content",
              blocks: coreSemanticBlocks,
            },
          ],
        },

        {
          label: "Meta",
          fields: [],
        },
      ],
    },

    {
      name: "featuredImage",
      type: "upload",
      label: "Featured Image",
      relationTo: "media",
      admin: { position: "sidebar" },
    },
  ],
  timestamps: true,
  versions: {
    drafts: true,
    maxPerDoc: 10,
  },
};

export const pageCollections: Record<string, CollectionConfig> = {
  pages: pageCollection,
};

export default pageCollections;
