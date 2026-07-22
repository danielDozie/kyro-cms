// ============================================================================
// Media Collection Template
// ============================================================================

import type { CollectionConfig } from "../registry/types.js";

export const mediaCollection: CollectionConfig = {
  slug: "media",
  label: "Media Library",

  admin: {
    useAsTitle: "title",
    defaultColumns: ["thumbnailUrl", "title", "type", "fileSize", "createdAt"],
    group: "content",
  },

  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },

  fields: [
    {
      name: "title",
      type: "text",
      label: "Title",
      required: true,
      admin: {
        description: "Descriptive title for the file",
      },
    },
    {
      name: "filename",
      type: "text",
      label: "Filename",
      required: true,
      admin: {
        readOnly: true,
        description: "System filename (auto-generated)",
      },
    },
    {
      name: "originalName",
      type: "text",
      label: "Original Name",
      admin: {
        readOnly: true,
      },
    },
    {
      name: "alt",
      type: "text",
      label: "Alt Text",
      admin: {
        description: "Alternative text for images (accessibility)",
      },
    },
    {
      name: "caption",
      type: "richtext",
      label: "Caption",
      admin: {
        description: "Optional caption or description",
      },
    },
    {
      name: "type",
      type: "select",
      label: "File Type",
      required: true,
      defaultValue: "document",
      options: [
        { label: "Image", value: "image" },
        { label: "Video", value: "video" },
        { label: "Audio", value: "audio" },
        { label: "Document", value: "document" },
        { label: "Archive", value: "archive" },
        { label: "Other", value: "other" },
      ],
      admin: {
        readOnly: true,
      },
    },
    {
      name: "mimeType",
      type: "text",
      label: "MIME Type",
      admin: {
        readOnly: true,
      },
    },
    {
      name: "url",
      type: "text",
      label: "URL",
      required: true,
      admin: {
        readOnly: true,
        description: "Public URL of the file",
      },
    },
    {
      name: "thumbnailUrl",
      type: "text",
      label: "Thumbnail URL",
      admin: {
        readOnly: true,
      },
    },
    {
      name: "width",
      type: "number",
      label: "Width",
      admin: {
        readOnly: true,
        description: "Width in pixels (for images/videos)",
      },
    },
    {
      name: "height",
      type: "number",
      label: "Height",
      admin: {
        readOnly: true,
        description: "Height in pixels (for images/videos)",
      },
    },
    {
      name: "fileSize",
      type: "number",
      label: "File Size",
      admin: {
        readOnly: true,
        description: "Size in bytes",
      },
    },
    {
      name: "folder",
      type: "text",
      label: "Folder",
      admin: {
        description: "Folder path for organization (e.g., /products, /blog)",
      },
    },
    {
      name: "tags",
      type: "array",
      label: "Tags",
      fields: [
        {
          name: "tag",
          type: "text",
          label: "Tag",
        },
      ],
    },
    {
      name: "focalPoint",
      type: "group",
      label: "Focal Point",
      admin: {
        description: "Point of interest for cropping",
      },
      fields: [
        {
          name: "x",
          type: "number",
          label: "X",
          defaultValue: 50,
        },
        {
          name: "y",
          type: "number",
          label: "Y",
          defaultValue: 50,
        },
      ],
    },
    {
      name: "metadata",
      type: "json",
      label: "Metadata",
      admin: {
        readOnly: true,
        description: "Additional file metadata (EXIF, etc.)",
      },
    },
    {
      name: "provider",
      type: "select",
      label: "Storage Provider",
      defaultValue: "local",
      options: [
        { label: "Local", value: "local" },
        { label: "AWS S3", value: "s3" },
        { label: "Cloudinary", value: "cloudinary" },
        { label: "Imgix", value: "imgix" },
      ],
      admin: {
        readOnly: true,
      },
    },
    {
      name: "status",
      type: "select",
      label: "Status",
      defaultValue: "active",
      options: [
        { label: "Active", value: "active" },
        { label: "Archived", value: "archived" },
      ],
    },
    {
      name: "createdAt",
      type: "date",
      label: "Created",
      admin: {
        readOnly: true,
      },
    },
    {
      name: "updatedAt",
      type: "date",
      label: "Last Modified",
      admin: {
        readOnly: true,
      },
    },
  ],
};

// Export all media collections
export const mediaCollections = [mediaCollection];
