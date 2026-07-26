---
title: Deployment
description: Learn how to deploy your Kyro CMS instance to production using Vercel, Cloudflare Workers, Railway, or Docker.
---

# Deployment Guide

Because Kyro CMS is Astro-native and Edge-ready out-of-the-box, deploying it is virtually identical to deploying any standard Astro SSR application.

---

## 1. Environment Variables

Before deploying, ensure your target environment has the following variables configured:

```bash
# REQUIRED: A random 32+ character string used to sign JWT session tokens
KYRO_SECRET=your-secure-random-string-here

# REQUIRED: Your database connection string (PostgreSQL, Neon, MongoDB, or SQLite)
KYRO_DATABASE_URL=postgresql://user:password@host:5432/kyro_cms

# OPTIONAL: Used to bootstrap your first admin user on a fresh database
KYRO_ADMIN_EMAIL=admin@yourdomain.com
KYRO_ADMIN_PASSWORD=SecurePassword123!
```

---

## 2. Option 1: Vercel (Serverless & Edge Ready)

Vercel provides seamless deployment for Astro and Kyro CMS.

### Deployment Steps:
1. Push your codebase to GitHub.
2. Import the repository into Vercel.
3. Ensure the framework preset is set to **Astro**.
4. Add your `KYRO_DATABASE_URL` and `KYRO_SECRET` under Vercel Environment Variables.
5. Click **Deploy**.

### Node.js Serverless vs Vercel Edge:

* **Node.js Serverless (Default)**: Fully compatible out-of-the-box with all Kyro database adapters (SQLite, PostgreSQL, MongoDB) and native image tools (`sharp`).
* **Vercel Edge & Cloudflare Workers**: Use Edge-native HTTP adapters such as `createNeonAdapter()` or Cloudflare Turso (`@libsql/client`). Image uploads automatically use Web-standard fallback processing.

#### Edge Setup Example (`kyro.config.ts`):
```typescript
import { defineConfig } from '@kyro-cms/core';
import { createTursoAdapter, createNeonAdapter } from '@kyro-cms/core';

export default defineConfig({
  // Edge-ready libSQL / Turso adapter
  db: createTursoAdapter({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  }),
});
```

### Kyro Admin Dashboard on Edge:

* **Static CDN Delivery**: The `@kyro-cms/admin` React UI dashboard is served statically across global edge CDNs (Vercel CDN, Cloudflare Pages).
* **Edge API Requests**: Admin dashboard interactions (CRUD, draft previews, field changes) communicate via standard `fetch()` API calls to your Edge API handlers.

---

## 3. Option 2: Cloudflare Workers / Pages

Kyro CMS runs natively on Cloudflare Workers and Pages Edge runtimes without native Node.js binary dependencies.

1. Install the Cloudflare Astro adapter: `pnpm add @astrojs/cloudflare`
2. Configure `astro.config.mjs`:
   ```javascript
   import { defineConfig } from 'astro/config';
   import cloudflare from '@astrojs/cloudflare';
   import kyro from '@kyro-cms/astro';

   export default defineConfig({
     output: 'server',
     adapter: cloudflare(),
     integrations: [kyro()],
   });
   ```
3. Deploy with Wrangler: `pnpm dlx wrangler pages deploy`

---

## 4. Option 3: Railway

Railway makes it simple to provision a PostgreSQL database and host your Kyro CMS frontend simultaneously.

1. Install Railway CLI: `npm i -g @railway/cli`
2. Authenticate: `railway login`
3. Provision PostgreSQL: `railway add` $\rightarrow$ Select **PostgreSQL**.
4. Deploy: `railway up`

---

## 5. Option 4: Docker (VPS / AWS / DigitalOcean)

For hosting on custom infrastructure, Docker provides a production-ready container setup using `docker-compose.yml`:

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "4321:4321"
    environment:
      - KYRO_DATABASE_URL=postgresql://kyro:kyro@db:5432/kyro
      - KYRO_SECRET=change_me_in_production
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=kyro
      - POSTGRES_PASSWORD=kyro
      - POSTGRES_DB=kyro
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

