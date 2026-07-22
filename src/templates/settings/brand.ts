import type { GlobalConfig } from "../../registry/types.js";

export const brandSettingsGlobal: GlobalConfig = {
  slug: "brand-settings",
  label: "Brand Settings",

  admin: {
    group: "settings",
    description: "Manage global brand identity, logos, contact information, and social links.",
  },

  access: {
    read: () => true,
    update: () => true,
  },

  fields: [
    {
      name: "identity",
      type: "group",
      label: "Brand Identity",
      fields: [
        {
          name: "primaryLogo",
          type: "upload",
          label: "Primary Logo",
          relationTo: "media",
        },
        {
          name: "darkLogo",
          type: "upload",
          label: "Dark Logo (Optional)",
          relationTo: "media",
          admin: {
            description: "Used for dark mode layouts.",
          },
        },
        {
          name: "favicon",
          type: "upload",
          label: "Favicon",
          relationTo: "media",
        },
        {
          name: "showSiteName",
          type: "checkbox",
          label: "Show Sitename in Brand Identity",
          defaultValue: true,
          admin: {
            description: "Show the sitename side by side with the logo in the sidebar menu area.",
          },
        },
      ],
    },
    {
      name: "companyInfo",
      type: "group",
      label: "Contact & Company Information",
      fields: [
        {
          name: "companyName",
          type: "text",
          label: "Company Name",
        },
        {
          name: "address",
          type: "textarea",
          label: "Physical Address",
        },
        {
          name: "phone",
          type: "text",
          label: "Phone Number",
        },
        {
          name: "email",
          type: "text",
          label: "Public Email Address",
        },
      ],
    },
    {
      name: "businessHours",
      type: "array",
      label: "Business Hours",
      fields: [
        {
          name: "day",
          type: "text",
          label: "Day / Range",
          admin: { description: "e.g., Mon - Fri" },
        },
        {
          name: "hours",
          type: "text",
          label: "Hours",
          admin: { description: "e.g., 9:00 AM - 5:00 PM" },
        },
      ],
    },
    {
      name: "socialLinks",
      type: "array",
      label: "Social Media Profiles",
      fields: [
        {
          name: "platform",
          type: "select",
          label: "Platform",
          options: [
            { label: "Facebook", value: "facebook" },
            { label: "Twitter / X", value: "twitter" },
            { label: "Instagram", value: "instagram" },
            { label: "LinkedIn", value: "linkedin" },
            { label: "YouTube", value: "youtube" },
            { label: "TikTok", value: "tiktok" },
            { label: "GitHub", value: "github" },
            { label: "Other", value: "other" },
          ],
        },
        {
          name: "url",
          type: "text",
          label: "Profile URL",
        },
      ],
    },
  ],
};
