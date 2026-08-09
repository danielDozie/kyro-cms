---
name: kyro-testing-vitest
description: Conventions for writing fast unit and integration tests using Vitest, in-memory adapters, and Hono app request routing tests.
---

# Testing Kyro CMS with Vitest

Use this skill when writing unit tests, API integration tests, or running `pnpm test`.

## 1. Running Tests

- Run full test suite: `pnpm test`
- Run in watch mode: `pnpm test:watch`
- Run coverage report: `pnpm test:coverage`

## 2. In-Memory Testing Pattern

Always use `:memory:` SQLite databases for fast, zero-side-effect test execution:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createKyroServer, createLocalAdapter } from '@kyro-cms/core';

describe('Collection Hooks & API', () => {
  let kyroApp: any;

  beforeEach(async () => {
    kyroApp = await createKyroServer({
      db: createLocalAdapter({ path: ':memory:' }),
      collections: [
        {
          slug: 'articles',
          fields: [{ name: 'title', type: 'text', required: true }],
        },
      ],
    });
    await kyroApp.init();
  });

  afterEach(async () => {
    await kyroApp.destroy();
  });

  it('creates document cleanly', async () => {
    const res = await kyroApp.request('/api/collections/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Article' }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.doc.title).toBe('Test Article');
  });
});
```

## 3. Testing Hono App Routes Directly

Use Hono's `app.request()` API to execute API tests synchronously without spawning HTTP network sockets:

```ts
const response = await app.request('/api/collections/posts');
expect(response.status).toBe(200);
```
