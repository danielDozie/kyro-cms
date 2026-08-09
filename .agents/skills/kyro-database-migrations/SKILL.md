---
name: kyro-database-migrations
description: Standards for managing Drizzle ORM migrations, local SQLite database files, schema diffing, and database handle recovery.
---

# Kyro Database Migrations & Adapter Safety

Use this skill when running migrations, diffing database schemas, or writing database adapters.

## 1. Local SQLite Adapter Health Recovery

`LocalAdapter` (`src/database/local/adapter.ts`) automatically handles connection health checks:
- On `connect()`, execute a lightweight health check query (`SELECT 1`).
- If the connection throws an `ERR_INVALID_STATE` (database is closed or stale), reset `this.db = null` and reopen cleanly.
- Always implement graceful `disconnect()` teardowns.

## 2. Running Drizzle Migrations

When using the Drizzle ORM adapter (`drizzle.config.ts`):

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/database/drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './data/kyro.db',
  },
});
```

Common Commands:
- `pnpm drizzle-kit generate`: Generate migration SQL files from schema updates.
- `pnpm drizzle-kit push`: Apply schema changes directly to local development database.

## 3. In-Memory Database Mode for Tests

For automated unit and integration testing, pass `:memory:` to create isolated in-memory SQLite instances:

```ts
import { createLocalAdapter } from '@kyro-cms/core';
const testDb = createLocalAdapter({ path: ':memory:' });
```
