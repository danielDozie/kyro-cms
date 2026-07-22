---
title: GraphQL API
description: Explore the auto-generated GraphQL schema with Relay pagination, typed filters, Apollo Federation support, and an interactive playground.
---

# GraphQL API

<VersionBadge version="0.9.3+" />

Kyro CMS generates a **full GraphQL schema** automatically from your collection configuration at startup. The schema is static (built once when the server starts) and uses a **context-based auth** pattern — every resolver receives the authenticated user via the GraphQL context, allowing per-field access control rules to fire seamlessly.

A per-request `RelationLoader` batches relationship resolution across all queries in a single operation, preventing N+1 queries without any manual data loader setup.

## Naming Conventions

Types use **PascalCase** — `Post`, `PostInput`, `PostWhereInput`. Mutations follow a **verb+Object** pattern: `createPost`, `updatePost`, `deletePost`. Queries use **plural** for list results (`posts`) and **singular** for single document lookup (`post`). The **count pattern** uses `countPosts`. Block types are prefixed with `Block`: `BlockHero`, `BlockCtaBanner`.

<Callout type="tip" title="Migration Note">
  v0.8 used snake\_case type names like `post_find_result`. v0.9+ uses PascalCase (`PostFindResult`). The old `_find` suffix is replaced by `findAll` and Relay Connection patterns.
</Callout>

### Naming Reference

| Pattern | Example |
|---------|---------|
| PascalCase type | `Post`, `PostInput`, `PostWhereInput` |
| Verb+Object mutation | `createPost(data: PostInput!)` |
| Plural query | `posts(where: PostWhereInput)` |
| Singular query | `post(id: ID!)` |
| Count query | `countPosts(where: PostWhereInput)` |
| Block prefix | `BlockHero`, `BlockCtaBanner` |

## Typed Filter Inputs

Every collection generates a per-field filter input object. Each scalar field gets operators like `equals`, `not_equals`, `contains`, `not_contains`, `in`, `not_in`, `gt`, `gte`, `lt`, `lte`, `exists`, and `within`. Combinators `AND` and `OR` are available at the root level.

```graphql
query {
  posts(where: {
    AND: [
      { status: { equals: published } }
      { title: { contains: "Kyro" } }
    ],
    OR: [
      { author: { name: { equals: "Alice" } } },
      { createdAt: { gt: "2025-01-01" } }
    ]
  }) {
    id
    title
  }
}
```

## Sort Enums

Each collection generates a sort enum with `{field}_asc` / `{field}_desc` entries:

```graphql
enum PostSort {
  createdAt_asc
  createdAt_desc
  title_asc
  title_desc
}

query {
  posts(sort: createdAt_desc) {
    id
    title
  }
}
```

## Pagination

### Relay Connection Pagination

A `{slug}sConnection` query is available for each collection with `first`/`after`/`last`/`before` arguments. It returns the Relay Connection shape:

```graphql
query {
  postsConnection(first: 10, after: "Mg") {
    edges {
      node {
        id
        title
      }
      cursor
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
```

Cursors are **Base64-encoded offset values** (e.g., cursor `"Mg"` decodes to offset `2`).

### Traditional Pagination

For simpler use cases, the standard `findMany`-style query is also available:

```graphql
query {
  posts(page: 1, limit: 10, sort: createdAt_desc) {
    docs {
      id
      title
    }
    totalDocs
    page
    totalPages
    hasNextPage
    hasPrevPage
  }
}
```

## Complex Field Types

| Config Type | GraphQL Type | Details |
|-------------|--------------|---------|
| `group` | `GraphQLObjectType` | Nested object type with its own fields |
| `array` | `GraphQLList` | List of a nested object type |
| `blocks` | `GraphQLUnionType` | Discriminated union; `resolveType` resolves by `blockType` field |
| `row` / `collapsible` / `tabs` | Flattened | Layout wrappers are transparent — fields are hoisted into the parent type |

