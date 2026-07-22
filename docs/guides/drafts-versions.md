---
title: Drafts & Versioning
description: Unified save system with draft/publish workflows, version history, autosave, and the X-Draft header pattern.
---

# Drafts & Versioning

<VersionBadge version="0.9.0+" />

Kyro CMS provides a built-in versioning system where each document can have multiple versions. The latest version determines the document's status (`draft`, `published`, etc.). The main document table keeps a lightweight `status` column for fast filtering without joining the versions table.

::: warning Breaking Change
v0.8.x had separate `/drafts`, `/publish`, and `/unpublish` endpoints. These are **removed** in v0.9.0+. All write operations now use the `X-Draft` header pattern described below.
:::

## Per-Collection Configuration

Enable versioning and drafts on a per-collection basis:

```ts
import { defineConfig } from "@kyro-cms/core";

export default defineConfig({
  collections: [
    {
      name: "posts",
      fields: [/* ... */],
      versions: {
        drafts: true,       // Enable draft/publish workflow (default: false)
        maxPerDoc: 10,      // Max versions per doc, older pruned (default: 10)
        retainDeleted: 30,  // Days to retain deleted versions (default: 30)
      },
    },
  ],
});
```

| Option           | Type      | Default | Description                              |
|------------------|-----------|---------|------------------------------------------|
| `drafts`         | `boolean` | `false` | Enable draft/publish workflow            |
| `maxPerDoc`      | `number`  | `10`    | Max versions kept per doc; oldest pruned |
| `retainDeleted`  | `number`  | `30`    | Days to retain versions after deletion   |

## Unified Save Flow

All write requests go through the same PATCH/POST endpoints. Whether a write creates a draft or publishes is controlled by the `X-Draft` HTTP header.

### Create

| Request | Behaviour |
|---------|-----------|
| `POST /api/posts` with `X-Draft: true` | Creates as draft, status = `draft` |
| `POST /api/posts` without `X-Draft` header | Creates as published, status = `published` |

### Update

| Request | Behaviour |
|---------|-----------|
| `PATCH /api/posts/:id` with `X-Draft: true` | Saves as draft version, status stays `draft` |
| `PATCH /api/posts/:id` with `X-Draft: false` (or no header) | Publishes, status becomes `published` |

### Reading Drafts

| Request | Behaviour |
|---------|-----------|
| `GET /api/posts/:id?draft=true` | Returns version-merged document |
| `GET /api/posts/:id?draft=false` | Returns published document only |
| `GET /api/posts/:id` (no param) | Authenticated users see version-merged; anonymous see published |

## Autosave

PATCH with `X-Draft: true` and `?autosave=true` reuses a single version slot instead of creating a new version every time. The autosave column in the `kyro_versions` table marks these rows. The `findVersions` endpoint excludes autosave rows (shows only manual saves). Pruning logic also skips autosave versions.

```bash
curl -X PATCH http://localhost:4321/api/posts/abc123 \
  -H "Content-Type: application/json" \
  -H "X-Draft: true" \
  -d '{"title": "Autosaved draft"}' \
  "?autosave=true"
```

## Version History

`GET /api/posts/:id/_versions` returns all non-autosave versions for a document.

```json
[
  {
    "id": "v1",
    "documentId": "abc123",
    "data": { "title": "Version 1" },
    "status": "published",
    "createdAt": "2025-06-01T00:00:00Z",
    "createdBy": "user_123"
  }
]
```

The Admin UI sidebar shows the version list with preview, compare, and restore actions.

## Status Lifecycle

Documents toggle freely between draft and published:

```
draft → published → draft → published
```

No separate publish, unpublish, or draft-snapshot endpoints are needed. Every write via the `X-Draft` header transitions the status automatically.

## GraphQL Mutations

When versioning with drafts is enabled, mutations accept a `draft` argument:

```graphql
mutation {
  createPost(data: { title: "Draft post" }, draft: true) {
    doc { id title }
  }
}

mutation {
  updatePost(id: "abc", data: { title: "Updated" }, draft: true) {
    doc { id title }
  }
}
```

Queries return published documents by default. Authenticated requests can access draft content via the `draft` argument.

## REST Draft Parameter

The `?draft` query parameter on GET requests offers three-way control:

| Value    | Behaviour |
|----------|-----------|
| `true`   | Force draft merge — returns version-merged document |
| `false`  | Force published — returns published document only |
| unset    | Default depends on auth: authenticated = version-merged, anonymous = published |

## Admin UI

When versioning is enabled for a collection, the Admin UI adapts with:

- **Save Draft / Publish buttons** in the ActionBar
- **Status badges** (`Draft` / `Published`) in list views
- **Autosave indicator** showing save status
- **Version history panel** with preview, compare, and restore
