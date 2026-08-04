# @kyro-cms/connect

Universal SDK for [Kyro CMS](https://kyro.dev). Type-safe client for any platform — Node.js, browser, Deno, Bun.

```bash
pnpm add @kyro-cms/connect
```

---

## Quick Start

### 1. Generate types

```bash
npx kyro-codegen --url http://localhost:4321/api --api-key kyro_xxx
```

Fetches your CMS schema and generates `kyro.generated.d.ts` with full type definitions for every collection, global, and procedure.

### 2. Use the client

```ts
import { createClient } from "@kyro-cms/connect";
import type { KyroAppRouter } from "./kyro.generated";

const api = createClient<KyroAppRouter>({
  url: "http://localhost:4321/api/trpc",
  apiKey: "kyro_xxx",
});
```

---

## API

### `createClient(options)`

Creates a proxy-based client for your Kyro CMS tRPC endpoint. Each property access builds a procedure path, and calling it triggers the request.

All three calling patterns are supported and interchangeable:

- `api["posts"].find(input)` — direct call
- `api["posts"].find.query(input)` — explicit query
- `api["posts"].create.mutate(input)` — explicit mutation (for writes)

```ts
const api = createClient<KyroAppRouter>({
  url: "http://localhost:4321/api/trpc",
  apiKey: "kyro_xxx",
  fetch: globalThis.fetch,
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | — | Base URL of the tRPC endpoint |
| `apiKey` | `string` | — | API key for authenticated requests |
| `fetch` | `typeof globalThis.fetch` | `globalThis.fetch` | Custom fetch implementation |

#### Using environment variables

```ts
const api = createClient<KyroAppRouter>({
  url: process.env.KYRO_API_URL!,
  apiKey: process.env.KYRO_API_KEY!,
});
```

#### Automatic URL Resolution & Routing

`createClient` automatically normalizes `url` (whether root `http://localhost:4321`, `/api`, or `/api/trpc`):
- **Typed Router Procedures** (`api["posts"].find()`): Routes to `${rootUrl}/api/trpc/posts.find`
- **REST Collections** (`api.collection("posts")`): Routes to `${rootUrl}/api/posts`
- **Globals** (`api.global("settings")`): Routes to `${rootUrl}/api/globals/settings`
- **GraphQL** (`api.gql(...)`): Routes to `${rootUrl}/api/graphql`

---

### Typed Router API vs. REST Collection API

| Feature | Typed Router API (`api["posts"]`) | REST Collection API (`api.collection("posts")`) |
|---|---|---|
| **Endpoint** | `/api/trpc/{collection}.{method}` | `/api/{collection}` |
| **Type Safety** | Complete autocompletion via `KyroAppRouter` | Auto-populated via `KyroAppRouter` OR explicit `<T>` |
| **Slug Source** | Static compile-time keys | Autocompleted string slugs or dynamic runtime strings |
| **Codegen Required** | Yes (`kyro-codegen`) | Optional |
| **Best For** | Strongly-typed app frontends & component data | RESTful endpoints, dynamic routing & generic utility functions |

#### Query procedures (GET)

All three patterns work:

```ts
// Direct call
const { docs } = await api["posts"].find({ page: 1, limit: 10 });
// docs: Post[]

// Explicit .query()
const { docs } = await api["posts"].find.query({ page: 1, limit: 10 });

const post = await api["posts"].findByID({ id: "abc123" });
// post: Post

const { totalDocs } = await api["posts"].count({
  where: { status: { equals: "published" } },
});
// totalDocs: number
```

#### Mutation procedures (POST)

```ts
// Direct call (creates/updates/deletes are auto-detected as POST)
const { doc } = await api["posts"].create({
  data: { title: "Hello", slug: "hello" },
});
// doc: Post

// Explicit .mutate()
const { doc } = await api["posts"].create.mutate({
  data: { title: "Hello", slug: "hello" },
});

const { doc } = await api["posts"].update({
  id: "abc",
  data: { title: "Updated" },
});
// doc: Post

const { doc, message } = await api["posts"].delete({ id: "abc" });
// doc: Post, message: string
```

#### Globals

```ts
const settings = await api["_globals_site-settings"].get();
// settings: SiteSettingsGlobal

await api["_globals_site-settings"].update({
  data: { siteName: "New Name" },
});
```

#### Collections with hyphens in slug

Use bracket notation:

```ts
const data = await api["my-collection"].find({ page: 1 });
```

---

## Codegen

### CLI

```bash
# Basic
npx kyro-codegen --url http://localhost:4321/api --api-key kyro_xxx

# Custom output path
npx kyro-codegen --url http://localhost:4321/api --api-key kyro_xxx --output src/types/kyro.d.ts
```

### Generated types

Running codegen produces `kyro.generated.d.ts` containing:

- **Doc types** — TypeScript interfaces for each collection and global, derived from field definitions
- **Input types** — typed inputs for every procedure (`PostsFindInput`, `PostsCreateInput`, etc.)
- **Output types** — typed outputs for every procedure (`PostsFindOutput`, etc.)
- **KyroAppRouter** — mapped type linking all collection/global procedures to their input/output types

### Without codegen

The client works without types — everything is `any`:

```ts
const api = createClient({ url: "...", apiKey: "..." });
const posts = await api["posts"].find({ page: 1 });
// posts: any
```

---

## Transport

### Request format

The client communicates with the Kyro tRPC endpoint. Each procedure call maps to an HTTP request:

| Procedure type | HTTP method | URL | Body |
|---|---|---|---|
| `find`, `findByID`, `count` | GET | `/api/trpc/{slug}.{proc}?input={json}` | — |
| `create`, `update`, `delete` | POST | `/api/trpc/{slug}.{proc}` | JSON body |

### Authentication

API key is sent as the `x-api-key` header on every request. If the server session cookie is already present (browser environment), the `apiKey` option can be omitted.

---

## Errors

### `KyroConnectError`

Thrown when the server responds with a non-2xx status code.

```ts
import { createClient, KyroConnectError } from "@kyro-cms/connect";

try {
  await api["posts"].find({ page: 1 });
} catch (err) {
  if (err instanceof KyroConnectError) {
    console.error(err.message); // Server error message
    console.error(err.status);  // HTTP status code
  }
}
```

### Error scenarios

| Scenario | Error type | Cause |
|---|---|---|
| Network failure | `TypeError` | DNS, connection refused, timeout |
| Server error response | `KyroConnectError` | 4xx or 5xx status with JSON body |
| Invalid response body | `SyntaxError` | Non-JSON response |
| Access denied | `KyroConnectError` with `status: 403` | Missing or invalid API key |
| Not found | `KyroConnectError` with `status: 404` | Collection or document not found |

---

## Platform support

| Platform | Native fetch | Status |
|---|---|---|
| Node.js 18+ | ✅ | Full support |
| Browser | ✅ | Full support |
| Deno | ✅ | Full support |
| Bun | ✅ | Full support |
| Cloudflare Workers | ✅ | Full support |
| Vercel Edge Runtime | ✅ | Full support |
| Node.js 16-17 | ⚠️ | Requires polyfill or `--experimental-fetch` |

---

## TypeScript configuration

Ensure the generated types are visible to the TypeScript compiler:

```json
// tsconfig.json
{
  "include": ["src", "kyro.generated.d.ts"]
}
```

Or place `kyro.generated.d.ts` inside your `src/` directory.

---

## Development

```bash
git clone <repo>
cd packages/kyro-connect
pnpm install
pnpm build
```

### Local testing

```bash
# Link the package globally
pnpm link --global

# In your consumer project
pnpm link @kyro-cms/connect
npx kyro-codegen --url http://localhost:4321/api --api-key kyro_xxx
```

---

## License

MIT
