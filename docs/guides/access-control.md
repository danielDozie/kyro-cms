---
title: Access Control
description: Configure collection-level, field-level, and API key access control for Kyro CMS across REST, GraphQL, and tRPC.
---

# Access Control

Kyro provides a **unified access control system** shared across all three protocols — REST, GraphQL, and tRPC. The `checkCollectionAccess()` and `checkGlobalAccess()` functions in `src/access/checker.ts` are the single source of truth for every request handler.

<VersionBadge version="0.9.6+" />

## Collection-Level Access

Configured in `kyro.config.ts` under a collection's `access` property. Each access handler can be a **function** returning a boolean, or a literal **boolean**.

```ts
access: {
  read: ({ doc, user, context }) => boolean,
  create: ({ data, user, context }) => boolean,
  update: ({ doc, data, user, context }) => boolean,
  delete: ({ doc, user, context }) => boolean,
  readDrafts: ({ user, context }) => boolean,
  admin: ({ user, context }) => boolean,
}
```

The function signature receives an `AccessArgs` object with typed properties:

| Property | Description |
|----------|-------------|
| `doc` | The document being accessed (not available on `create` or `admin`) |
| `data` | The incoming mutation data (only on `create` and `update`) |
| `user` | The authenticated user object (or `null` for anonymous) |
| `context` | The full request context including `req`, `protocol`, and tenant info |

Return `true` to allow the operation or `false` to deny.

```ts
// Allow only admins to delete posts
access: {
  delete: ({ user }) => user?.role >= 90,
  read: true, // public read access
  create: ({ user }) => !!user, // any authenticated user
}
```

## Global-Level Access

Globals (singletons) follow the same pattern with a subset of hooks: `read`, `update`, and `admin`.

```ts
// kyro.config.ts
globals: {
  siteSettings: {
    slug: "site-settings",
    access: {
      read: true,
      update: ({ user }) => user?.role >= 70, // editors+
      admin: ({ user }) => user?.role >= 90,  // admins+
    },
    fields: [/* ... */],
  },
}
```

## Role Hierarchy

Kyro uses a numeric role hierarchy for Role-Based Access Control (RBAC):

```
super_admin (100) > admin (90) > editor (70) > author (50) > customer (30) > guest (10)
```

Check roles via the `user.role` property in access functions:

```ts
access: {
  read: ({ doc, user }) => user.role >= 70, // editor role and above
}
```

> [!TIP]
> Since roles are numeric, comparisons use standard operators (`>=`, `>`, `<=`). `super_admin` (100) always has unrestricted access and bypasses field-level access checks by default.

## Field-Level Access

Individual fields can have their own `access` property to restrict read or update operations:

```ts
fields: [
  {
    name: "email",
    type: "email",
    access: {
      read: ({ doc, user }) => user.role >= 70, // editors+
      update: ({ doc, user }) => doc.id === user.id, // own document only
    },
  },
  {
    name: "salary",
    type: "number",
    access: {
      read: false, // never exposed
      update: ({ user }) => user.role >= 90, // admins only
    },
  },
]
```

> [!WARNING]
> Field-level `read: false` completely removes the field from API responses, regardless of user role. Only `super_admin` bypasses this restriction.

## API Key RBAC

API keys can be created with granular permissions. The shared access checker evaluates API key permissions against the requested operation.

```ts
// API key with read-only access to the "posts" collection
{
  name: "Read-only Blog Key",
  permissions: {
    posts: ["read"],
  },
}
```

API keys use a `permissions` object where each key matches a collection slug and each value is an array of allowed operations (`read`, `create`, `update`, `delete`). When an API key is used, the access checker bypasses user-role checks and only validates against the key's permission set.

## Tenant / Multi-Tenant Scoping

Dynamic access functions can filter documents by arbitrary properties, enabling multi-tenant architectures:

```ts
access: {
  read: ({ doc, user }) => doc.organizationId === user.organizationId,
  create: ({ data, user }) => data.organizationId === user.organizationId,
  update: ({ doc, user }) => doc.organizationId === user.organizationId,
  delete: ({ doc, user }) => doc.organizationId === user.organizationId,
}
```

This pattern is commonly used with the SaaS provisioning plan to ensure tenants can only access their own data.

> [!TIP]
> For multi-tenant setups, set default access functions in a shared utility and reuse them across collections to avoid repetition.

## Shared Checker Pattern

The `checkCollectionAccess()` function evaluates access in a strict priority order:

1. **Authenticated user present?** — Evaluates per-collection access functions using user context
2. **API key present?** — Validates against the key's `permissions` map
3. **Anonymous request?** — Checks public access defaults (read: `true` for published documents, all others: `false`)

```ts
// Internal pseudocode of the checker logic
function checkCollectionAccess({ operation, collection, user, apiKey, doc }) {
  if (user) {
    const accessFn = collection.access[operation];
    return accessFn({ doc, user });
  }
  if (apiKey) {
    return apiKey.permissions[collection.slug]?.includes(operation);
  }
  // Anonymous
  return operation === "read" && doc?.status === "published";
}
```

## Error Handling

Access denials return a `FORBIDDEN` error code consistently across all protocols:

| Protocol | Response |
|----------|----------|
| **GraphQL** | `{ errors: [{ extensions: { code: "FORBIDDEN" } }] }` |
| **REST** | HTTP 403 with `{ error: "...", code: "FORBIDDEN" }` |
| **tRPC** | `TRPCError` with code `FORBIDDEN` |

```json
{
  "error": "You do not have permission to perform this action",
  "code": "FORBIDDEN"
}
```

## Bootstrapping

Use the CLI to create the initial super admin user:

```bash
kyro auth bootstrap \
  --email admin@example.com \
  --password "SecurePass123!" \
  --role super_admin
```

> [!WARNING]
> Always bootstrap at least one `super_admin` user before deploying to production. Without an admin user, you can only access public read operations. Use environment variables `KYRO_ADMIN_EMAIL` and `KYRO_ADMIN_PASSWORD` for CI/CD deployments.
