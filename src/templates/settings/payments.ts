// ============================================================================
// Payment Settings Global
// ============================================================================

import type { GlobalConfig } from "../../registry/types.js";

export const paymentSettingsGlobal: GlobalConfig = {
  slug: "payment-settings",
  label: "Payment Settings",
  

  admin: {
    group: "settings",
    
  },

  access: {
    read: () => true,
    update: () => true,
  },

  fields: [
    {
      name: "testMode",
      type: "checkbox",
      label: "Test Mode",
      defaultValue: true,
      admin: {
        
      },
    },
    {
      name: "provider",
      type: "select",
      label: "Primary Payment Provider",
      defaultValue: "stripe",
      options: [
        { label: "Stripe", value: "stripe" },
        { label: "PayPal", value: "paypal" },
        { label: "Square", value: "square" },
        { label: "Manual Methods Only", value: "manual" },
      ],
    },
    {
      name: "stripe",
      type: "group",
      label: "Stripe",
      admin: {
        condition: { field: "provider", equals: "stripe" },
      },
      fields: [
        {
          name: "enabled",
          type: "checkbox",
          label: "Enable Stripe",
          defaultValue: false,
        },
        {
          name: "publishableKey",
          type: "text",
          label: "Publishable Key",
          admin: {
            placeholder: "pk_live_...",
          },
        },
        {
          name: "secretKey",
          type: "password",
          label: "Secret Key",
        },
        {
          name: "webhookSecret",
          type: "password",
          label: "Webhook Secret",
          admin: {
            
          },
        },
      ],
    },
    {
      name: "paypal",
      type: "group",
      label: "PayPal",
      admin: {
        condition: { field: "provider", equals: "paypal" },
      },
      fields: [
        {
          name: "enabled",
          type: "checkbox",
          label: "Enable PayPal",
          defaultValue: false,
        },
        {
          name: "clientId",
          type: "text",
          label: "Client ID",
        },
        {
          name: "clientSecret",
          type: "password",
          label: "Client Secret",
        },
        {
          name: "mode",
          type: "select",
          label: "Mode",
          defaultValue: "sandbox",
          options: [
            { label: "Sandbox (Test)", value: "sandbox" },
            { label: "Live", value: "live" },
          ],
        },
      ],
    },
    {
      name: "square",
      type: "group",
      label: "Square",
      admin: {
        condition: { field: "provider", equals: "square" },
      },
      fields: [
        {
          name: "enabled",
          type: "checkbox",
          label: "Enable Square",
          defaultValue: false,
        },
        {
          name: "applicationId",
          type: "text",
          label: "Application ID",
        },
        {
          name: "accessToken",
          type: "password",
          label: "Access Token",
        },
        {
          name: "locationId",
          type: "text",
          label: "Location ID",
        },
      ],
    },
    {
      name: "methods",
      type: "group",
      label: "Manual Payment Methods",
      fields: [
        {
          name: "cod",
          type: "checkbox",
          label: "Cash on Delivery",
          defaultValue: true,
        },
        {
          name: "bankTransfer",
          type: "checkbox",
          label: "Bank Transfer",
          defaultValue: true,
        },
        {
          name: "cash",
          type: "checkbox",
          label: "Cash (Local Pickup)",
          defaultValue: true,
        },
        {
          name: "check",
          type: "checkbox",
          label: "Check",
          defaultValue: false,
        },
      ],
    },
    {
      name: "bankTransfer",
      type: "group",
      label: "Bank Transfer Details",
      admin: {
        
      },
      fields: [
        {
          name: "bankName",
          type: "text",
          label: "Bank Name",
        },
        {
          name: "accountName",
          type: "text",
          label: "Account Name",
        },
        {
          name: "accountNumber",
          type: "text",
          label: "Account Number",
        },
        {
          name: "routingNumber",
          type: "text",
          label: "Routing/Sort Code",
        },
        {
          name: "iban",
          type: "text",
          label: "IBAN",
        },
        {
          name: "swift",
          type: "text",
          label: "SWIFT/BIC",
        },
      ],
    },
  ],
};