To run: `docker-compose up -d`

---

## 6. Framework Agnostic & Standalone Deployment

While Kyro CMS features native integration with Astro via `@kyro-cms/astro`, the core backend engine (`@kyro-cms/core`) is **100% framework-agnostic**. Built on top of Hono and Web Standard Fetch APIs (`Request` / `Response`), Kyro can be embedded or deployed across any JavaScript runtime or full-stack framework.

### Option A: Standalone Node.js HTTP Server (`@hono/node-server`)

For microservice architectures or dedicated API backends deployed on Docker, Railway, Render, or AWS EC2:

```typescript
// server.ts
import { serve } from "@hono/node-server";
import { createKyro, defineConfig, createDrizzleAdapter } from "@kyro-cms/core";
import config from "./kyro.config";

// Initialize the Kyro backend instance
const kyro = await createKyro({
  config: defineConfig({
    ...config,
    server: {
      port: Number(process.env.PORT) || 4000,
      cors: {
        origins: [process.env.PUBLIC_FRONTEND_URL || "http://localhost:3000"],
        credentials: true,
      },
    },
  }),
});

const PORT = Number(process.env.PORT) || 4000;

console.log(`[Kyro CMS] Initializing standalone backend server on port ${PORT}...`);

serve({
  fetch: kyro.handler,
  port: PORT,
}, (info) => {
  console.log(`[Kyro CMS] Backend running at http://localhost:${info.port}`);
  console.log(`[Kyro CMS] REST API:     http://localhost:${info.port}/api`);
  console.log(`[Kyro CMS] GraphQL API:  http://localhost:${info.port}/api/graphql`);
  console.log(`[Kyro CMS] tRPC API:     http://localhost:${info.port}/api/trpc`);
});
```

### Option B: Native Bun Runtime (`Bun.serve`)

Bun provides ultra-fast HTTP request handling natively out of the box with zero additional dependencies:

```typescript
// server.bun.ts
import { createKyro, defineConfig } from "@kyro-cms/core";
import config from "./kyro.config";

const kyro = await createKyro({ config });
const PORT = Number(process.env.PORT) || 4000;

export default {
  port: PORT,
  fetch(request: Request) {
    return kyro.handler(request);
  },
};

console.log(`[Kyro CMS] Bun server active on http://localhost:${PORT}`);
```

### Option C: Next.js (App Router Route Handler)

Mount Kyro inside a Next.js 14/15 application to serve CMS endpoints under `/api/[...kyro]`:

```typescript
// app/api/[...kyro]/route.ts
import { createKyro } from "@kyro-cms/core";
import config from "@/kyro.config";

// Instantiate the Kyro request handler
const kyro = await createKyro({ config });

// Export standard Next.js App Router HTTP method handlers
export const GET = (req: Request) => kyro.handler(req);
export const POST = (req: Request) => kyro.handler(req);
export const PUT = (req: Request) => kyro.handler(req);
export const PATCH = (req: Request) => kyro.handler(req);
export const DELETE = (req: Request) => kyro.handler(req);
export const OPTIONS = (req: Request) => kyro.handler(req);
```

### Option D: SvelteKit (`+server.ts`)

Mount Kyro in a catch-all SvelteKit server endpoint:

```typescript
// src/routes/api/[...kyro]/+server.ts
import { createKyro } from "@kyro-cms/core";
import config from "$lib/kyro.config";

const kyro = await createKyro({ config });

export const fallback = ({ request }: { request: Request }) => {
  return kyro.handler(request);
};
```

### Option E: Nuxt 3 (`server/api/[...kyro].ts`)

Mount Kyro inside a Nuxt 3 server route using H3 event handlers:

```typescript
// server/api/[...kyro].ts
import { createKyro } from "@kyro-cms/core";
import config from "~~/kyro.config";

const kyro = await createKyro({ config });

export default defineEventHandler((event) => {
  return kyro.handler(toWebRequest(event));
});
```

---

## 7. Database Migrations

During build or CI/CD pipelines, run the Kyro CLI migration command to keep database schemas in sync:

```bash
npx kyro migrate
```
