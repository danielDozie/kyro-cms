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
      admin: { readOnly: true },
      hooks: {
        beforeValidate: [
          ({ data }) => {
            const first = data?.firstName || "";
            const last = data?.lastName || "";
            const combined = `${first} ${last}`.trim();
            return combined || data?.email || "Unknown Customer";
          }
        ]
      }
    },
    { name: "firstName", type: "text", label: "First Name" },
    { name: "lastName", type: "text", label: "Last Name" },
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
    drafts: true,
    maxPerDoc: 5,
  },
};

export const customersCollections: Record<string, CollectionConfig> = {
  customers: customersCollection,
};

export default customersCollections;
