---
title: Database Adapters
description: Learn how Kyro CMS supports multiple database adapters, allowing you to use SQLite for development and PostgreSQL or MongoDB for production without changing your config.
---

# Database Adapters

Kyro CMS is designed to be completely database-agnostic at the collection level. Because your data models are defined using standard Zod schemas in `kyro.config.ts`, Kyro can translate those definitions into the native schema format of your chosen database.

This means you can start building immediately with zero configuration using a local SQLite file, and seamlessly switch to a managed PostgreSQL instance when you're ready for production—**without altering a single line of your collection schemas.**

## Supported Adapters

Kyro currently supports three official database adapters:

### 1. SQLite Adapter (Local & Development)

The `createLocalAdapter` is the default adapter used by the `create-kyro` scaffolding tool. It uses a local `.db` file (or an in-memory database).

**Use cases:** Local development, prototyping, small personal sites, or edge environments where SQLite is sufficient.

```typescript
import { defineConfig, createLocalAdapter } from "@kyro-cms/core";

export default defineConfig({
  // Pass the path where the SQLite file should be created/read
  adapter: createLocalAdapter({ path: "./data.db" }),
  // ... collections
});
```

*Note: The SQLite adapter automatically uses `node:sqlite` under the hood. No external dependencies are required.*

### 2. PostgreSQL Adapter (Production SQL)

For robust, relational data storage in production, use the `createDrizzleAdapter`. This adapter leverages Drizzle ORM internally to map your Zod collections to PostgreSQL tables with strict referential integrity.

**Use cases:** High-traffic production applications, SaaS products, complex relational data requirements.

```typescript
import { defineConfig, createDrizzleAdapter } from "@kyro-cms/core";

export default defineConfig({
  // Provide your PostgreSQL connection string
  adapter: createDrizzleAdapter({
    connectionString: process.env.DATABASE_URL,
  }),
  // ... collections
});
```

*Note: When switching to PostgreSQL, you will need to run migrations to sync your schema. See the [Deployment Guide](/guides/deployment) for more information on managing migrations.*

### 3. MongoDB Adapter (Flexible NoSQL) <VersionBadge version="0.9.0+" />

If your data is highly unstructured or you prefer a document-oriented database, you can use the `createMongoDBAdapter`.

**Use cases:** Schemaless data ingestion, extremely fast rapid prototyping where relationships are loosely coupled.

```typescript
import { defineConfig, createMongoDBAdapter } from "@kyro-cms/core";

export default defineConfig({
  // Provide your MongoDB connection URI
  adapter: createMongoDBAdapter({
    connectionString: process.env.MONGODB_URI,
  }),
  // ... collections
});
```

## How Adapters Work

When you define a collection field like this:

```typescript
{
  name: "published",
  type: "checkbox",
  defaultValue: false
}
```

The adapter translates this automatically:
- **SQLite**: Translates to an `INTEGER` column where `0` is false and `1` is true.
- **PostgreSQL**: Translates to a `BOOLEAN` column.
- **MongoDB**: Translates to a standard BSON `Boolean`.

You interact with the CMS purely through the standard Kyro APIs, and the adapter handles the underlying implementation details.

> [!NOTE] The `kyro_versions` table has an `autosave` column (integer, defaults to 0). Autosave versions reuse a single slot per document. Added in v0.9.4.

## Choosing an Adapter Dynamically

A common pattern is to use SQLite during local development and PostgreSQL in production based on environment variables.

```typescript
import { 
  defineConfig, 
  createLocalAdapter, 
  createDrizzleAdapter 
} from "@kyro-cms/core";

const isProduction = process.env.NODE_ENV === "production";

const adapter = isProduction
  ? createDrizzleAdapter({ connectionString: process.env.DATABASE_URL })
  : createLocalAdapter({ path: "./dev-data.db" });

export default defineConfig({
  adapter,
  // ...
});
```
