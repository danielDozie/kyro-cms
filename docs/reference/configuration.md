---
title: Configuration Reference
description: Complete API reference for kyro.config.ts, defineConfig(), and all configuration options in Kyro CMS.
---

# Configuration Reference

Kyro CMS is driven by a single `kyro.config.ts` file at the root of your project. Use the `defineConfig` helper from `@kyro-cms/core` for type-safe configuration.

```typescript
// kyro.config.ts
import { defineConfig, createLocalAdapter } from "@kyro-cms/core";

export default defineConfig({
  // ... options
});
```

## Top-Level Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `collections` | `CollectionConfig[]` | `[]` | Collection definitions |
| `globals` | `GlobalConfig[]` | `[]` | Global singleton definitions |
| `plugins` | `KyroPlugin[]` | `[]` | Plugin instances |
| `db` | `DatabaseAdapter` | — | Database adapter instance |
| `auth` | `AuthConfig` | — | Auth configuration |
| `storage` | `StorageConfig` | — | Storage configuration |
| `graphql` | `GraphQLConfig` | — | GraphQL-specific options |
| `admin` | `AdminConfig` | — | Admin dashboard configuration |
| `server` | `ServerConfig` | — | Server settings |
| `webhooks` | `WebhookConfig` | — | Webhook settings |
| `telemetry` | `boolean` | `true` | Anonymous telemetry |

## Collection Config

Each entry in `collections` defines a content type with its own API endpoints, database table, and admin UI.

| Option | Type | Description |
|--------|------|-------------|
| `slug` | `string` | Unique identifier used in API paths and database table names |
| `fields` | `Field[]` | Array of field definitions (text, number, relationship, etc.) |
| `access` | `AccessConfig` | Access control functions for read/create/update/delete |
| `admin` | `AdminCollectionConfig` | Admin UI settings (icon, group, list columns, etc.) |
| `hooks` | `HooksConfig` | Lifecycle hooks (beforeChange, afterChange, beforeDelete, etc.) |
| `versions` | `{ drafts: boolean, maxPerDoc: number, retainDeleted: boolean }` | Versioning and draft settings |
| `timestamps` | `boolean` | Automatically manage `createdAt` and `updatedAt` database fields, and display them in list views as "Created" and "Last Modified" columns |
| `tenantScoped` | `boolean` | Enables multi-tenant row-level security (RLS) for the collection |
| `tenantField` | `string` | Custom field name to map tenant relations (defaults to `tenantId`) |
| `endpoints` | `EndpointConfig` | Per-collection endpoint customization |
| `preview` | `(doc) => string` | Preview URL generator — receives the document, returns a URL |

```typescript
{
  slug: "posts",
  fields: [
    { name: "title", type: "text", required: true },
    { name: "body", type: "richtext" },
  ],
  access: {
    read: () => true,
    create: ({ req }) => req.user?.role === "admin",
  },
  versions: { drafts: true, maxPerDoc: 10 },
  preview: (doc) => `/blog/${doc.slug}`,
}
```

### AdminCollectionConfig

The `admin` property configures how the collection is displayed in the admin UI.

| Option | Type | Description |
|--------|------|-------------|
| `useAsTitle` | `string` | The field name to use as the document title in lists and relations |
| `defaultColumns` | `string[]` | Array of field names to display as columns in the list view |
| `hidden` | `boolean` | Hide the collection from the sidebar navigation |
| `description` | `string` | Description text displayed at the top of the collection list |
| `group` | `string` | Sidebar group name. Collections with the same group are grouped together |
| `icon` | `string` | Lucide React icon name to display in the sidebar |
| `order` | `number` | Controls the sorting order of the collection within its sidebar group |
| `disableDuplicate` | `boolean` | Hide the "Duplicate" button in the admin UI |
| `pagination.defaultLimit` | `number` | Default number of items per page in list views |
| `layout` | `"split" \| "single"` | Edit view layout. Split puts sidebar fields on the right. |

## Global Config

Globals are singleton documents — there is exactly one instance per global slug. Useful for site settings, SEO defaults, header/footer content, etc.

| Option | Type | Description |
|--------|------|-------------|
| `slug` | `string` | Unique identifier used in API paths |
| `fields` | `Field[]` | Field definitions |
| `access` | `AccessConfig` | Access control functions |
| `admin` | `AdminCollectionConfig` | Admin UI settings |
| `hooks` | `HooksConfig` | Lifecycle hooks |

```typescript
{
  slug: "site-settings",
  fields: [
    { name: "siteName", type: "text" },
    { name: "logo", type: "upload", relationTo: "media" },
    { name: "socialLinks", type: "array", fields: [
      { name: "platform", type: "text" },
      { name: "url", type: "text" },
    ]},
  ],
}
```

## Auth Config

Configure authentication, sessions, and security policies.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `secret` | `string` | — | JWT signing secret — load from env variable |
| `tokenExpiry` | `string` | `"15m"` | Access token expiration duration |
| `storage` | `AuthStorageAdapter` | `SQLiteAuthAdapter` | Session storage backend (sqlite / redis / postgres) |
| `rateLimit` | `{ window: number, max: number }` | — | IP-based rate limiting for auth routes |
| `lockoutAttempts` | `number` | `5` | Consecutive failed logins before account lockout |

```typescript
auth: {
  secret: process.env.JWT_SECRET,
  tokenExpiry: "30m",
  storage: new RedisAuthAdapter({ url: process.env.REDIS_URL }),
  rateLimit: { window: 15 * 60 * 1000, max: 20 },
  lockoutAttempts: 5,
}
```

## Admin Config (Top-Level)

