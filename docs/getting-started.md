---
title: Getting Started
description: Quick start guide to creating a Kyro CMS project or adding it to an existing Astro app.
---

# Getting Started

Kyro CMS is built for **Astro** from the ground up. Unlike other CMS solutions that bolt on Astro support, Kyro is architected to leverage Astro's islands architecture, server output modes, and performance-first approach.

## Option 1: Create New Project (Recommended)

The easiest way to start is with the `create-kyro` CLI, which scaffolds a fresh Astro project pre-configured with Kyro CMS, a database adapter, and styling of your choice.

```bash
npm create kyro@latest
```

This will launch an interactive wizard that asks you a few questions:

1. **Project name**: The name of your new directory.
2. **Database**: Choose between SQLite (default/dev), PostgreSQL, or MongoDB.
3. **Styling**: Tailwind CSS, CSS Modules, Styled Components, or None.
4. **Authentication**: Enable JWT authentication and role-based access.
5. **Starting template**: Choose from Blog, E-Commerce, Minimal, or Kitchen Sink templates.

Once complete, `cd` into your project and start the development server:

```bash
cd my-kyro-app
npm install
npm run dev
```

Visit `http://localhost:4321/admin` to access your new CMS dashboard, and `http://localhost:4321/graphql` for the interactive GraphQL playground.

## Option 2: Add to Existing Astro Project

If you already have an Astro project, you can easily integrate Kyro CMS.

### 1. Install Dependencies

::: info Modular Architecture
Kyro CMS features a decoupled architecture split into two packages:
- **`@kyro-cms/core`** — Headless CMS engine, ORM adapters, and auto-generated APIs (REST, GraphQL, tRPC, WebSocket).
- **`@kyro-cms/admin`** — React-powered visual management dashboard.

Install both packages for the complete CMS experience, or use `@kyro-cms/core` standalone for headless API-only backends.
:::

```bash
npm install @kyro-cms/core @kyro-cms/admin
```

### 2. Create your Configuration

At the root of your project, create a `kyro.config.ts` file. This is the **single source of truth** for your entire CMS.

```typescript
// kyro.config.ts
import { defineConfig, createLocalAdapter } from "@kyro-cms/core";
import { allSettingsGlobals } from "@kyro-cms/core/templates";

export default defineConfig({
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
  globals: allSettingsGlobals,
});
```

> [!IMPORTANT]
> **The `globals: allSettingsGlobals` property is required.** This registers all of Kyro's built-in settings panels (Site, SEO, Brand, Email, Storage, Access, Store, Shipping, and System) with both the admin dashboard and the API layer. Without it:
> - The **Settings** section in the admin UI will be empty — none of the settings pages will render.
> - **API endpoints** for reading and updating settings (e.g., site name, SEO defaults, email config) will not be registered.
> - Features that depend on settings data (like storage configuration, access control, and email delivery) will fail silently at runtime.
>
> Always include `globals: allSettingsGlobals` in every `kyro.config.ts` file.

> [!TIP]
> **Using Pre-built Templates:** Instead of writing collections from scratch, you can import Kyro's pre-built templates (like `blog`, `ecommerce`, `minimal`) directly into your config. The `globals` property is still required:
> ```typescript
> import { defineConfig, createLocalAdapter } from "@kyro-cms/core";
> import { templateCollections, allSettingsGlobals } from "@kyro-cms/core/templates";
>
> export default defineConfig({
>   adapter: createLocalAdapter({ path: "./data.db" }),
>   collections: templateCollections.blog,
>   globals: allSettingsGlobals,
> });
> ```

### 3. Add the Astro Integration

Update your `astro.config.mjs` to include the Kyro integration and the Admin UI:

```js
import { defineConfig } from "astro/config";
import kyro from "@kyro-cms/core/integration";
import { kyroAdmin } from "@kyro-cms/admin";

export default defineConfig({
  integrations: [
    kyro(),
    kyroAdmin() // By default mounts at `/admin`
  ],
});
```

This automatically sets up your API routes and mounts the admin dashboard at `/admin`.

> [!TIP]
> **Customizing Base Paths:** You can easily change where Kyro CMS mounts its Admin UI and API. In your `astro.config.mjs`, simply pass the `basePath` and `apiPath` options to the integrations. All internal links and routes are fully dynamic and will automatically adjust!
> ```typescript
> export default defineConfig({
>   integrations: [
>     kyro({ apiPath: "/kyro-api" }),
>     kyroAdmin({ basePath: "/dashboard", apiPath: "/kyro-api" })
>   ],
> });
> ```

### 4. Setup API Routes (Optional)

If you need custom API behavior, create an endpoint at `src/pages/api/[...kyro].ts`:

```typescript
// src/pages/api/[...kyro].ts
import { createKyroServer } from '@kyro-cms/core/api-handler';
import config from '../../kyro.config';

export const all = createKyroServer(config);
```

### 5. Start the Server

Start your Astro development server:

```bash
npm run dev
```

You can now access:
- **Admin Dashboard:** `http://localhost:4321/admin`
- **GraphQL Playground:** `http://localhost:4321/graphql`
- **REST API Base:** `http://localhost:4321/api`

## Next Steps

Now that you're up and running, dive into the core concepts:

- Understand the [Architecture](/architecture)
- Configure your [Database Adapter](/guides/database-adapters)

- Explore the [Multi-Protocol APIs](/reference/api-overview)