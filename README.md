# Kyro CMS

<div align="center">

**Astro-native headless CMS with multi-database adapters, multi-protocol APIs, and a built-in React admin dashboard.**

[![npm version](https://img.shields.io/npm/v/@kyro-cms/core.svg)](https://www.npmjs.com/package/@kyro-cms/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

</div>

---

## What Kyro Gives You

Kyro turns a single TypeScript config (`kyro.config.ts`) into a full CMS backend for Astro:

- **Unified Multi-Protocol APIs**: Auto-generated REST, GraphQL, tRPC, and WebSocket endpoints from the same collection schema.
- **Multi-Database Adapters**: Instant local SQLite development plus production PostgreSQL (Drizzle) and MongoDB adapters.
- **Built-in Admin Dashboard**: Auto-generated React UI with field builders, live preview, version history, media manager, auth, and RBAC.
- **End-to-End Type Safety**: Schema types and validation powered by TypeScript and Zod.
- **Extensible Architecture**: Custom plugins, lifecycle hooks, field components, and dashboard widgets.

---

## Quick Start

### 1. Create a New Kyro Project

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
- `http://localhost:4321` — Public Astro site
- `http://localhost:4321/admin` — CMS Admin Dashboard

### 2. Add Kyro to an Existing Astro Project

```bash
pnpm add @kyro-cms/core @kyro-cms/admin
```

```typescript
// kyro.config.ts
import { defineKyroConfig, createLocalAdapter } from "@kyro-cms/core";

export default defineKyroConfig({
  adapter: createLocalAdapter({ path: "./data/kyro.db" }),
  collections: [
    {
      slug: "posts",
      label: "Posts",
      admin: {
        useAsTitle: "title",
        icon: "lucide:Newspaper",
        group: "Content",
        defaultColumns: ["title", "slug", "updatedAt"],
      },
      fields: [
        { name: "title", type: "text", required: true },
        {
          name: "slug",
          type: "text",
          required: true,
          admin: { position: "sidebar", autoGenerate: "title" },
        },
        { name: "content", type: "richtext" },
        {
          name: "published",
          type: "checkbox",
          defaultValue: false,
          admin: { position: "sidebar" },
        },
      ],
    },
  ],
});
```

---

## Core Concepts

### Database Adapters

Kyro uses a shared adapter layer so the same collection schema works across different databases without code changes:

- **SQLite (`createLocalAdapter`)** — Zero-config instant local file database.
- **PostgreSQL (`createDrizzleAdapter`)** — Production SQL powered by Drizzle ORM.
- **MongoDB (`createMongoDBAdapter`)** — Flexible document store for scalable applications.

### API Protocols

One schema definition automatically powers four API layers:

- **REST** (`/api/:collection`) — Standard JSON CRUD endpoints.
- **GraphQL** (`/api/graphql`) — Type-safe nested queries, mutations, and schema introspection.
- **tRPC** (`/api/trpc`) — End-to-end type-safe RPC client without schema generation.
- **WebSocket** (`/api/ws`) — Real-time live subscriptions and document presence.

### Modular Packages

- **`@kyro-cms/core`**: Core engine, database adapters, auth, and API handlers.
- **`@kyro-cms/admin`**: Auto-generated admin dashboard with media manager, RBAC, and draft workflows.
- **`@kyro-cms/astro`**: Astro integration, Content Layer loaders, and Astro Dev Toolbar widget.
- **`@kyro-cms/connect`**: Universal, type-safe client SDK and CLI codegen.
- **`@kyro-cms/ai`**: AI-powered content generation and admin assistance via Vercel AI SDK.

---

## Collection Admin Configuration

Configure how collections look and behave inside the admin UI using the `admin` property:

```typescript
export const foodMenuCollection: CollectionConfig = {
  slug: "food-menu",
  label: "Food Menu",
  admin: {
    group: "Restaurant Menu",          // Collapsible sidebar section name
    order: 1,                          // Sorting position inside the section
    icon: "lucide:Utensils",           // "lucide:<name>", "hero:<name>", or "hero-solid:<name>"
    useAsTitle: "name",                // Field to display as title in lists & relation dropdowns
    defaultColumns: ["name", "category", "price"], // Default table columns
    description: "Manage restaurant food items and pricing",
  },
  fields: [ /* ... */ ],
};
```

| Property | Type | Description |
| :--- | :--- | :--- |
| `group` / `folder` | `string` | Categorizes the collection under a collapsible sidebar navigation drawer (e.g. `"Commerce"`, `"Restaurant Menu"`). |
| `order` | `number` | Controls the sorting order within the sidebar group (lower numbers first). |
| `icon` | `string` | Icon from [Lucide](https://lucide.dev/icons) (`"lucide:Utensils"`, `"Receipt"`) or [Heroicons](https://heroicons.com/) (`"hero:Sparkles"`, `"hero-solid:Fire"`). |
| `useAsTitle` | `string` | Field key displayed as the main title in list views, breadcrumbs, and relation pickers. |
| `defaultColumns` | `string[]` | Array of field keys rendered as default columns in the list table. |
| `description` | `string` | Subtitle description shown beneath the collection header. |
| `hidden` | `boolean` | When `true`, hides the collection from sidebar navigation while keeping APIs active. |
| `disablePreview` | `boolean` | Disables the live preview split view for this collection. |
| `disableDuplicate` | `boolean` | Hides the document duplicate action in the edit form. |

---

## Field Admin Configuration

Customize individual fields in edit forms with the `admin` property:

```typescript
{
  name: "items",
  type: "array",
  label: "Order Items",
  admin: {
    readOnly: true,
    display: "pills", // Displays items as compact inline pill capsules with count multipliers
  },
  fields: [
    { name: "name", type: "text", label: "Item Name" },
    { name: "quantity", type: "number", label: "Qty" },
    { name: "total", type: "number", label: "Total" },
  ],
}
```

| Property | Type | Description |
| :--- | :--- | :--- |
| `position` | `"sidebar" \| "main"` | Places the field in the sticky sidebar panel (ideal for status, dates, slug, badges) vs main form. |
| `display` | `"pills" \| "default"` | Array layout mode. `"pills"` renders compact line-item badge capsules with count multipliers and totals. |
| `collapsible` | `boolean` | Renders group fields with interactive collapsible accordion headers. |
| `initCollapsed` | `boolean` | Starts accordions, groups, and array cards closed by default. |
| `autoGenerate` | `string` | Auto-generates slug values from another field (e.g. `autoGenerate: "title"`). |
| `readOnly` | `boolean \| Function` | Displays field value as read-only. |
| `hidden` | `boolean \| Function` | Hides field from the admin UI form completely. |

---

## API Examples

### REST

```bash
GET    /api/posts
GET    /api/posts/:id
POST   /api/posts
PATCH  /api/posts/:id
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

### Server-Side (Astro Pages & Endpoints)

Query the database directly with zero network overhead:

```astro
---
import { getKyro } from "@kyro-cms/astro";

const kyro = await getKyro();
const { docs: posts } = await kyro.find({ collection: "posts", limit: 10 });
---

<ul>
  {posts.map((post) => (
    <li>{post.title}</li>
  ))}
</ul>
```

### Client SDK (`@kyro-cms/connect`)

Type-safe client for frontend frameworks (Next.js, Remix, SvelteKit, React):

```bash
pnpm add @kyro-cms/connect
```

```typescript
import { createClient } from "@kyro-cms/connect";

const api = createClient({ url: "http://localhost:4321/api/trpc" });
const { docs: posts } = await api.posts.find({ limit: 10 });
```

---

## Documentation

Comprehensive guides, API references, and architecture docs are available in the **[`kyro-docs`](https://kyro-cms.com)** site:

- **[Getting Started Guide](https://kyro-cms.com/getting-started.html)** — First-time setup & walkthrough
- **[Configuration Reference](https://kyro-cms.com/reference/configuration.html)** — Full `kyro.config.ts` reference
- **[Field Types Reference](https://kyro-cms.com/guides/field-types.html)** — All 25+ schema field types
- **[Admin Customization](https://kyro-cms.com/guides/admin-customization.html)** — Layouts, plugins, and overrides

---

## License

MIT © [Kyro CMS](https://kyro-cms.com)