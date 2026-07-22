---
title: Architecture
description: Understand how Kyro CMS integrates seamlessly with Astro's islands architecture and prevents Node.js dependencies from bloating your client bundles.
---

# Architecture & Export Splitting

Kyro is built specifically for **Astro**. Unlike other CMS platforms that were originally designed for Express or Next.js and later adapted for Astro, Kyro is architected around Astro's unique constraints: Server-Side Rendering (SSR), static generation (SSG), and the Islands Architecture.

## The Node.js Dependency Problem

A common issue when integrating a Headless CMS directly into a frontend framework is "dependency bleed." A CMS requires heavy Node.js libraries (database drivers like `pg` or `mongodb`, encryption libraries like `bcrypt`, caching clients like `redis`). 

If your Astro components import configuration files that inadvertently import these Node.js dependencies, Vite will attempt to bundle them for the browser when hydrating your React/Vue islands, causing build crashes or massive bundle sizes.

## Core Export Splitting

To solve this, Kyro implements strict **export splitting**. We provide two distinct entrypoints that guarantee browser safety.

### 1. `@kyro-cms/core` (Server-Only)

This is the primary backend entrypoint. It includes all Node.js built-ins and heavy dependencies. 

You should **only** import from `@kyro-cms/core` in:
- Your `kyro.config.ts` file
- API endpoint files (e.g., `src/pages/api/[...kyro].ts`)
- Astro components that are strictly server-rendered (no `client:*` directives)

```typescript
import { 
  createKyro, 
  createDrizzleAdapter, 
  RedisAuthAdapter 
} from "@kyro-cms/core";
```

### 2. `@kyro-cms/core/client` (Browser-Safe)

This entrypoint is guaranteed to be 100% free of Node.js dependencies. It exports TypeScript types, styling utilities, and lightweight browser helpers.

You should import from `@kyro-cms/core/client` in:
- React/Vue/Svelte components that use `client:load`, `client:idle`, etc.
- Client-side scripts
- Tailwind or styling configuration files

```typescript
import type { KyroConfig, CollectionConfig } from "@kyro-cms/core/client";
import { defaultLightTheme, generateCSSVariables } from "@kyro-cms/core/client";
```

## The Single Config Philosophy

Kyro is entirely driven by a single configuration object. Instead of scattering your models across multiple folders or managing database schemas manually, you define a single `kyro.config.ts`.

From this one file, Kyro automatically generates:
1. **The Database Schema** (and handles migrations via Drizzle)
2. **The REST API** endpoints
3. **The GraphQL Schema** and resolvers
4. **The tRPC Router**
5. **The Admin Dashboard** UI forms and tables
6. **The TypeScript Client SDK**

```typescript
import { defineConfig, createLocalAdapter } from "@kyro-cms/core";
import { z } from "zod";

export default defineConfig({
  adapter: createLocalAdapter({ path: "./data.db" }),
  collections: [
    // Your entire app architecture is defined here
  ]
});
```

By passing this configuration to the `createApiHandler` (for your backend) and the `<Admin />` component (for your frontend), the entire system stays perfectly synchronized.

## GraphQL Schema

The GraphQL schema is built statically at startup. A per-request `RelationLoader` batches relationship lookups (DataLoader pattern) to prevent N+1 queries. The schema includes Apollo Federation `@key` directives and Relay Connection types.

## Shared Access Control

Access control is unified across all three protocols (REST, GraphQL, tRPC) via the shared `checkCollectionAccess()` / `checkGlobalAccess()` functions in `src/access/checker.ts`.

## kyro-connect Typed SDK

The kyro-connect SDK provides a fully typed client with generic `CollectionClient<T, F>`, `GqlClient`, and `UploadClient` classes.
