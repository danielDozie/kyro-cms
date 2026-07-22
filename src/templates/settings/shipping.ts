import type { GlobalConfig } from "../../registry/types.js";
import { countryOptions } from "../../utils/countries.js";

export const shippingSettingsGlobal: GlobalConfig = {
  slug: "shipping-settings",
  label: "Shipping Settings",
  admin: {
    group: "settings",
    description: "Configure shipping zones, rates, and methods",
  },
  access: {
    read: () => true,
    update: () => true,
  },
  fields: [
    {
      name: "methods",
      type: "array",
      label: "Shipping Methods",
      fields: [
        {
          name: "name",
          type: "text",
          required: true,
          label: "Method Name",
          admin: {
            placeholder: "e.g., Standard Shipping",
          },
        },
        {
          name: "price",
          type: "number",
          required: true,
          label: "Price",
        },
        {
          name: "zones",
          type: "select",
          label: "Applicable Countries",
          admin: {
            description: "Leave empty to apply to all countries",
          },
          options: countryOptions,
        },
        {
          name: "minOrderValue",
          type: "number",
          label: "Minimum Order Value",
          admin: {
            description: "Free or valid if order exceeds this amount",
          },
        },
        {
          name: "maxWeight",
          type: "number",
          label: "Maximum Weight Limit",
          admin: {
            description: "Limit this method to orders under a certain weight",
          },
        },
      ],
    },
  ],
};
