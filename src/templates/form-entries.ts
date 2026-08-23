import type { CollectionConfig } from "../registry/types.js";


export const formEntriesCollection: CollectionConfig = {
  slug: "form-entries",
  label: "Form Entries",
  labelPlural: "Form Entries",
  singularLabel: "Form Entry",
  admin: {
    useAsTitle: "id",
    defaultColumns: ["id", "form", "createdAt", "ipAddress"],
    description: "Form submission entries",
    icon: "Inbox",
  },
  access: {
    create: () => true,
  },
  fields: [
    {
      name: "form",
      type: "relationship",
      relationTo: "forms",
      required: true,
      label: "Form",
      admin: {
        position: "sidebar",
        readOnly: true,
        description: "The form this entry belongs to.",
      },
    },
    {
      name: "data",
      type: "json",
      label: "Submitted Data",
      admin: {
        readOnly: true,
        description: "All field values submitted with this entry.",
      },
    },
    {
      name: "ipAddress",
      type: "text",
      label: "IP Address",
      admin: {
        position: "sidebar",
        readOnly: true,
        description: "The IP address of the submitter.",
      },
    },
  ],
  timestamps: true,
};

export const formEntriesCollections: Record<string, CollectionConfig> = {
  "form-entries": formEntriesCollection,
};

export default formEntriesCollections;
