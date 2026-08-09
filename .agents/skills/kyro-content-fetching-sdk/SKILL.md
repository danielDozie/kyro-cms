---
name: kyro-content-fetching-sdk
description: Standards for fetching content via @kyro-cms/connect client SDK, type-safe queries, rich-text rendering, and SSG path generation.
---

# Kyro Content Fetching & SDK Guide

Use this skill when fetching content from Kyro CMS in frontend Astro, Next.js, or React applications.

## 1. Initializing the Client SDK

```ts
import { createKyroClient } from '@kyro-cms/connect';

export const kyroClient = createKyroClient({
  baseUrl: process.env.PUBLIC_KYRO_URL || 'http://localhost:4321',
  headers: {
    'Authorization': `Bearer ${process.env.KYRO_API_KEY}`,
  },
});
```

## 2. Type-Safe Querying

```ts
// Fetch list with filtering & sorting
const posts = await kyroClient.collection('posts').find({
  where: {
    status: { equals: 'published' },
    category: { equals: 'tech' },
  },
  sort: '-createdAt',
  limit: 10,
  page: 1,
});

// Fetch single document by ID or slug
const post = await kyroClient.collection('posts').findOne({
  where: { slug: 'hello-world' },
});
```

## 3. Static Path Generation (`getStaticPaths` in Astro)

```astro
---
import { createKyroClient } from '@kyro-cms/connect';

export async function getStaticPaths() {
  const client = createKyroClient({ baseUrl: 'http://localhost:4321' });
  const posts = await client.collection('posts').find({ limit: 100 });

  return posts.docs.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
---
```

## 4. Rich Text Rendering with `@kyro-cms/rich-text-react`

In React components or hydrated Astro islands:

```tsx
import { RichTextRenderer } from '@kyro-cms/rich-text-react';

export function ArticleBody({ content }: { content: any }) {
  return (
    <div className="prose">
      <RichTextRenderer content={content} />
    </div>
  );
}
```
