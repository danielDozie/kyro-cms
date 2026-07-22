import type { Field, Block } from "../fields/types.js";

function withUtilityFields(block: Block) {
  const blockBaseFields: Field[] = [
  ];

  return {
    ...block,
    fields: [...blockBaseFields, ...block.fields, ...utilityFields],
  };
}

export const buttonFields: Field[] = [
  { name: "text", type: "text", label: "Label" },
  { name: "url", type: "text", label: "URL" },
];

export const buttonsField: Field = {
  name: "buttons",
  type: "array",
  label: "Action Buttons",
  fields: buttonFields,
};

// ============================================================================
// Inline Content Elements (available inside every block)
// ============================================================================

const headingElement: Block = {
  slug: "headingElement",
  label: "Heading",
  admin: { group: "Basic Content Elements", description: "Section heading" },
  fields: [
    { name: "content", type: "text", label: "Content" },
  ],
};

const textElement: Block = {
  slug: "textElement",
  label: "Text",
  admin: { group: "Basic Content Elements", description: "Plain text paragraph" },
  fields: [
    { name: "content", type: "textarea", label: "Content" },
  ],
};

const imageElement: Block = {
  slug: "imageElement",
  label: "Image",
  admin: { group: "Basic Content Elements", description: "Single image" },
  fields: [
    { name: "image", type: "upload", label: "Image", relationTo: "media" },
  ],
};

const richtextElement: Block = {
  slug: "richtextElement",
  label: "Rich Text",
  admin: { group: "Basic Content Elements", description: "Formatted rich text content" },
  fields: [
    { name: "content", type: "richtext", label: "Content" },
  ],
};

const buttonElement: Block = {
  slug: "buttonElement",
  label: "Button",
  admin: { group: "Basic Content Elements", description: "Call-to-action button" },
  fields: [
    {
      name: "buttonData",
      type: "group",
      label: "Button",
      admin: { inline: true },
      fields: [
        { name: "text", type: "text", label: "Label" },
        { name: "url", type: "text", label: "URL" },
      ],
    },
  ],
};

const videoElement: Block = {
  slug: "videoElement",
  label: "Video",
  admin: { group: "Basic Content Elements", description: "Embedded video player" },
  fields: [
    { name: "url", type: "text", label: "Video URL" },
    { name: "file", type: "upload", label: "Video File", relationTo: "media" },
    { name: "caption", type: "text", label: "Caption" },
  ],
};

const listElement: Block = {
  slug: "listElement",
  label: "List",
  admin: { group: "Basic Content Elements", description: "Bulleted or numbered list" },
  fields: [
    {
      name: "items",
      type: "array",
      label: "Items",
      fields: [
        { name: "text", type: "text", label: "Item Text" },
      ],
    },
  ],
};

export const elementBlocks: Block[] = [
  headingElement,
  textElement,
  imageElement,
  richtextElement,
  buttonElement,
  videoElement,
  listElement,
];

export const elementsField: Field = {
  name: "elements",
  type: "blocks",
  label: "Extra Content Elements",
  blocks: elementBlocks,
  admin: { pickerMode: "dropdown" },
};

export const utilityFields: Field[] = [elementsField];

// ============================================================================
// Core Semantic Blocks
// ============================================================================

export const heroBlock = withUtilityFields({
  slug: "hero",
  admin: { group: "Structural Sections", description: "Primary landing section with heading, text, media & CTA" },
  label: "Hero Section",
  fields: [
    {
      name: "isMultiScreen",
      type: "checkbox",
      label: "Enable Carousel",
      defaultValue: false,
    },
    {
      name: "multiSlides", type: "group", label: "Multi Slides",
      admin: {
        condition: { field: "isMultiScreen", equals: true }
      },
      fields: [
        {
          name: "multiSlides",
          type: "array",
          label: "Hero Slides",
          fields: [
            { name: "title", type: "text", label: "Heading" },
            { name: "subtitle", type: "textarea", label: "Subheading" },
            { name: "backgroundImage", type: "upload", label: "Background Image", relationTo: "media" },
            buttonsField,
          ],
        },
      ]
    },
    {
      name: "singleSlide", type: "group", label: "Single Slide",
      admin: {
        condition: { field: "isMultiScreen", equals: false }
      },
      fields: [
        { name: "title", type: "text", label: "Heading" },
        { name: "subtitle", type: "textarea", label: "Subheading" },
        { name: "backgroundImage", type: "upload", label: "Background Image", relationTo: "media" },
        buttonsField,
      ]
    }
  ],
});

