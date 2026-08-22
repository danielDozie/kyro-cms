# Kyro CMS

<div align="center">

**Astro-native headless CMS with multi-database adapters, multi-protocol APIs, and an admin dashboard built-in.**

[![npm version](https://img.shields.io/npm/v/@kyro-cms/core.svg)](https://www.npmjs.com/package/@kyro-cms/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

<br />

</div>

---

## What Kyro Gives You

Kyro turns a single TypeScript config into a full CMS backend for Astro, including:

- **REST, GraphQL, tRPC, and WebSocket APIs** from the same collection schema
- **Local SQLite development** plus production-ready PostgreSQL and MongoDB adapters
- **Auto-generated admin UI** with forms, media, auth, live preview, and draft workflows
- **End-to-end type safety** powered by Zod and TypeScript
- **Plugin-friendly architecture** for custom hooks, fields, and dashboard extensions

---

## Quick Start

### Create a new Kyro project

```bash
pnpm create @kyro-cms@latest my-project
# or
npm create @kyro-cms@latest my-project
# or
bun create @kyro-cms@latest my-project

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
import { defineKyroConfig, createLocalAdapter } from "@kyro-cms/core";

export default defineKyroConfig({
  name: "my-app",
  adapter: createLocalAdapter({ path: "./data/kyro.db" }),
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

- **Fast dev setup:** zero-config local SQLite support (`createLocalAdapter({ path: "./data/kyro.db" })`)
- **High-performance engine:** batched relationship population, zero-latency access control checks, and ~99% smaller ESM entrypoints
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
- `@kyro-cms/field-locations` — Pre-built geographic SelectFields for Kyro CMS.
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

### Kyro Connect SDK

Type-safe client + codegen for any platform (Node.js, browser, Deno, Bun):

```bash
pnpm add @kyro-cms/connect
```

```typescript
import { createClient } from "@kyro-cms/connect";
import type { KyroAppRouter } from "./kyro.generated";

const api = createClient<KyroAppRouter>({
  url: "http://localhost:4321/api/trpc",
  apiKey: "kyro_xxx",
});

const posts = await api["posts"].find.query({ page: 1, limit: 10 });
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