```graphql
query {
  page(id: "abc") {
    title
    content {
      ... on BlockHero {
        blockType
        heading
        ctaLabel
      }
      ... on BlockCtaBanner {
        blockType
        message
      }
    }
  }
}
```

## Draft Support

When versioning with drafts is enabled, mutations accept a `draft` argument:

```graphql
mutation {
  createPost(data: { title: "Draft post" }, draft: true) {
    doc {
      id
      title
    }
  }
}

mutation {
  updatePost(id: "abc", data: { title: "Updated" }, draft: true) {
    doc {
      id
      title
    }
  }
}
```

Queries return published documents by default. Authenticated requests can access draft content via the `draft` argument.

## Structured Input Types

- `group` fields → `GraphQLInputObjectType` with nested fields
- `array` fields → `GraphQLList(GraphQLInputObjectType)`
- `blocks` fields → **raw JSON** (`GraphQLJSON`) — GraphQL has no input union types, so block data is passed as a JSON string

## Apollo Federation

Every top-level type is annotated with the `@key(fields: "id")` directive, making the schema compatible with Apollo Federation:

```graphql
type Post @key(fields: "id") {
  id: ID!
  title: String
  author: Author
}
```

The schema exposes the `_service` query for the gateway:

```graphql
query {
  _service {
    sdl
  }
}
```

To use with Apollo Gateway:

```typescript
import { ApolloGateway, IntrospectAndCompose } from "@apollo/gateway";

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: "kyro", url: "http://localhost:4321/graphql" },
    ],
  }),
});
```

## `@deprecated` Support

Set `deprecated: true` on any field config to automatically add the `@deprecated` directive to the generated schema:

```graphql
type Post {
  id: ID!
  legacyField: String @deprecated(reason: "Use newField instead")
}
```

## Server Setup

```typescript
import { createGraphQLSchema } from "@kyro-cms/core";
import { buildApp } from "./app";

const app = buildApp();

const schema = createGraphQLSchema({
  collections: app.config.collections,
  globals: app.config.globals,
  context: ({ req }) => ({
    user: req.user,
    relationLoader: app.createRelationLoader(),
  }),
});
```

## Error Handling

Errors include a `code` in `extensions` for programmatic handling on the client:

| Code | HTTP Status | When |
|------|-------------|------|
| `BAD_USER_INPUT` | 400 | Zod validation failed — paths point to the offending fields |
| `FORBIDDEN` | 403 | Access denied by access control rules |
| `CONFLICT` | 409 | Revision conflict during update |

```json
{
  "errors": [
    {
      "message": "Validation failed",
      "extensions": {
        "code": "BAD_USER_INPUT",
        "fields": ["title", "slug"]
      }
    }
  ]
}
```

## Depth Limiting

Use the `depthLimit` validation rule to prevent deeply nested abusive queries:

```typescript
import depthLimit from "graphql-depth-limit";

const schema = createGraphQLSchema({
  collections,
  validationRules: [depthLimit(10)],
});
```

## SDL Export

`createGraphQLSchema()` returns a standard `GraphQLSchema` object. Use `printSchema` to export the SDL for a schema registry or codegen pipeline:

```typescript
import { printSchema } from "graphql";

const schema = createGraphQLSchema({ collections });
const sdl = printSchema(schema);

// Upload to Apollo Schema Registry or use with GraphQL Code Generator
```

## Playground

The Kyro admin dashboard includes a full-featured GraphQL playground available at `/graphql`:

- **Docs click-to-insert** — click any field in the docs panel to insert a skeleton query
- **Autocomplete** — schema-aware completions powered by Codemirror
- **History** — last 50 executed queries accessible via the history panel
- **Resizable split panels** — drag to resize the editor, result, and docs panes
- **Keyboard shortcuts** — `Cmd+Enter` (send), `Cmd+Shift+P` (prettify)
- **Response metadata** — execution timing and status code displayed below results
- **Copy / Download response** — copy result JSON to clipboard or download as a file
