// ============================================================================
// Access Control Settings Global
// ============================================================================

import type { GlobalConfig } from "../../registry/types.js";

export const accessSettingsGlobal: GlobalConfig = {
  slug: "access-settings",
  label: "Access Control",

  admin: {
    group: "settings",
  },

  access: {
    read: () => true,
    update: () => true,
  },

  fields: [
    {
      name: "enablePublicAccess",
      type: "checkbox",
      label: "Enable Public Access",
      defaultValue: true,
      admin: {},
    },
    {
      name: "defaultCollectionAccess",
      type: "select",
      label: "Default Collection Access",
      defaultValue: "read",
      options: [
        { label: "Read Only", value: "read" },
        { label: "Read & Create", value: "create" },
        { label: "Read & Create & Update", value: "update" },
        { label: "Full Access", value: "admin" },
        { label: "No Access", value: "none" },
      ],
      admin: {},
    },
    {
      name: "apiAccess",
      type: "group",
      label: "API Access",
      fields: [
        {
          name: "graphqlEnabled",
          type: "checkbox",
          label: "Enable GraphQL",
          defaultValue: false,
        },
        {
          name: "trpcEnabled",
          type: "checkbox",
          label: "Enable tRPC",
          defaultValue: false,
        },
        {
          name: "wsEnabled",
          type: "checkbox",
          label: "Enable WebSocket",
          defaultValue: false,
        },
        {
          name: "requireAuth",
          type: "checkbox",
          label: "Require Authentication",
          defaultValue: false,
        },
        {
          name: "cors",
          type: "group",
          label: "CORS Settings",
          admin: {
            condition: { field: "apiAccess.graphqlEnabled", equals: true },
          },
          fields: [
            {
              name: "allowedOrigins",
              type: "textarea",
              label: "Allowed Origins (one per line)",
              admin: {
                placeholder: "https://example.com\nhttps://app.example.com",
              },
            },
          ],
        },
      ],
    },
    {
      name: "rateLimiting",
      type: "group",
      label: "Rate Limiting Configuration",
      admin: {
        condition: { field: "rateLimiting.enabled", equals: true },
      },
      fields: [
        {
          name: "enabled",
          type: "checkbox",
          label: "Enable Global Rate Limiting",
          defaultValue: true,
        },
        {
          name: "maxRequests",
          type: "number",
          label: "Max Requests",
          defaultValue: 100,
          admin: {
            condition: { field: "enabled", equals: true },
          },
        },
        {
          name: "windowMs",
          type: "number",
          label: "Window (ms)",
          defaultValue: 60000,
          admin: {
            condition: { field: "enabled", equals: true },
          },
        },
      ],
    },
  ],
};
