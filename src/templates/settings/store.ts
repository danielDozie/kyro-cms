// ============================================================================
// E-commerce Store Settings Global
// ============================================================================

import type { GlobalConfig } from "../../registry/types.js";

import { countryOptions } from "../../utils/countries.js";
import { currencyOptions } from "../../utils/currencies.js";

export const storeSettingsGlobal: GlobalConfig = {
  slug: "store-settings",
  label: "Store Settings",


  admin: {
    group: "settings",

  },

  access: {
    read: () => true,
    update: () => true,
  },

  fields: [
    {
      name: "storeName",
      type: "text",
      label: "Store Name",
      required: true,
    },
    {
      name: "storeEmail",
      type: "email",
      label: "Contact Email",
      required: true,
    },
    {
      name: "storePhone",
      type: "text",
      label: "Phone Number",
    },
    {
      name: "address",
      type: "group",
      label: "Store Address",
      fields: [
        {
          name: "street",
          type: "text",
          label: "Street Address",
        },
        {
          name: "city",
          type: "text",
          label: "City",
        },
        {
          name: "state",
          type: "text",
          label: "State/Province",
        },
        {
          name: "postalCode",
          type: "text",
          label: "Postal Code",
        },
        {
          name: "country",
          type: "select",
          label: "Country",
          options: countryOptions,
        },
      ],
    },
    {
      name: "currency",
      type: "group",
      label: "Currency",
      fields: [
        {
          name: "code",
          type: "select",
          label: "Currency Code",
          defaultValue: "USD",
          options: currencyOptions,
        },
        {
          name: "decimals",
          type: "number",
          label: "Decimal Places",
          defaultValue: 2,
        },
      ],
    },
    {
      name: "tax",
      type: "group",
      label: "Tax Logistics",
      admin: {
        condition: { field: "tax.enabled", equals: true },
      },
      fields: [
        {
          name: "enabled",
          type: "checkbox",
          label: "Enable Tax",
          defaultValue: true,
        },
        {
          name: "rate",
          type: "number",
          label: "Tax Rate (%)",
          admin: {
            placeholder: "10",
            condition: { field: "enabled", equals: true },
          },
        },
        {
          name: "includedInPrice",
          type: "checkbox",
          label: "Tax Included in Prices",
          admin: {
            condition: { field: "enabled", equals: true },
          },
        },
        {
          name: "taxId",
          type: "text",
          label: "Tax ID / VAT Number",
          admin: {
            condition: { field: "enabled", equals: true },
          },
        },
      ],
    },
    {
      name: "orders",
      type: "group",
      label: "Orders",
      fields: [
        {
          name: "orderNumberPrefix",
          type: "text",
          label: "Order Number Prefix",
          defaultValue: "ORD",
          admin: {

          },
        },
        {
          name: "allowGuestCheckout",
          type: "checkbox",
          label: "Allow Guest Checkout",
          defaultValue: true,
        },
        {
          name: "requirePhone",
          type: "checkbox",
          label: "Require Phone Number",
          defaultValue: true,
        },
      ],
    },
  ],
};
