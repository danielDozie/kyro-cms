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

## 6. Database Migrations

During build or CI/CD pipelines, run the Kyro CLI migration command to keep database schemas in sync:

```bash
npx kyro migrate
```
