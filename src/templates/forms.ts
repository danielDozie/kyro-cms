import type { CollectionConfig } from "../registry/types.js";


export const formsCollection: CollectionConfig = {
  slug: "forms",
  label: "Forms",
  labelPlural: "Forms",
  singularLabel: "Form",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "slug", "updatedAt"],
    description: "Reusable form definitions",
    icon: "FileInput",
  },
  fields: [
    {
      name: "slug",
      type: "text",
      required: true,
      label: "Slug",
      admin: { position: "sidebar", autoGenerate: "name" },
    },
    { name: "name", type: "text", required: true, label: "Name" },
    { name: "subtitle", type: "textarea", label: "Subtitle" },

    {
      name: "submitButtonText",
      type: "text",
      label: "Submit Button Text",
      defaultValue: "Submit",
      admin: { position: "sidebar" },
    },
    {
      name: "consentCheckboxText",
      type: "text",
      label: "Consent Agreement label (e.g. I agree to terms)",
      admin: { position: "sidebar" },
    },
    {
      name: "redirectUrl",
      type: "text",
      label: "Success Redirect URL",
      admin: { position: "sidebar" },
    },
    {
      name: "fields",
      type: "array",
      label: "Form Fields",
      admin: {
        collapsible: true,
        initCollapsed: true,
      },
      fields: [
        {
          name: "fieldName",
          type: "text",
          label: "Field API Name (e.g. company)",
        },
        {
          name: "inputType",
          type: "select",
          label: "Input Type",
          defaultValue: "text",
          options: [
            { label: "Text input", value: "text" },
            { label: "Email input", value: "email" },
            { label: "Phone number input", value: "tel" },
            { label: "Multi-line textarea", value: "textarea" },
            { label: "Checkbox selector", value: "checkbox" },
          ],
        },
        {
          name: "placeholder",
          type: "text",
          label: "Input Placeholder Text",
        },
        {
          name: "isRequired",
          type: "checkbox",
          label: "Make this field required",
          defaultValue: false,
        },
      ],
    },
    {
      name: "entries",
      type: "relationship",
      relationTo: "form-entries",
      hasMany: true,
      label: "Entries",
      admin: {
        description: "Form submissions linked to this form.",
      },
    },
  ],
  timestamps: true,
  versions: {
    drafts: true,
    maxPerDoc: 5,
  },
};

export const formsCollections: Record<string, CollectionConfig> = {
  forms: formsCollection,
};

export default formsCollections;