export const cardBlock = withUtilityFields({
  slug: "card",
  admin: { group: "Structural Sections", description: "Modular card block featuring title, text, and optional media" },
  label: "Card Block",
  fields: [
    {
      name: "isMultiCard",
      type: "checkbox",
      label: "Enable Multicard Layout",
      defaultValue: false,
    },
    {
      name: "multiCards", type: "group", label: "Multi Cards",
      admin: {
        condition: { field: "isMultiCard", equals: true }
      },
      fields: [
        {
          name: "cards",
          type: "array",
          label: "Cards List",
          fields: [
            { name: "title", type: "text", label: "Title" },
            { name: "description", type: "textarea", label: "Description" },
            { name: "image", type: "upload", label: "Image", relationTo: "media" },
            { name: "icon", type: "icon", label: "Icon" },
            { name: "linkText", type: "text", label: "Link Text" },
            { name: "link", type: "text", label: "URL" },
          ],
        },
      ]
    },
    {
      name: "singleCard", type: "group", label: "Single Card",
      admin: {
        condition: { field: "isMultiCard", equals: false }
      },
      fields: [
        { name: "title", type: "text", label: "Title" },
        { name: "description", type: "textarea", label: "Description" },
        { name: "image", type: "upload", label: "Image", relationTo: "media" },
        { name: "icon", type: "icon", label: "Icon" },
        { name: "linkText", type: "text", label: "Link Text" },
        { name: "link", type: "text", label: "URL" },
      ]
    }
  ],
});

export const textBlock = withUtilityFields({
  slug: "text",
  admin: { group: "Basic Content Elements", description: "Rich text content" },
  label: "Text Block",
  fields: [
    { name: "content", type: "richtext", label: "Content" },
  ],
});

export const imageBlock = withUtilityFields({
  slug: "image",
  admin: { group: "Basic Content Elements", description: "Image upload container" },
  label: "Image",
  fields: [
    { name: "image", type: "upload", label: "Image", relationTo: "media" },
    { name: "caption", type: "text", label: "Caption" },
    { name: "alt", type: "text", label: "Alt Text" },
    {
      name: "aspectRatio",
      type: "select",
      label: "Aspect Ratio",
      defaultValue: "original",
      options: [
        { label: "Original", value: "original" },
        { label: "16:9 Landscape", value: "16-9" },
        { label: "4:3 Classic", value: "4-3" },
        { label: "1:1 Square", value: "1-1" },
        { label: "2:3 Portrait", value: "2-3" },
      ],
    },
    { name: "enableLightbox", type: "checkbox", label: "Enable Zoom / Lightbox", defaultValue: false },
  ],
});

export const featureSplitBlock = withUtilityFields({
  slug: "featureSplit",
  admin: { group: "Structural Sections", description: "Side-by-side text and media layout" },
  label: "Feature Split (Text & Media)",
  fields: [
    { name: "title", type: "text", label: "Title" },
    { name: "description", type: "textarea", label: "Description" },
    {
      name: "checkpoints",
      type: "array",
      label: "Value Checkpoints",
      fields: [
        { name: "title", type: "text", label: "Checkpoint Title" },
        { name: "description", type: "textarea", label: "Checkpoint Description" },
        { name: "icon", type: "icon", label: "Icon Name" },
        { name: "image", type: "upload", label: "Image", relationTo: "media" },
        { name: "itemUrl", type: "text", label: "Link URL" },
        { name: "itemText", type: "text", label: "Link Text" },
      ],
    },
    {
      name: "images",
      type: "array",
      label: "Images",
      fields: [
        { name: "image", type: "upload", label: "Image", relationTo: "media" },
      ],
    },
    buttonsField,
  ],
});

export const featureGridBlock = withUtilityFields({
  slug: "featureGrid",
  admin: { group: "Marketing Grids", description: "Multi-column grid showcasing features or services" },
  label: "Feature Grid",
  fields: [
    { name: "title", type: "text", label: "Section Heading" },
    { name: "subtitle", type: "textarea", label: "Section Subtitle" },
    {
      name: "features",
      type: "array",
      label: "Features List",
      fields: [
        { name: "title", type: "text", label: "Title" },
        { name: "description", type: "textarea", label: "Description" },
        { name: "icon", type: "icon", label: "Icon Name" },
        { name: "image", type: "upload", label: "Feature Image", relationTo: "media" },
        { name: "itemUrl", type: "text", label: "Card Redirection URL" },
      ],
    },
  ],
});

export const ctaBannerBlock = withUtilityFields({
  slug: "ctaBanner",
  admin: { group: "Structural Sections", description: "High-impact call-to-action banner" },
  label: "CTA Banner",
  fields: [
    { name: "title", type: "text", label: "Headline" },
    { name: "subtitle", type: "textarea", label: "Subheading" },
    { name: "backgroundImage", type: "upload", label: "Background Image", relationTo: "media" },
    buttonsField,
  ],
});

