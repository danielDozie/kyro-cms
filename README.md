# Kyro CMS

<div align="center">

**Astro-native headless CMS with multi-database adapters, multi-protocol APIs, and an admin dashboard built-in.**

[![npm version](https://img.shields.io/npm/v/@kyro-cms/core.svg)](https://www.npmjs.com/package/@kyro-cms/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

<br />

[![Cloudflare](https://img.shields.io/badge/Deploy_to-Cloudflare-18181B?style=for-the-badge&logo=cloudflare&logoColor=F38020)](https://deploy.workers.cloudflare.com/?url=https://github.com/danielDozie/kyro-cms)
[![Vercel](https://img.shields.io/badge/Deploy_with-Vercel-18181B?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FdanielDozie%2Fkyro-cms)
[![Netlify](https://img.shields.io/badge/Deploy_to-Netlify-18181B?style=for-the-badge&logo=netlify&logoColor=00C7B7)](https://app.netlify.com/start/deploy?repository=https://github.com/danielDozie/kyro-cms)
[![Railway](https://img.shields.io/badge/Deploy_on-Railway-18181B?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app/new/template?template=https%3A%2F%2Fgithub.com%2FdanielDozie%2Fkyro-cms)

</div>

---

## What Kyro Gives You

Kyro turns a single TypeScript config into a full CMS backend for Astro, including:

- **REST, GraphQL, tRPC, and WebSocket APIs** from the same collection schema
- **Local SQLite development** plus production-ready PostgreSQL and MongoDB adapters
- **Auto-generated admin UI** with forms, media, auth, and drafts
- **End-to-end type safety** powered by Zod and TypeScript
- **Plugin-friendly architecture** for custom hooks, fields, and dashboard extensions

---

## Quick Start

### Create a new Kyro project

```bash
pnpm create kyro@latest my-project
cd my-project
pnpm install
pnpm dev
```

Open:

- `http://localhost:4321` — public site
- `http://localhost:4321/admin` — admin dashboard

### Add Kyro to an existing project

```bash
pnpm install @kyro-cms/core
```

```typescript
// kyro.config.ts
import { defineConfig, createLocalAdapter } from "@kyro-cms/core";

export default defineConfig({
  name: "my-app",
  adapter: createLocalAdapter({ path: "./data.db" }),
  collections: {
    posts: {
      slug: "posts",
      label: "Posts",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "slug", type: "text", required: true },
        { name: "content", type: "richtext" },
        { name: "published", type: "checkbox", defaultValue: false },
      ],
    },
  },
});
```

---

## Why Kyro

Kyro is designed for Astro-first content applications:

- **Fast dev setup:** zero-config local SQLite support
- **Unified API surface:** one schema powers REST, GraphQL, tRPC, and WebSockets
- **Production-ready:** swap adapters without rewriting collections
- **Admin experience:** auto-generated UIs, auth, RBAC, and draft workflows

---

## Core Concepts

### Database adapters

Kyro uses a shared adapter layer so the same collection schema works across:

- **SQLite** — instant local development
- **PostgreSQL** — production SQL with Drizzle
- **MongoDB** — flexible document storage

### API protocols

Use multiple protocols at once, depending on your app needs:

- **REST** for simple CRUD and integration compatibility
- **GraphQL** for nested queries and schema introspection
- **tRPC** for fully type-safe client-server calls
- **WebSocket** for real-time subscriptions and live updates

### Astro-safe exports

Kyro preserves Astro compatibility with two entrypoints:

- `@kyro-cms/core` — server-only backend logic, adapters, auth, and APIs
- `@kyro-cms/core/client` — browser-safe client utilities, types, and UI helpers

### Companion Packages

Kyro is designed as a modular ecosystem:
- `@kyro-cms/astro` — Astro 5+ & 7+ integration, Content Layer loaders, Astro Dev Toolbar widget, and Zero-JS UI components.
- `@kyro-cms/admin` — Auto-generated React admin dashboard with media manager, auth, RBAC, and draft workflows.
- `@kyro-cms/connect` — Universal, type-safe API client and codegen for any framework.
- `@kyro-cms/ai` — Vercel AI SDK integration for automated content generation and AI admin assistance.
- `@kyro-cms/rich-text-react` — Headless React renderer for Kyro RichText content schemas.
---

## Example usage

### REST

```bash
GET /api/posts
GET /api/posts/:id
POST /api/posts
PATCH /api/posts/:id
DELETE /api/posts/:id
```

### GraphQL

```graphql
query {
  postsFind(where: {}, page: 1, limit: 10) {
    docs {
      id
      title
      slug
    }
    totalDocs
  }
}
```

### tRPC

```typescript
const response = await client.posts.find.query({ page: 1, limit: 10 });
```

---

## Learn more

- `docs/getting-started.md` — setup and first app walkthrough
- `docs/architecture.md` — how Kyro works under the hood
- `docs/api.md` — API protocols and usage patterns
- `docs/database.md` — supported adapters and configuration

---

## License

MIT