Customize the global admin dashboard appearance and behavior.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `meta` | `{ title?: string, description?: string, ogImage?: string }` | — | HTML meta tags (title, description, and preview image) for the admin dashboard |
| `dateFormat` | `string` | `"YYYY-MM-DD"` | Date and time display format used throughout the dashboard |
| `avatar` | `"default" \| "gravatar"` | `"default"` | Profile avatar style selection |
| `disable` | `boolean` | `false` | Set to `true` to completely disable the Admin dashboard route |
| `indexRoute` | `string` | `"/collections"` | Default landing page route path after logging in |
| `styling` | `{ css?: string }` | — | Custom CSS variables or styling rules injected into the admin panel |
| `components` | `Record<string, ComponentType>` | — | Custom React components to override default admin views (e.g. sidebar, login, headers) |
| `collectionOverrides` | `Record<string, Partial<AdminConfig> & { fields?: FieldOverrides }>` | — | Customize built-in collection admin options and extend relationships without modifying source code |

```typescript
admin: {
  meta: {
    title: "My CMS",
    description: "Manage content easily",
    ogImage: "/og-image.jpg",
  },
  dateFormat: "MM/DD/YYYY",
  avatar: "gravatar",
  indexRoute: "/collections/pages",
  styling: {
    css: ":root { --kyro-primary: #6366f1; }",
  },
  collectionOverrides: {
    pages: {
      fields: {
        // Dynamic content / block field path syntax: "<blocksField>.<blockSlug>.<fieldInBlock>"
        "content.recentFeed.selectedItems": {
          relationTo: ["posts", "food-menu", "food-menu-category"],
        },
      },
    },
    menu: {
      fields: {
        // Group -> Array -> Relationship field path syntax
        "menu.menuItem.internalTarget": {
          relationTo: ["pages", "posts", "food-menu-category"],
        },
      },
    },
  },
}
```

## Admin Collection Config

Customize list views, edit forms, icons, and menus for a specific collection or global under the `admin` key.

| Option | Type | Description |
|--------|------|-------------|
| `useAsTitle` | `string` | The field name to use as the title/label in list views, search results, and relationships (defaults to `id`) |
| `defaultColumns` | `string[]` | Array of field names to display as columns in the list view (e.g., `["title", "slug", "createdAt"]`) |
| `hidden` | `boolean` | Set to `true` to hide the collection from the Admin navigation sidebar |
| `description` | `string` | Custom subtitle description text displayed at the top of the collection's pages |
| `hideAPIURL` | `boolean` | Set to `true` to hide the API URL documentation reference button in the detail view |
| `group` | `string` | Category group name under which to list this collection in the sidebar navigation |
| `icon` | `string` | Name of the Lucide icon to display next to this collection in the navigation menu |
| `order` | `number` | The sorting order of the collection within its group in the navigation sidebar (lower numbers appear first) |
| `disableDuplicate` | `boolean` | Set to `true` to hide and disable the "Duplicate Document" action button |
| `pagination` | `{ defaultLimit?: number, limits?: number[] }` | Define default limits and items-per-page options for the list view |
| `layout` | `"split" \| "single"` | Edit panel layout style. `split` renders a side panel for secondary actions (like drafts/versions) |
| `preview` | `(doc, { req }) => string` | Function generating dynamic frontend URLs to preview the current document state |

```typescript
// Example: Collection-level Admin config
export const PostsCollection = {
  slug: "posts",
  fields: [/* ... */],
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "status", "createdAt", "updatedAt"],
    icon: "FileText",
    group: "Content",
    order: 10,
    layout: "split",
  },
};
```

## GraphQL Config

Control the auto-generated GraphQL schema and runtime behaviour.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxDepth` | `number` | `10` | Maximum query depth for validation |
| `disableFederation` | `boolean` | `false` | Disable Apollo Federation `@key` directives |

```typescript
graphql: {
  maxDepth: 15,
  disableFederation: true,
}
```

## Server Config

Control the HTTP server settings.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `4321` | Server port |
| `host` | `string` | `"localhost"` | Server hostname |
| `cors` | `CorsOptions` | — | CORS configuration |
| `trustProxy` | `boolean` | `false` | Trust proxy headers for IP resolution |

```typescript
server: {
  port: 3000,
  host: "0.0.0.0",
  cors: { origin: ["https://myapp.com"], credentials: true },
  trustProxy: true,
}
```

## Complete Example

```typescript
import {
  defineConfig,
  createLocalAdapter,
  RedisAuthAdapter,
} from "@kyro-cms/core";

export default defineConfig({
  collections: [
    {
      slug: "posts",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "slug", type: "text", required: true, unique: true },
        { name: "content", type: "richtext" },
        {
          name: "author",
          type: "relationship",
          relationTo: "users",
        },
        { name: "publishedAt", type: "date" },
      ],
      versions: { drafts: true, maxPerDoc: 25 },
      preview: (doc) => `/blog/${doc.slug}`,
    },
    {
      slug: "users",
      fields: [
        { name: "name", type: "text" },
        { name: "email", type: "email", required: true },
        { name: "role", type: "select", options: ["admin", "editor", "author"] },
      ],
    },
  ],

  globals: [
    {
      slug: "site-settings",
      fields: [
        { name: "siteName", type: "text" },
        { name: "description", type: "textarea" },
      ],
    },
  ],

  auth: {
    secret: process.env.JWT_SECRET!,
    storage: new RedisAuthAdapter({ url: process.env.REDIS_URL! }),
    tokenExpiry: "15m",
    rateLimit: { window: 60_000, max: 10 },
  },

  storage: {
    provider: "s3",
    bucket: "my-cms-assets",
    region: "us-east-1",
  },

  graphql: {
    maxDepth: 10,
  },

  admin: {
    meta: { title: "My CMS" },
  },

  server: {
    port: 4321,
    cors: { origin: ["http://localhost:3000"] },
  },

  telemetry: true,
});
```
