import type { CollectionConfig } from '@kyro-cms/core';

export const blogCollections: Record<string, CollectionConfig> = {
  posts: {
    slug: 'posts',
    label: 'Posts',
    labelPlural: 'Posts',
    singularLabel: 'Post',
    admin: {
      useAsTitle: 'title',
      defaultColumns: ['title', 'category', 'status', 'createdAt'],
      description: 'Blog posts and articles'
    },
    fields: [
      {
        name: 'title',
        type: 'text',
        required: true,
        label: 'Title'
      },
      {
        name: 'slug',
        type: 'text',
        required: true,
        label: 'Slug'
      },
      {
        name: 'excerpt',
        type: 'textarea',
        label: 'Excerpt',
        admin: { description: 'Brief summary for listings' }
      },
      {
        name: 'content',
        type: 'richtext',
        label: 'Content'
      },
      {
        name: 'featuredImage',
        type: 'upload',
        label: 'Featured Image',
        relationTo: 'media'
      },
      {
        name: 'category',
        type: 'relationship',
        label: 'Category',
        relationTo: 'categories'
      },
      {
        name: 'tags',
        type: 'array',
        label: 'Tags',
        fields: [
          { name: 'tag', type: 'text' }
        ]
      },
      {
        name: 'status',
        type: 'select',
        label: 'Status',
        options: [
          { label: 'Draft', value: 'draft' },
          { label: 'Published', value: 'published' }
        ],
        defaultValue: 'draft'
      },
      {
        name: 'publishedAt',
        type: 'date',
        label: 'Published At'
      }
    ],
    timestamps: true
  },

  categories: {
    slug: 'categories',
    label: 'Categories',
    labelPlural: 'Categories',
    singularLabel: 'Category',
    admin: {
      useAsTitle: 'name',
      defaultColumns: ['name', 'slug', 'postCount'],
      description: 'Post categories'
    },
    fields: [
      {
        name: 'name',
        type: 'text',
        required: true,
        label: 'Name'
      },
      {
        name: 'slug',
        type: 'text',
        required: true,
        label: 'Slug'
      },
      {
        name: 'description',
        type: 'textarea',
        label: 'Description'
      },
      {
        name: 'parent',
        type: 'relationship',
        label: 'Parent Category',
        relationTo: 'categories'
      }
    ],
    timestamps: true
  },

  media: {
    slug: 'media',
    label: 'Media',
    labelPlural: 'Media',
    singularLabel: 'Medium',
    admin: {
      useAsTitle: 'filename',
      defaultColumns: ['filename', 'mimeType', 'size', 'uploadedAt'],
      description: 'Uploaded files and images'
    },
    fields: [
      {
        name: 'filename',
        type: 'text',
        required: true,
        label: 'Filename'
      },
      {
        name: 'alt',
        type: 'text',
        label: 'Alt Text',
        admin: { description: 'Alternative text for images' }
      },
      {
        name: 'url',
        type: 'text',
        required: true,
        label: 'URL'
      },
      {
        name: 'mimeType',
        type: 'text',
        label: 'MIME Type'
      },
      {
        name: 'size',
        type: 'number',
        label: 'Size (bytes)'
      },
      {
        name: 'width',
        type: 'number',
        label: 'Width'
      },
      {
        name: 'height',
        type: 'number',
        label: 'Height'
      }
    ],
    timestamps: true
  }
};

export const blogGlobals = {
  'site-settings': {
    name: 'site-settings',
    label: 'Site Settings',
    fields: {
      siteName: { type: 'text', defaultValue: 'My Blog' },
      siteDescription: { type: 'textarea', label: 'Site Description' },
      logo: { type: 'text', label: 'Logo URL' },
      socialLinks: {
        type: 'array',
        label: 'Social Links',
        fields: {
          platform: { type: 'text', label: 'Platform' },
          url: { type: 'text', label: 'URL' }
        }
      }
    }
  }
};
