import type { CollectionConfig } from "../registry/types.js";


export const customersCollection: CollectionConfig = {
  slug: "customers",
  label: "Customers",
  labelPlural: "Customers",
  singularLabel: "Customer",
  admin: {
    group: "Commerce",
    disablePreview: true,
    useAsTitle: "fullName",
    defaultColumns: [
      "fullName",
      "email",
      "createdAt",
      "updatedAt",
    ],
    description: "Customer accounts",
  },
  fields: [
    {
      name: "slug",
      type: "text",
      required: true,
      label: "Slug",
      admin: { position: "sidebar", autoGenerate: "email" },
    },
    { 
      name: "email", 
      type: "email", 
      required: true, 
      label: "Email",
      admin: { readOnly: true } 
    },
    {
      name: "fullName",
      type: "text",
      label: "Full Name",
      hooks: {
        beforeValidate: [
          ({ data }) => {
            return data?.fullName || data?.email || "Unknown Customer";
          }
        ]
      }
    },
    {
      name: "verified",
      type: "checkbox",
      label: "Email Verified",
      defaultValue: false,
    },
    {
      name: "magicLinkToken",
      type: "text",
      label: "Magic Link Token",
      admin: {
        hidden: true,
      }
    },
    {
      name: "magicLinkExpires",
      type: "text",
      label: "Magic Link Expiration",
      admin: {
        hidden: true,
      }
    },
    { name: "phone", type: "text", label: "Phone" },
    {
      name: "addresses",
      type: "array",
      label: "Addresses",
      fields: [
        { name: "type", type: "text", label: "Type" },
        { name: "line1", type: "text", label: "Address Line 1" },
        { name: "line2", type: "text", label: "Address Line 2" },
        { name: "city", type: "text", label: "City" },
        { name: "state", type: "text", label: "State" },
        { name: "postalCode", type: "text", label: "Postal Code" },
        { name: "country", type: "text", label: "Country" },
      ],
    },

    {
      name: "profilePicture",
      type: "upload",
      label: "Profile Picture",
      relationTo: "media",
      admin: { position: "sidebar" },
    },
  ],
  timestamps: true,
  versions: {
    maxPerDoc: 5,
  },
};

export const customersCollections: Record<string, CollectionConfig> = {
  customers: customersCollection,
};

export default customersCollections;
