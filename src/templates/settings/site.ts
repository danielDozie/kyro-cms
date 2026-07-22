// ============================================================================
// Site Settings Global
// ============================================================================

import type { GlobalConfig } from "../../registry/types.js";

export const siteSettingsGlobal: GlobalConfig = {
  slug: "site-settings",
  label: "Site Settings",

  admin: {
    group: "settings",
  },

  access: {
    read: () => true,
    update: () => true,
  },

  fields: [
    {
      name: "siteName",
      type: "text",
      label: "Site Name",
      required: true,
      admin: {},
    },
    {
      name: "siteDescription",
      type: "textarea",
      label: "Site Description",
      admin: {
        placeholder: "Enter a brief description of your site for SEO and search results."
      },
    },

    {
      name: "siteUrl",
      type: "text",
      label: "Site URL",
      admin: {},
    },
    {
      name: "defaultLanguage",
      type: "select",
      label: "Default Language",
      defaultValue: "en",
      options: [
        { label: "English", value: "en" },
        { label: "French", value: "fr" },
        { label: "Spanish", value: "es" },
        { label: "German", value: "de" },
      ],
      admin: {
        description: "The default language for the site and admin UI.",
      },
    },


    {
      name: "analyticsEnabled",
      type: "checkbox",
      label: "Enable Analytics & Tracking",
      defaultValue: false,
    },
    {
      name: "analytics",
      type: "group",
      label: "Tracking Configurations",
      admin: {
        condition: { field: "analyticsEnabled", equals: true },
      },
      fields: [
        {
          name: "googleAnalyticsId",
          type: "text",
          label: "Google Analytics ID",
        },
        {
          name: "googleTagManagerId",
          type: "text",
          label: "Google Tag Manager ID",
        },
        {
          name: "plausibleDomain",
          type: "text",
          label: "Plausible Domain",
        },
        {
          name: "mixpanelToken",
          type: "password",
          label: "Mixpanel Token",
        },
      ],
    },
    {
      name: "mapApiKey",
      type: "password",
      label: "Map API Key",
      admin: {
        description: "API Key for Map Integrations (Google Maps, Mapbox, etc.)"
      },
    },
    {
      name: "enableHeaderFooterElements",
      type: "checkbox",
      label: "Enable Header and Footer Elements",
      defaultValue: false,
    },
    {
      name: "headerFooterSettings",
      type: "group",
      label: "Header & Footer Settings",
      admin: {
        condition: { field: "enableHeaderFooterElements", equals: true },
      },
      fields: [
        {
          name: "headerBlocks",
      type: "blocks",
      label: "Header Elements",
      blocks: [
        {
          slug: "text",
          label: "Text Paragraph",
          fields: [
            {
              name: "text",
              type: "text",
              label: "Text Content",
              required: true,
            },
          ],
        },
        {
          slug: "textarea",
          label: "Text Area",
          fields: [
            {
              name: "text",
              type: "textarea",
              label: "Text Content",
              required: true,
            },
          ],
        },
        {
          slug: "form",
          label: "Form Selection",
          fields: [
            {
              name: "form",
              type: "relationship",
              label: "Select Form",
              relationTo: "forms",
              required: true,
            },
          ],
        },
        {
          slug: "button",
          label: "Button Link",
          fields: [
            {
              name: "label",
              type: "text",
              label: "Button Label",
              required: true,
            },
            {
              name: "url",
              type: "text",
              label: "URL",
              required: true,
            },
          ],
        },
        {
          slug: "image",
          label: "Image Upload",
          fields: [
            {
              name: "image",
              type: "upload",
              label: "Image",
              relationTo: "media",
            },
            {
              name: "alt",
              type: "text",
              label: "Alt Text",
            },
            {
              name: "linkUrl",
              type: "text",
              label: "Link URL",
            },
          ],
        },
      ],
    },
    {
      name: "footerBlocks",
      type: "blocks",
      label: "Footer Elements",
      blocks: [
        {
          slug: "text",
          label: "Text Paragraph",
          fields: [
            {
              name: "text",
              type: "text",
              label: "Text Content",
              required: true,
            },
          ],
        },
        {
          slug: "textarea",
          label: "Text Area",
          fields: [
            {
              name: "text",
              type: "textarea",
              label: "Text Content",
              required: true,
            },
          ],
        },
        {
          slug: "form",
          label: "Form Selection",
          fields: [
            {
              name: "form",
              type: "relationship",
              label: "Select Form",
              relationTo: "forms",
              required: true,
            },
          ],
        },
        {
          slug: "button",
          label: "Button Link",
          fields: [
            {
              name: "label",
              type: "text",
              label: "Button Label",
              required: true,
            },
            {
              name: "url",
              type: "text",
              label: "URL",
              required: true,
            },
          ],
        },
        {
          slug: "image",
          label: "Image Upload",
          fields: [
            {
              name: "image",
              type: "upload",
              label: "Image",
              relationTo: "media",
            },
            {
              name: "alt",
              type: "text",
              label: "Alt Text",
            },
            {
              name: "linkUrl",
              type: "text",
              label: "Link URL",
            },
          ],
        },
          ],
        },
      ],
    },
  ],
};
