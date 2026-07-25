---
title: Database Adapters
description: Learn how Kyro CMS supports multiple database adapters, allowing you to use SQLite, PostgreSQL, MongoDB, Neon, or Turso out-of-the-box.
---

# Database Adapters

Kyro CMS is designed to be completely database-agnostic at the collection level. Because your data models are defined using standard Zod schemas in `kyro.config.ts`, Kyro translates those definitions into the native schema format of your chosen database.

This means you can start building immediately using a local SQLite file, and seamlessly switch to managed PostgreSQL, Neon HTTP, or Turso Edge databases—**without altering a single line of your collection schemas.**

---

## Supported Adapters

Kyro supports 5 official database adapters out-of-the-box:

### 1. SQLite Adapter (Local & Development)

The `createLocalAdapter` is the default adapter for local development. It uses a local `.db` file powered by `node:sqlite`.

```typescript
import { defineConfig, createLocalAdapter } from "@kyro-cms/core";

export default defineConfig({
  adapter: createLocalAdapter({ path: "./data.db" }),
});
```

---

### 2. Neon HTTP Adapter (Edge-Native PostgreSQL)

The `createNeonAdapter` connects to Neon PostgreSQL over Web-standard `fetch` HTTP requests. It is **100% Edge-ready** for Vercel Edge Functions, Cloudflare Workers, and Netlify Edge.

```typescript
import { defineConfig, createNeonAdapter } from "@kyro-cms/core";

export default defineConfig({
  adapter: createNeonAdapter({
    connectionString: process.env.DATABASE_URL!,
  }),
});
```

---

### 3. Turso / libSQL Adapter (Edge-Native SQLite)

The `createTursoAdapter` connects to Turso / libSQL databases over Web-standard HTTP requests. It allows ultra-fast SQLite capabilities on V8 Edge isolates without requiring native C++ binaries.

```typescript
import { defineConfig, createTursoAdapter } from "@kyro-cms/core";

export default defineConfig({
  adapter: createTursoAdapter({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  }),
});
```

---

### 4. PostgreSQL Adapter (Production SQL)

For robust relational data storage in standard Node.js server environments, use `createDrizzleAdapter`.

```typescript
import { defineConfig, createDrizzleAdapter } from "@kyro-cms/core";

export default defineConfig({
  adapter: createDrizzleAdapter({
    connectionString: process.env.DATABASE_URL!,
  }),
});
```

---

### 5. MongoDB Adapter (NoSQL Document Store)

If your data is document-oriented, use `createMongoDBAdapter`.

```typescript
import { defineConfig, createMongoDBAdapter } from "@kyro-cms/core";

export default defineConfig({
  adapter: createMongoDBAdapter({
    connectionString: process.env.MONGODB_URI!,
  }),
});
```

---

## Dynamic Edge Adapter Selection

A common pattern is to choose between local SQLite in development and Turso or Neon in production:

```typescript
import { 
  defineConfig, 
  createLocalAdapter, 
  createTursoAdapter 
} from "@kyro-cms/core";

const isProduction = process.env.NODE_ENV === "production";

const adapter = isProduction
  ? createTursoAdapter({ 
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN 
    })
  : createLocalAdapter({ path: "./dev-data.db" });

export default defineConfig({
  adapter,
});
```
