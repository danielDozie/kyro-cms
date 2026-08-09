---
name: astro-kyro-integration
description: Essential guidelines for integrating Kyro CMS into Astro applications, handling route injection, externalizing server dependencies, and rendering content.
---

# Astro + Kyro CMS Integration Guide

Use this skill when configuring or troubleshooting `@kyro-cms/astro` integration inside Astro projects.

## 1. Integration Setup (`astro.config.mjs`)

Always initialize the `kyro()` integration inside `astro.config.mjs`:

```ts
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import kyro from '@kyro-cms/astro';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    react(),
    kyro({
      configPath: './kyro.config.ts',
      apiPath: '/api',
      adminPath: '/admin',
      admin: true,
      enableGraphQL: false,
      enableTRPC: false,
    }),
  ],
});
```

## 2. Server vs Client Externalization Rules

Kyro CMS strictly segregates server-only dependencies from browser packages in `src/integration.ts`:

- **Server-Only Externals**: `@kyro-cms/core`, `@kyro-cms/admin`, `@kyro-cms/astro`, `@kyro-cms/ai` and native C++ binaries (`better-sqlite3`, `sharp`, `pg`, `cpu-features`, `ssh2`). These are kept in `KYRO_SERVER_PACKAGES` & `NATIVE_BINARY_EXTERNALS`.
- **Client-Safe Packages**: Only `@kyro-cms/connect` and `@kyro-cms/rich-text-react` may be imported inside hydrated client components (`client:load`, `client:visible`).

## 3. Dynamic Route Injections

The `kyro()` integration automatically injects API handlers at runtime:
- `/api/[...kyro]` $\rightarrow$ `api-handler.ts` (REST, GraphQL, tRPC handlers)
- `/admin` & `/admin/[...path]` $\rightarrow$ `@kyro-cms/admin` React UI app

Ensure `apiPath` and `adminPath` do not collide.

## 4. Querying Content in Astro Pages

In `.astro` page templates, query the CMS directly using `@kyro-cms/connect`:

```astro
---
import Layout from '../../layouts/Layout.astro';
import { createKyroClient } from '@kyro-cms/connect';

const client = createKyroClient({ baseUrl: Astro.url.origin });
const { slug } = Astro.params;

const post = await client.collection('posts').findOne({ where: { slug } });
if (!post) return Astro.redirect('/404');
---

<Layout title={post.title}>
  <h1>{post.title}</h1>
  <article set:html={post.contentHtml} />
</Layout>
```
