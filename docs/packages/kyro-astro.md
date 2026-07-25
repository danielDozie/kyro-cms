---
title: "@kyro-cms/astro"
description: Astro 5+ native integration package for Kyro CMS containing Content Layer loaders, Actions, Middleware, Dev Toolbar widget, and Zero-JS components.
---

# `@kyro-cms/astro`

The `@kyro-cms/astro` package provides native Astro 5+ integrations for Kyro CMS. It allows you to query CMS collections using Astro's Content Layer, validate form submissions via Astro Actions, protect routes using Astro Middleware, monitor CMS status in Astro's Dev Toolbar, and render content using Zero-JS `.astro` components.

---

## Installation

```bash
pnpm add @kyro-cms/core @kyro-cms/astro
```

---

## Features & Usage

### 1. Astro Integration (`kyro`)

Configures Vite aliases (`kyro:config`), externalizes native database drivers, and injects REST/GraphQL/tRPC endpoints:

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import kyro from '@kyro-cms/astro';

export default defineConfig({
  integrations: [
    kyro({
      configPath: './kyro.config.ts',
      apiPath: '/api',
      adminPath: '/admin',
      enableGraphQL: true,
    }),
  ],
});
```

---

### 2. Content Layer Loader (`kyroLoader`)

Feeds Kyro collection documents into Astro's `getCollection()` store:

```typescript
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { kyroLoader } from '@kyro-cms/astro';

export const blog = defineCollection({
  loader: kyroLoader({ collection: 'posts', drafts: import.meta.env.DEV }),
});
```

---

### 3. Astro Actions (`kyroAction`)

Type-safe RPC and form submission handler validated against Kyro collection Zod schemas:

```typescript
// src/actions/index.ts
import { kyroAction } from '@kyro-cms/astro';
import { z } from 'zod';

export const server = {
  submitContact: kyroAction({
    collection: 'submissions',
    action: 'create',
    schema: z.object({
      name: z.string().min(2),
      email: z.string().email(),
    }),
  }),
};
```

---

### 4. Auth Middleware (`kyroAuthMiddleware`)

Protects routes and injects session data into `Astro.locals.kyroUser`:

```typescript
// src/middleware.ts
import { kyroAuthMiddleware } from '@kyro-cms/astro';

export const onRequest = kyroAuthMiddleware({
  protectedRoutes: ['/dashboard/**'],
  loginPath: '/admin/login',
});
```

---

### 5. Dev Toolbar Widget (`kyroDevToolbarIntegration`)

Registers the Kyro CMS Dev Toolbar widget:

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { kyroDevToolbarIntegration } from '@kyro-cms/astro';

export default defineConfig({
  integrations: [kyroDevToolbarIntegration()],
});
```

---

### 6. Zero-JS `.astro` Components

- **`<KyroImage />`**: Responsive media image renderer (`import KyroImage from '@kyro-cms/astro/components/KyroImage.astro'`).
- **`<KyroRichText />`**: Zero-JS Rich Text AST renderer (`import KyroRichText from '@kyro-cms/astro/components/KyroRichText.astro'`).
- **`<KyroServerIsland />`**: Server Island helper for dynamic deferment (`import KyroServerIsland from '@kyro-cms/astro/components/KyroServerIsland.astro'`).
