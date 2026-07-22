import type { CollectionConfig } from "../registry/types.js";


export const postsCollection: CollectionConfig = {
  slug: "posts",
  label: "Posts",
  labelPlural: "Posts",
  singularLabel: "Post",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "status", "createdAt", "updatedAt"],
    description: "Blog posts and articles",
  },
  seo: true,
  fields: [
    {
      name: "slug",
      type: "text",
      required: true,
      label: "Slug",
      admin: {
        description: "The URL-friendly identifier for the post.",
        position: "sidebar",
        autoGenerate: "title",
      },
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
                  "The main title of the post as it will appear publicly.",
              },
            },
            {
              name: "content",
              type: "richtext",
              label: "Content",
            },
            {
              name: "excerpt",
              type: "textarea",
              label: "Excerpt",
              admin: {
                description: "A short summary of the post.",
              },
            },
          ],
        },

        {
          label: "Meta",
          fields: [
            {
              name: "category",
              type: "relationship",
              label: "Category",
              relationTo: "categories",
              admin: {
                description:
                  "Select the primary category this post belongs to.",
              },
            },
            {
              name: "relatedPosts",
              type: "array",
              label: "Related Posts",
              fields: [
                {
                  name: "post",
                  type: "relationship",
                  relationTo: "posts",
                  label: "Post",
                },
              ],
              admin: { description: "Select posts related to this one." },
            },
          ],
        },
      ],
    },

    {
      name: "tags",
      type: "list",
      label: "Tags",
      admin: {
        description: "Add keywords to help categorize your post.",
        position: "sidebar",
      },
    },
    {
      name: "authors",
      type: "array",
      label: "Authors",
      fields: [
        {
          name: "user",
          type: "relationship",
          label: "User",
          relationTo: "users",
        },
      ],
      admin: {
        description: "Select one or more authors for this post.",
        position: "sidebar",
      },
    },
    {
      name: "featured",
      type: "checkbox",
      label: "Featured",
      defaultValue: false,
      admin: {
        description: "Highlight this post as a featured article.",
        position: "sidebar",
      },
    },
    {
      name: "featuredImage",
      type: "upload",
      label: "Featured Image",
      relationTo: "media",
      admin: {
        description: "The primary visual used to represent this post.",
        position: "sidebar",
      },
    },
    {
      name: "readTime",
      type: "number",
      label: "Read Time (mins)",
      admin: {
        description: "Estimated reading time in minutes.",
        position: "sidebar",
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data?.content) {
          let text = "";
          const extractText = (node: any) => {
            if (node.type === "text" && node.text) {
              text += node.text + " ";
            }
            if (node.content && Array.isArray(node.content)) {
              node.content.forEach(extractText);
            }
          };

          if (typeof data.content === "object" && data.content !== null) {
            extractText(data.content);
          } else if (typeof data.content === "string") {
            text = data.content.replace(/<[^>]*>?/gm, " ");
          }

          const words = text.trim().split(/\s+/).filter(w => w.length > 0);
          data.readTime = Math.max(1, Math.ceil(words.length / 200));
        } else {
          data.readTime = 0;
        }
        return data;
      },
    ],
  },
  timestamps: true,
  versions: {
    drafts: true,
    maxPerDoc: 10,
  },
};

export const postsCollections: Record<string, CollectionConfig> = {
  posts: postsCollection,
};

export default postsCollections;