export const testimonialsBlock = withUtilityFields({
  slug: "testimonials",
  admin: { group: "Marketing Grids", description: "Customer reviews and quotes carousel" },
  label: "Testimonials",
  fields: [
    { name: "title", type: "text", label: "Section Heading" },
    { name: "subtitle", type: "text", label: "Section Subheading" },
    {
      name: "items",
      type: "array",
      label: "Testimonials",
      fields: [
        { name: "authorName", type: "text", label: "Author Name" },
        { name: "quote", type: "textarea", label: "Quote" },
        {
          name: "rating",
          type: "select",
          label: "Star Rating",
          defaultValue: "5",
          options: [
            { label: "5 Stars", value: "5" },
            { label: "4 Stars", value: "4" },
            { label: "3 Stars", value: "3" },
            { label: "2 Stars", value: "2" },
            { label: "1 Star", value: "1" },
          ],
        },
        { name: "authorRole", type: "text", label: "Author Role" },
        { name: "avatar", type: "upload", label: "Avatar", relationTo: "media" },
        { name: "companyLogo", type: "upload", label: "Company Logo", relationTo: "media" },
      ],
    },
  ],
});

export const faqBlock = withUtilityFields({
  slug: "faq",
  admin: { group: "Lead Capture & Interactive", description: "Expandable list of frequently asked questions" },
  label: "FAQ Section",
  fields: [
    { name: "title", type: "text", label: "Section Heading" },
    {
      name: "items",
      type: "array",
      label: "Questions List",
      fields: [
        { name: "tag", type: "text", label: "Category Tag (e.g. billing, account)" },
        { name: "question", type: "text", label: "Question" },
        { name: "answer", type: "textarea", label: "Answer" },
      ],
    },
    { name: "footerTitle", type: "text", label: "Footer Heading (e.g. Still have questions?)" },
    { name: "footerCtaUrl", type: "text", label: "Footer CTA Redirection URL" },
  ],
});

export const statsBlock = withUtilityFields({
  slug: "stats",
  admin: { group: "Marketing Grids", description: "Grid displaying key numerical metrics and stats" },
  label: "Stats / Metrics",
  fields: [
    { name: "title", type: "text", label: "Section Heading" },
    { name: "description", type: "textarea", label: "Description" },
    {
      name: "items",
      type: "array",
      label: "Stats List",
      fields: [
        { name: "prefix", type: "text", label: "Value Prefix (e.g. + or $)" },
        { name: "value", type: "text", label: "Value (e.g. 99.9 or 5M)" },
        { name: "suffix", type: "text", label: "Value Suffix (e.g. % or users)" },
        { name: "label", type: "text", label: "Label (e.g. Uptime)" },
        { name: "description", type: "textarea", label: "Context Description" },
      ],
    },
  ],
});

export const logoCloudBlock = withUtilityFields({
  slug: "logoCloud",
  admin: { group: "Structural Sections", description: "Showcase for partner and client company logos" },
  label: "Logo Cloud / Partners",
  fields: [
    { name: "title", type: "text", label: "Section Heading" },
    {
      name: "logos",
      type: "array",
      label: "Logos List",
      fields: [
        { name: "name", type: "text", label: "Company Name" },
        { name: "logo", type: "upload", label: "Logo Image", relationTo: "media" },
        { name: "url", type: "text", label: "Website URL" },
      ],
    },
  ],
});

export const pricingBlock = withUtilityFields({
  slug: "pricing",
  admin: { group: "Marketing Grids", description: "Tiered pricing plans with feature comparisons" },
  label: "Pricing Plans",
  fields: [
    { name: "title", type: "text", label: "Section Heading" },
    { name: "subtitle", type: "textarea", label: "Section Subtitle" },
    { name: "annualDiscount", type: "text", label: "Annual Promo Tag (e.g. Save 20%)" },
    {
      name: "plans",
      type: "array",
      label: "Pricing Plans",
      fields: [
        { name: "popularBadgeText", type: "text", label: "Plan Badge (e.g. MOST POPULAR)" },
        { name: "name", type: "text", label: "Plan Name" },
        { name: "description", type: "textarea", label: "Plan Description" },
        { name: "currency", type: "text", label: "Plan Currency (e.g. $)", defaultValue: "$" },
        { name: "price", type: "text", label: "Price (e.g. 29)" },
        { name: "billingPeriod", type: "text", label: "Billing Period (e.g. /mo)" },
        { name: "features", type: "list", label: "Features Checklist" },
        buttonsField,
        { name: "footnote", type: "text", label: "Footnote note (e.g. *cancel anytime)" },
        { name: "isFeatured", type: "checkbox", label: "Highlight Plan (Featured)", defaultValue: false },
      ],
    },
  ],
});

