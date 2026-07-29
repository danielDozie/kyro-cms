import type { CollectionConfig } from '@kyro-cms/core';

export const minimalCollections: Record<string, CollectionConfig> = {
  posts: {
    slug: 'posts',
    label: 'Posts',
    labelPlural: 'Posts',
    singularLabel: 'Post',
    admin: {
      useAsTitle: 'title',
      defaultColumns: ['title', 'status', 'createdAt'],
      description: 'Blog posts and articles'
    },
    fields: [
      {
        name: 'title',
        type: 'text',
        required: true,
        label: 'Title',
        admin: { description: 'The post title' }
      },
      {
        name: 'slug',
        type: 'text',
        required: true,
        label: 'Slug',
        admin: { description: 'URL-friendly identifier' }
      },
      {
        name: 'content',
        type: 'richtext',
        label: 'Content'
      },
      {
        name: 'status',
        type: 'select',
        label: 'Status',
        options: [
          { label: 'Draft', value: 'draft' },
          { label: 'Published', value: 'published' }
        ],
        defaultValue: 'draft',
        admin: {
          description: 'Publication status'
        }
      },
      {
        name: 'publishedAt',
        type: 'date',
        label: 'Published At',
        admin: { description: 'When to publish this post' }
      }
    ],
    timestamps: true
  }
};
