import type { CollectionConfig } from "../registry/types.js";


export const couponsCollection: CollectionConfig = {
  slug: "coupons",
  label: "Coupons",
  labelPlural: "Coupons",
  singularLabel: "Coupon",
  admin: {
    group: "Commerce",
    disablePreview: true,
    useAsTitle: "code",
    defaultColumns: ["code", "type", "value", "active", "expiresAt"],
    description: "Discount codes and promotions",
    icon: "Ticket",
  },
  fields: [
    { name: "code", type: "text", required: true, label: "Code" },
    {
      name: "type",
      type: "select",
      required: true,
      label: "Type",
      options: [
        { label: "Percentage", value: "percentage" },
        { label: "Fixed Amount", value: "fixed" },
        { label: "Free Shipping", value: "freeShipping" },
      ],
    },
    { name: "value", type: "number", label: "Value" },
    { name: "minPurchase", type: "number", label: "Minimum Purchase" },
    { name: "maxDiscount", type: "number", label: "Max Discount" },
    { name: "usageLimit", type: "number", label: "Usage Limit" },
    {
      name: "usedCount",
      type: "number",
      defaultValue: 0,
      label: "Used Count",
    },
    { name: "startsAt", type: "date", label: "Starts At", admin: { position: "sidebar" } },
    { name: "expiresAt", type: "date", label: "Expires At", admin: { position: "sidebar" } },
    { name: "active", type: "checkbox", defaultValue: true, label: "Active", admin: { position: "sidebar" } },
  ],
  timestamps: true,
  versions: {
    drafts: true,
    maxPerDoc: 5,
  },
};

export const couponsCollections: Record<string, CollectionConfig> = {
  coupons: couponsCollection,
};

export default couponsCollections;
