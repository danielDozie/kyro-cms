---
title: API Overview
description: Learn how Kyro CMS automatically generates REST, GraphQL, tRPC, and WebSocket APIs from your single collection configuration.
---

# API Overview

One of Kyro CMS's most powerful features is its **Multi-Protocol Gateway**. When you define a collection in your `kyro.config.ts`, you don't just get an admin UI and a database table—you instantly get four complete, fully-featured APIs generated automatically.

All APIs are enabled by default when you mount the Kyro server in your Astro project.

## Supported Protocols

| Protocol  | Endpoint     | Description                   |
| --------- | ------------ | ----------------------------- |
| REST      | `/api/*`     | Hono-based REST API           |
| GraphQL   | `/graphql`   | GraphQL playground & endpoint |
| tRPC      | `/trpc`      | Type-safe API                 |
| WebSocket | `/ws`        | Real-time updates             |

All protocols are served on the same port (default 4321 via Astro dev server).

## REST API

The REST API provides standard, predictable HTTP endpoints for all CRUD operations. For detailed REST endpoint documentation, see the [REST API](/guides/rest-api) guide.

### Globals

Globals (singleton collections) are accessible under `/api/globals/:slug`.

| Method | Endpoint                  | Description        |
| ------ | ------------------------- | ------------------ |
| GET    | `/api/globals/:slug`      | Get global config  |
| PATCH  | `/api/globals/:slug`      | Update global config |

### Draft & Version Endpoints

| Method | Endpoint                              | Description              |
| ------ | ------------------------------------- | ------------------------ |
| GET    | `/api/:collection/:id/versions`       | List document versions   |
| GET    | `/api/:collection/:id/draft`          | Get draft snapshot       |
| PUT    | `/api/:collection/:id/draft`          | Save draft snapshot      |
| POST   | `/api/:collection/:id/publish`        | Publish latest draft     |
| POST   | `/api/:collection/:id/unpublish`      | Unpublish document       |
| POST   | `/api/:collection/:id/versions/:id/restore` | Restore version    |

## GraphQL API

Kyro generates a fully-typed GraphQL schema based on your collections.

**Endpoint:** `/api/graphql`

For detailed GraphQL usage, see the [GraphQL API](/guides/graphql) guide.

## tRPC API

For end-to-end type safety, use the `kyro-connect` package:

```bash
npm install kyro-connect
```

```typescript
import { createClient } from "kyro-connect";

const client = createClient({
  url: "http://localhost:4321/api/trpc",
});

const posts = await client.posts.find.query({ page: 1 });
```

Alternatively with `@trpc/client`:

```typescript
import { createTRPCClient } from "@trpc/client";
import superjson from "superjson";

const client = createTRPCClient({
  url: "http://localhost:4321/trpc",
  transformer: superjson,
});

// Query
const posts = await client.posts.find.query({ page: 1 });

// Mutation
const newPost = await client.posts.create.mutate({
  title: "Hello",
  slug: "hello",
});
```

## Frontend Renderers

If you are using the `richText` field in your collections, Kyro stores the data as structured Tiptap JSON. To render this seamlessly on your frontend, we provide a companion package:

```bash
npm install kyro-rich-text-react
```

```tsx
import { KyroRichTextRenderer } from "kyro-rich-text-react";

// Assuming `post.content` is the JSON from the API
<KyroRichTextRenderer content={post.content} />
```

## WebSocket (Real-Time)

For live updates, Kyro can broadcast database events over WebSockets.

**Endpoint:** `ws://[host]/api/ws`

```typescript
const ws = new WebSocket("ws://localhost:4321/api/ws");

ws.send(
  JSON.stringify({
    type: "subscribe",
    collection: "posts",
    event: "create",
  })
);

ws.onmessage = (event) => {
  const payload = JSON.parse(event.data);
  console.log("New post created:", payload.doc);
};
```

---

See [GraphQL API](/guides/graphql), [REST API](/guides/rest-api) for detailed guides.
