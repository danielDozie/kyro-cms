---
title: REST API
description: Full reference for the auto-generated REST API — CRUD endpoints, pagination, filtering, draft operations, globals, and error handling.
---

# REST API

<VersionBadge version="0.9.3+" />

Kyro CMS auto-generates REST endpoints for every collection at `/api/{slug}`. Globals (singletons) are exposed under `/api/globals/{slug}`.

## Endpoint Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/{slug}` | List documents (paginated) |
| GET | `/api/{slug}/:id` | Get document by ID |
| POST | `/api/{slug}` | Create document |
| PATCH | `/api/{slug}/:id` | Update document |
| DELETE | `/api/{slug}/:id` | Delete document |
| GET | `/api/globals/{slug}` | Get global singleton |
| PATCH | `/api/globals/{slug}` | Update global singleton |
| POST / GET | `/api/auth/*` | User authentication, session management, password resets & email verification |

## Query Parameters (List GET)

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number |
| `limit` | number | `10` | Documents per page |
| `sort` | string | — | Field sort, e.g. `createdAt_desc` |
| `depth` | number | — | Relationship population depth |
| `select` | string | — | Field projection (comma-separated) |
| `where` | string | — | JSON filter object |
| `draft` | boolean | — | Version-merge behaviour (see below) |

### Filtering with `?where=`

The `where` parameter accepts a JSON object with per-field operators:

```bash
curl "http://localhost:4321/api/posts?where={\"status\":{\"equals\":\"published\"}}"
```

**Available operators:**

- `equals`, `not_equals`
- `contains`, `not_contains`
- `in`, `not_in`
- `gt`, `gte`, `lt`, `lte`
- `exists`
- `within`

**Combinators** `AND` and `OR` are supported at the top level:

```bash
curl "http://localhost:4321/api/posts?where={\"AND\":[{\"status\":{\"equals\":\"published\"}},{\"title\":{\"contains\":\"Kyro\"}}],\"OR\":[{\"author\":\"alice\"},{\"views\":{\"gt\":100}}]}"
```

::: warning
Invalid JSON in `?where=` returns a `400 BAD_USER_INPUT` error.
:::

## Pagination Response

```json
{
  "docs": [
    { "id": "abc", "title": "Hello" }
  ],
  "totalDocs": 42,
  "page": 1,
  "totalPages": 5,
  "hasNextPage": true,
  "hasPrevPage": false
}
```

## Draft Operations

Drafts are controlled via the `X-Draft` header on write requests and the `draft` query parameter on reads:

| Action | Request | Behaviour |
|--------|---------|-----------|
| Save draft | `PATCH /api/posts/:id` with header `X-Draft: true` | Creates or updates a draft version without publishing |
| Create draft | `POST /api/posts` with header `X-Draft: true` | Creates a document as a draft |
| Read merged | `GET /api/posts?draft=true` | Returns documents with draft content merged over published |
| Read published | `GET /api/posts?draft=false` | Returns published documents only |

::: info
Without `?draft`, the default depends on auth state: authenticated requests see version-merged documents, anonymous requests see published-only.
:::

## Globals

Globals follow the same semantics but operate on a single document per slug:

```bash
# Get the site settings singleton
curl http://localhost:4321/api/globals/site-settings

# Update (upsert semantics when id: "global")
curl -X PATCH http://localhost:4321/api/globals/site-settings \
  -H "Content-Type: application/json" \
  -d '{"title": "My Site"}'
```

## Error Handling

The `app.onError()` middleware returns structured error responses:

```json
{
  "error": "Validation failed for field 'title'",
  "code": "BAD_USER_INPUT"
}
```

| Code | HTTP Status | When |
|------|-------------|------|
| `BAD_USER_INPUT` | 400 | Zod validation error |
| `FORBIDDEN` | 403 | Access denied by access control |
| `CONFLICT` | 409 | Revision conflict during update |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## CRUD Examples

### List Documents

```bash
curl "http://localhost:4321/api/posts?page=1&limit=5&sort=createdAt_desc"
```

```json
{
  "docs": [
    { "id": "1", "title": "Post One", "createdAt": "2025-06-01T00:00:00Z" }
  ],
  "totalDocs": 1,
  "page": 1,
  "totalPages": 1,
  "hasNextPage": false,
  "hasPrevPage": false
}
```

### Get by ID

```bash
curl http://localhost:4321/api/posts/abc123
```

```json
{
  "id": "abc123",
  "title": "Post One",
  "content": "Hello world"
}
```

### Create Document

```bash
curl -X POST http://localhost:4321/api/posts \
  -H "Content-Type: application/json" \
  -d '{"title": "New Post", "slug": "new-post"}'
```

```json
{
  "id": "def456",
  "title": "New Post",
  "slug": "new-post",
  "createdAt": "2025-06-10T12:00:00Z"
}
```

### Update Document

```bash
curl -X PATCH http://localhost:4321/api/posts/def456 \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}'
```

```json
{
  "id": "def456",
  "title": "Updated Title",
  "slug": "new-post"
}
```

### Delete Document

```bash
curl -X DELETE http://localhost:4321/api/posts/def456
```

```json
{
  "message": "Document deleted successfully"
}
```

### Projection with `?select=`

```bash
curl "http://localhost:4321/api/posts?select=title,slug"
```

```json
{
  "docs": [
    { "id": "abc", "title": "Post One", "slug": "post-one" }
  ],
  "totalDocs": 1,
  "page": 1,
  "totalPages": 1,
  "hasNextPage": false,
  "hasPrevPage": false
}
```

### Draft Create

```bash
curl -X POST http://localhost:4321/api/posts \
  -H "Content-Type: application/json" \
  -H "X-Draft: true" \
  -d '{"title": "Draft Post"}'
```

### Draft Read

```bash
curl "http://localhost:4321/api/posts?draft=true"
```

### Nested Relationship with `?depth=`

```bash
curl "http://localhost:4321/api/posts?depth=2"
```

Populates related documents up to two levels deep.
