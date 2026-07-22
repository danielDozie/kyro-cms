// ============================================================================
// SEO Settings Global
// ============================================================================

import type { GlobalConfig } from "../../registry/types.js";

export const seoSettingsGlobal: GlobalConfig = {
  slug: "seo-settings",
  label: "SEO Settings",

  admin: {
    group: "settings",
  },

  access: {
    read: () => true,
    update: () => true,
  },

  fields: [
    {
      name: "seoMode",
      type: "select",
      label: "Visibility Mode",
      defaultValue: "simple",
      options: [
        { label: "Simple (Basic Meta)", value: "simple" },
        { label: "Advanced (Full Technical SEO)", value: "advanced" },
      ],
      admin: {
        description: "Switch to advanced mode to control robots.txt, canonical URLs, and deep metadata."
      }
    },
    {
      name: "defaultTitle",
      type: "text",
      label: "Default Title",
      admin: {},
    },
    {
      name: "defaultDescription",
      type: "textarea",
      label: "Default Description",
      admin: {},
    },
    {
      name: "defaultOgImage",
      type: "upload",
      label: "Default OG Image",
      relationTo: "media",
    },
    {
      name: "titleTemplate",
      type: "text",
      label: "Title Template",
      defaultValue: "{{title}} | {{siteName}}",
      admin: {},
    },
    {
      name: "siteNameInTitle",
      type: "checkbox",
      label: "Include Site Name in Title",
      defaultValue: true,
    },
    {
      name: "separator",
      type: "text",
      label: "Title Separator",
      defaultValue: " | ",
      admin: {},
    },
    {
      name: "meta",
      type: "group",
      label: "Technical Meta Settings",
      admin: {
        condition: { field: "seoMode", equals: "advanced" },
      },
      fields: [
        {
          name: "robots",
          type: "text",
          label: "Robots Meta",
          defaultValue: "index, follow",
        },
        {
          name: "canonicalUrl",
          type: "text",
          label: "Canonical URL",
        },
        {
          name: "ogType",
          type: "select",
          label: "Default OG Type",
          defaultValue: "website",
          options: [
            { label: "Website", value: "website" },
            { label: "Article", value: "article" },
            { label: "Product", value: "product" },
            { label: "Book", value: "book" },
            { label: "Music", value: "music" },
            { label: "Video", value: "video" },
          ],
        },
      ],
    },
    {
      name: "enableSitemap",
      type: "checkbox",
      label: "Enable XML Sitemap",
      defaultValue: true,
    },
    {
      name: "sitemap",
      type: "group",
      label: "Sitemap Configuration",
      admin: {
        condition: { and: [ { field: "enableSitemap", equals: true }, { field: "seoMode", equals: "advanced" } ] },
      },
      fields: [
        {
          name: "sitemapUrls",
          type: "number",
          label: "Sitemap URL Limit",
          defaultValue: 50000,
        },
      ],
    },
    {
      name: "robotsTxt",
      type: "textarea",
      label: "Custom robots.txt",
      admin: {
        condition: { field: "seoMode", equals: "advanced" },
      },
    },
    {
      name: "social",
      type: "group",
      label: "Social Media",
      fields: [
        {
          name: "twitterHandle",
          type: "text",
          label: "Twitter/X Handle",
          admin: {},
        },
        {
          name: "twitterCardType",
          type: "select",
          label: "Twitter Card Type",
          defaultValue: "summary_large_image",
          options: [
            { label: "Summary", value: "summary" },
            { label: "Summary with Large Image", value: "summary_large_image" },
            { label: "App", value: "app" },
            { label: "Player", value: "player" },
          ],
        },
        {
          name: "fbAppId",
          type: "text",
          label: "Facebook App ID",
        },
      ],
    },
    {
      name: "advanced",
      type: "group",
      label: "Advanced",
      fields: [
        {
          name: "jsonLdEnabled",
          type: "checkbox",
          label: "Enable JSON-LD",
          defaultValue: true,
          admin: {},
        },
        {
          name: "breadcrumbsEnabled",
          type: "checkbox",
          label: "Enable Breadcrumbs",
          defaultValue: true,
        },
        {
          name: "paginationSize",
          type: "number",
          label: "Default Pagination Size",
          defaultValue: 10,
        },
      ],
    },
  ],
};
