---
name: kyro-db-adapter-extension
description: Guidelines for implementing, lazy-loading, and extending database adapters using AdapterFactory and Drizzle interfaces.
---

# Kyro Database Adapter Extension Guide

Use this skill when adding new database adapters (e.g., PostgreSQL, MongoDB, Cloudflare D1/KV) or modifying `src/database/`.

## 1. AdapterFactory Pattern

All database drivers are dynamically lazy-loaded via dynamic `import()` in `AdapterFactory` (`src/database/factory.ts`).

Do NOT statically top-level import database drivers (like `better-sqlite3`, `pg`, or `mongodb`) in shared entry points. Top-level static imports break serverless edge bundlers like Cloudflare Workers.

## 2. Dynamic Import Annotations

Always use `/* @vite-ignore */` on variable dynamic driver imports to suppress Vite dev server warnings:

```ts
// src/database/drizzle/adapter.ts
const driverName = config.driver;
const driverModule = await import(/* @vite-ignore */ driverName);
```

## 3. Mandatory Adapter Methods

Every database adapter must implement the standard adapter interface:

```ts
export interface KyroDatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  find(params: FindParams): Promise<PaginatedDocs>;
  findOne(params: FindOneParams): Promise<Document | null>;
  create(params: CreateParams): Promise<Document>;
  update(params: UpdateParams): Promise<Document>;
  delete(params: DeleteParams): Promise<{ id: string }>;
}
```