export const teamBlock = withUtilityFields({
  slug: "team",
  admin: { group: "Marketing Grids", description: "Showcase of team members with photos and roles" },
  label: "Team Showcase",
  fields: [
    { name: "title", type: "text", label: "Section Heading" },
    { name: "subtitle", type: "textarea", label: "Section Subtitle" },
    {
      name: "members",
      type: "array",
      label: "Team Members",
      fields: [
        { name: "name", type: "text", label: "Member Name" },
        { name: "role", type: "text", label: "Role / Position" },
        { name: "department", type: "text", label: "Department / Team tag (e.g. engineering, design)" },
        { name: "avatar", type: "upload", label: "Avatar Image", relationTo: "media" },
        { name: "bio", type: "textarea", label: "Brief Bio" },
        { name: "twitterUrl", type: "text", label: "Twitter URL" },
        { name: "linkedinUrl", type: "text", label: "LinkedIn URL" },
        { name: "githubUrl", type: "text", label: "GitHub URL" },
        { name: "websiteUrl", type: "text", label: "Website URL" },
      ],
    },
  ],
});

export const recentFeedBlock = withUtilityFields({
  slug: "recentFeed",
  admin: { group: "Dynamic Content", description: "Hand-picked showcase of items" },
  label: "Hand-Picked Feed",
  fields: [
    { name: "title", type: "text", label: "Section Heading" },
    { name: "subtitle", type: "textarea", label: "Section Subtitle" },
    {
      name: "selectedItems",
      type: "relationship",
      label: "Feed Items",
      relationTo: "*",
      hasMany: true,
    },
    buttonsField,
  ],
});

export const processStepsBlock = withUtilityFields({
  slug: "processSteps",
  admin: { group: "Lead Capture & Interactive", description: "Numbered sequence illustrating a process or workflow" },
  label: "Process Steps / Timeline",
  fields: [
    { name: "title", type: "text", label: "Section Heading" },
    { name: "subtitle", type: "textarea", label: "Section Subtitle" },
    {
      name: "steps",
      type: "array",
      label: "Steps",
      fields: [
        { name: "stepNumber", type: "text", label: "Step Number (e.g. 01)" },
        { name: "icon", type: "upload", label: "Step Icon / Image", relationTo: "media" },
        { name: "title", type: "text", label: "Step Title" },
        { name: "description", type: "textarea", label: "Description" },
      ],
    },
  ],
});

export const formEmbedBlock = withUtilityFields({
  slug: "formEmbed",
  admin: { group: "Lead Capture & Interactive", description: "Embeddable interactive forms for lead capture" },
  label: "Form Embed",
  fields: [
    { name: "title", type: "text", label: "Form Title" },
    { name: "subtitle", type: "textarea", label: "Form Subtitle" },
    {
      name: "form",
      type: "relationship",
      relationTo: "forms",
      label: "Form",
      required: true,
    },
  ],
});

export const videoShowcaseBlock = withUtilityFields({
  slug: "videoShowcase",
  admin: { group: "Structural Sections", description: "Cinematic video player with custom thumbnail" },
  label: "Cinematic Video Showcase",
  fields: [
    { name: "title", type: "text", label: "Section Heading" },
    { name: "subtitle", type: "textarea", label: "Section Subtitle" },
    { name: "coverImage", type: "upload", label: "Cinematic Cover Image (Thumbnail)", relationTo: "media" },
    { name: "videoUrl", type: "text", label: "Video Embed URL (YouTube / Vimeo / MP4)" },
    { name: "videoTitle", type: "text", label: "Video Title (for accessibility & hover text)" },
    { name: "durationBadge", type: "text", label: "Duration Badge (e.g. '▶ 2:34')" },
    { name: "isLightbox", type: "checkbox", label: "Open in Cinematic Lightbox Modal", defaultValue: true },
    { name: "autoplay", type: "checkbox", label: "Autoplay Video (muted)", defaultValue: false },
  ],
});

// ============================================================================
// Combined Blocks List
// ============================================================================

export const coreSemanticBlocks = [
  heroBlock,
  cardBlock,
  featureSplitBlock,
  featureGridBlock,
  ctaBannerBlock,
  testimonialsBlock,
  faqBlock,
  statsBlock,
  logoCloudBlock,
  pricingBlock,
  teamBlock,
  recentFeedBlock,
  processStepsBlock,
  formEmbedBlock,
  videoShowcaseBlock,
];
