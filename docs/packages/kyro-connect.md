# kyro-connect SDK

<VersionBadge version="0.9.7+" />

`kyro-connect` is the official typed client SDK for Kyro CMS. It provides a fully typed API surface using generic `TRouter` and `CollectionClient<T, F>` types, with GraphQL and file upload support. Runs in Node.js, browsers, Deno, Bun, and edge runtimes.

---

## Installation

```bash
npm install kyro-connect
```

## Quick Start

```ts
import { createClient } from "kyro-connect";

const client = createClient({
  url: "http://localhost:4321",
  apiKey: "my-api-key",
});

const posts = await client.collection("posts").find();
```

## Typed Client

Pass a generic `TRouter` type for end-to-end type safety. Generate it with `kyro generate:types`.

```ts
import { createClient } from "kyro-connect";
import type { AppRouter } from "./kyro.generated";

const client = createClient<AppRouter>({
  url: "http://localhost:4321",
  apiKey: "my-api-key",
  credentials: "include", // default
});
```

### Options

| Option        | Type     | Default      | Description                        |
|---------------|----------|--------------|------------------------------------|
| `url`         | `string` | —            | Kyro CMS base URL                  |
| `apiKey`      | `string` | —            | API key for server-side auth       |
| `credentials` | `string` | `"include"`  | Credential mode for fetch requests |

## Collection Client

`client.collection<T>(slug)` returns a `CollectionClient<T, F>` generic over the document type `T` and filter type `F`.

```ts
interface Post {
  id: string;
  title: string;
  content: string;
}

const posts = await client
  .collection<Post>("posts")
  .find({ draft: true, where: { title: { contains: "hello" } } });
// posts: CollectionFindResult<Post>
```

### Methods

#### `find(params?)`

List documents with pagination and filtering.

```ts
const result = await client.collection<Post>("posts").find({
  page: 1,
  limit: 10,
  sort: "createdAt_desc",
  where: { status: { equals: "published" } },
  select: "title,slug",
  depth: 2,
  draft: false,
});
```

Returns `CollectionFindResult<T>`:

```ts
interface CollectionFindResult<T> {
  docs: T[];
  totalDocs: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
```

#### `findByID(id, params?)`

Get a single document by ID.

```ts
const post = await client.collection<Post>("posts").findByID("abc123", {
  draft: true,
});
```

#### `create(data, params?)`

Create a new document.

```ts
const post = await client.collection<Post>("posts").create({
  title: "New Post",
  content: "Hello world",
});
```

#### `update(id, data, params?)`

Update an existing document.

```ts
const post = await client.collection<Post>("posts").update("abc123", {
  title: "Updated Title",
});
```

#### `delete(id)`

Delete a document.

```ts
const result = await client.collection<Post>("posts").delete("abc123");
// { message: "Document deleted successfully" }
```

### `CollectionFindParams`

```ts
interface CollectionFindParams {
  draft?: boolean;
  depth?: number;
  sort?: string;
  page?: number;
  limit?: number;
  select?: string;
  where?: Record<string, unknown>;
}
```

> **Note on Relationships (`depth`)**: 
> By default, `kyro-connect` only returns relationship IDs. If your collection or global contains `upload` or `relationship` fields and you want the SDK to return the actual linked data (populated objects), you must set the `depth` parameter to `1` or higher.

## GraphQL Client

`client.gql<TData, TVars>(query)` accepts raw strings or `TypedDocumentNode` objects for full end-to-end type safety with GraphQL Codegen.

```ts
import { graphql } from "@/gql"; // from GraphQL Codegen

const query = graphql(`
  query Posts {
    posts {
      docs {
        id
        title
      }
    }
  }
`);

const result = await client.gql(query);
// result is fully typed
```

With variables:

```ts
const result = await client.gql<
  { post: { id: string; title: string } },
  { id: string }
>(`
  query GetPost($id: ID!) {
    post(id: $id) {
      id
      title
    }
  }
`, { id: "abc123" });
```

## File Upload

`client.upload<TResult>(file, config)` sends a multipart upload request.

```ts
const file = new File(["..."], "photo.jpg", { type: "image/jpeg" });

const result = await client.upload<{ url: string }>(file, {
  collection: "media",
});
```

## Legacy Proxy Access

The old tRPC proxy pattern remains available via `client.$proxy` or direct bracket access for backwards compatibility.

```ts
// Legacy proxy — still works
const posts = await client["posts"].find({ page: 1 });
const post = await client.$proxy.posts.findByID({ id: "abc123" });
```

## Error Handling

All failed requests throw a `KyroConnectError` with structured properties.

```ts
import { createClient, KyroConnectError } from "kyro-connect";

try {
  await client.collection("posts").find();
} catch (err) {
  if (err instanceof KyroConnectError) {
    console.error(err.code);    // e.g. "BAD_USER_INPUT"
    console.error(err.status);  // HTTP status code
    console.error(err.data);    // Server error payload
  }
}
```

## Type Exports

```ts
import {
  ClientOptions,
  CollectionClient,
  CollectionFindResult,
  CollectionFindParams,
  GqlClient,
  UploadClient,
  KyroClient,
  KyroConnectError,
} from "kyro-connect";
```

## Codegen

kyro-connect ships with two codegen tools for different workflows:

### `kyro generate:types` — Local (build-time)

Reads your Kyro config files from disk and generates TypeScript types. No server needed. Part of the `@kyro-cms/core` CLI.

```bash
kyro generate:types --output ./src/lib/kyro-types.ts
```

Best for: development, monorepos, and CI where you have access to the config files but not a running server.

### `kyro-codegen` — Remote (runtime)

Fetches the schema from a **live Kyro server** via HTTP and generates types. Ships as a binary with `kyro-connect`.

```bash
npx kyro-codegen \
  --url https://my-cms.example.com \
  --api-key kc_abc123 \
  --output ./src/kyro.generated.d.ts
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--url` | Yes | — | Base URL of a running Kyro CMS server |
| `--api-key` | Yes | — | API key with access to the schema endpoint |
| `--output` | No | `kyro.generated.d.ts` | Output path for the generated `.d.ts` file |

The tool hits `{url}/kyro/schema` and generates a complete `AppRouter` interface alongside per-collection document types, input types, and discriminated unions for blocks and enums.

Best for: deployment pipelines where the consumer is separate from the CMS server, or when you want types that exactly match the running server schema.

```ts
// Generated output can be used as:
import { createClient } from "kyro-connect";
import type { AppRouter } from "./kyro.generated.d.ts";

const client = createClient<AppRouter>({
  url: "https://my-cms.example.com",
  apiKey: "kc_abc123",
});
```

Both tools produce the same format — a `.d.ts` file with `AppRouter` and per-collection interfaces that you pass as the generic parameter to `createClient<AppRouter>()`.
