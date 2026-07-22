import type { Field } from "./types.js";

export function generateSEOFields(): Field {
  return {
    name: "seo",
    type: "group",
    label: "SEO Settings",
    fields: [
      {
        name: "metaTitle",
        type: "text",
        label: "Meta Title",
        admin: {
          description: "The title used for search engines (recommended < 60 chars).",
          autoGenerate: "title",
        },
      },
      {
        name: "metaDescription",
        type: "textarea",
        label: "Meta Description",
        admin: {
          description: "A brief summary for search engines (recommended < 160 chars).",
          autoGenerate: "content",
        },
      },
      {
        name: "keywords",
        type: "text",
        label: "Keywords",
        admin: {
          description: "Comma-separated list of keywords for this page.",
        },
      },
      {
        name: "ogImage",
        type: "upload",
        label: "OpenGraph Image",
        relationTo: "media",
        admin: {
          description: "The image shown when the post is shared on social media (Facebook, LinkedIn).",
        },
      },
      {
        name: "twitter",
        type: "group",
        label: "Twitter Card",
        fields: [
          {
            name: "title",
            type: "text",
            label: "Twitter Title",
          },
          {
            name: "description",
            type: "textarea",
            label: "Twitter Description",
          },
          {
            name: "image",
            type: "upload",
            label: "Twitter Image",
            relationTo: "media",
          },
        ],
      },
      {
        name: "advanced",
        type: "group",
        label: "Advanced Search Settings",
        fields: [
          {
            name: "noindex",
            type: "checkbox",
            label: "Hide from search engines (noindex)",
            defaultValue: false,
          },
          {
            name: "nofollow",
            type: "checkbox",
            label: "Do not follow links (nofollow)",
            defaultValue: false,
          },
          {
            name: "canonicalUrl",
            type: "text",
            label: "Canonical URL Override",
            admin: {
              description: "Leave empty to use the default canonical URL.",
            },
          },
          {
            name: "structuredData",
            type: "code",
            label: "JSON-LD Structured Data",
            admin: {
              description: "Custom JSON-LD schema for this specific page.",
            },
          },
        ],
      },
    ],
  };
}
