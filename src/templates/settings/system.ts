// ============================================================================
// System Settings Global
// ============================================================================

import type { GlobalConfig } from "../../registry/types.js";

export const systemSettingsGlobal: GlobalConfig = {
  slug: "system",
  label: "System",
  admin: {
    group: "settings",
    description: "Core system configuration and secrets",
  },
  access: {
    read: () => true,
    update: () => true,
  },
  fields: [
    {
      name: "appSecret",
      type: "secret",
      label: "App Secret",
      required: false,
      admin: {
        description: "Auto-generated master secret used for encryption and auth. Auto-created if empty on load.",
        readOnly: true,
      },
    },
    {
      name: "sessionMaxAge",
      type: "number",
      label: "Session Max Age (days)",
      required: false,
      defaultValue: 7,
      admin: {
        description: "Maximum session duration in days",
      },
    },
    {
      name: "maxSessionsPerUser",
      type: "number",
      label: "Max Sessions Per User",
      required: false,
      defaultValue: 3,
      admin: {
        description: "Maximum concurrent sessions allowed per user",
      },
    },

  ],
};