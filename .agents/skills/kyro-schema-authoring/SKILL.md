---
name: kyro-schema-authoring
description: Rules and conventions for defining collections, field types, normalization rules, and relationship batching in kyro.config.ts.
---

# Kyro CMS Schema & Collection Authoring

Use this skill when defining or updating collections and fields in `kyro.config.ts`.

## 1. Config Standard (`defineKyroConfig`)

Always use `defineKyroConfig` to wrap your configuration object. Do NOT use `defineConfig` (to prevent name collisions with Vite/Astro helper utilities):

```ts
import { defineKyroConfig, createLocalAdapter } from '@kyro-cms/core';

export default defineKyroConfig({
  db: createLocalAdapter({ path: "./data/kyro.db" }),
  collections: [
    {
      slug: 'posts',
      labels: { singular: 'Post', plural: 'Posts' },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'slug', type: 'text', unique: true, required: true },
        { name: 'content', type: 'richtext' },
        {
          name: 'author',
          type: 'relationship',
          relationTo: 'users',
          required: true,
        },
      ],
    },
  ],
});
```

## 2. Local DB Adapter Path Standard

Use the standardized string parameter for SQLite local adapters: `createLocalAdapter({ path: "./data/kyro.db" })`. Avoid boilerplate lazy Node.js `fs`/`path` imports.

## 3. Field Normalization Helpers

When adding custom field processing, import normalization helpers from `@kyro-cms/core`:
- `normalizeEmptyStrings(data)`: Converts empty string inputs (`""`) to `null`.
- `convertRichtextFields(data)`: Sanitizes TipTap/Slate AST structures.
- `clearUniqueFields(data)`: Resets unique keys on duplicate/draft clone operations.

## 4. Relationship Population Optimization

When defining collection relationships:
- Relationship fields use batched `in` queries per document layer during `populateRelationships`.
- Avoid triggering per-document $O(N)$ sequential DB lookups.
