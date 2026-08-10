# @kyro-cms/astro

> Astro 5+ & 7+ integration, Content Layer loaders, Actions, Middleware, Dev Toolbar widget, and Zero-JS components for Kyro CMS.

[![npm version](https://img.shields.io/npm/v/@kyro-cms/astro.svg)](https://www.npmjs.com/package/@kyro-cms/astro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

- **Astro Integration (`kyro()`)**: One-line setup for Kyro CMS backend, API endpoints, and Astro Dev Toolbar.
- **Astro Dev Toolbar App (`kyroDevToolbarIntegration()`)**: Built-in developer widget in Astro's toolbar for quick access to Kyro Admin, API status, and content management.
- **Content Layer Loader (`kyroLoader`)**: Native Astro 5+ Content Layer loader for streaming collections directly into Astro's `getCollection()`.
- **Server Actions & Middleware**: Type-safe Astro server actions (`kyroAction`) and auth middleware (`kyroAuthMiddleware`).
- **Zero-JS Astro Components**: High-performance SSR components (`<KyroImage />`, `<KyroRichText />`, `<KyroServerIsland />`) with zero client-side JavaScript overhead.

---

## Installation

```bash
pnpm add @kyro-cms/astro @kyro-cms/core
```

---

## Quick Start

### 1. Add Integration to `astro.config.mjs`

```javascript
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import kyro from '@kyro-cms/astro';
import { kyroAdmin } from '@kyro-cms/admin/integration';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    react(),
    kyro(), // Includes Kyro CMS API
    kyroAdmin(),
  ],
});
```

---

## Features & Usage

### 🛠️ Astro Dev Toolbar Widget

The Dev Toolbar app provides a quick-access panel right inside Astro's toolbar during `astro dev`.

```javascript
import { kyroDevToolbarIntegration } from '@kyro-cms/astro';

// Added explicitly as an optional integration:
integrations: [
  kyro(),
  kyroDevToolbarIntegration(),
]
```

- **Open Admin**: One-click shortcut to `/admin`.
- **API Status**: Quick link to `/api` health and endpoints.
- **Toggle shortcut**: Press `Shift + Option + D` (Mac) or `Shift + Alt + D` (Windows) in your browser to toggle.

---

### 📦 Content Layer Loader (`kyroLoader`)

Use Kyro CMS content seamlessly with Astro 5+ Content Collections (`src/content/config.ts`):

```typescript
import { defineCollection } from 'astro:content';
import { kyroLoader } from '@kyro-cms/astro';

export const collections = {
  posts: defineCollection({
    loader: kyroLoader({
      collection: 'posts',
      depth: 2,
    }),
  }),
};
```

Query in your `.astro` pages:

```astro
---
import { getCollection } from 'astro:content';

const posts = await getCollection('posts');
---

{posts.map((post) => (
  <article>
    <h2>{post.data.title}</h2>
  </article>
))}
```

---

### 🖼️ Zero-JS UI Components

#### `<KyroImage />`
Optimized responsive image renderer for Kyro Media assets:

```astro
---
import { KyroImage } from '@kyro-cms/astro/components';
---

<KyroImage 
  src={post.data.featuredImage} 
  alt={post.data.title}
  width={800}
  height={600}
  class="rounded-xl shadow-md"
/>
```

#### `<KyroRichText />`
Zero-JS HTML renderer for Kyro Slate / TipTap Lexical RichText JSON structures:

```astro
---
import { KyroRichText } from '@kyro-cms/astro/components';
---

<KyroRichText content={post.data.content} />
```

#### `<KyroServerIsland />`
Render dynamic Kyro content asynchronously with Astro Server Islands fallback:

```astro
---
import { KyroServerIsland } from '@kyro-cms/astro/components';
---

<KyroServerIsland collection="comments" id={post.id}>
  <div slot="fallback">Loading comments...</div>
</KyroServerIsland>
```

---

## License

MIT
