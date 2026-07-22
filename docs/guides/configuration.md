---
title: Configuration
description: A complete guide to configuring your Kyro CMS instance using kyro.config.ts.
---

# Configuration

The `kyro.config.ts` file located at the root of your project is the **single source of truth** for your entire CMS. Because Kyro CMS is highly modular, this file dictates how your CMS stores data, handles authentication, presents the admin dashboard, and shapes your content APIs.

## The `kyro.config.ts` File

When you use the `create-kyro` CLI, a default configuration file is automatically generated for you. If you are integrating Kyro CMS into an existing Astro project, you will create this file manually.

Here is a full example of a configuration file:

```typescript
import { defineConfig, createLocalAdapter } from "@kyro-cms/core";

export default defineConfig({
  // 1. Database Adapter
  adapter: createLocalAdapter({ path: "./data.db" }),

  // 2. Collections (Your Content Types)
  collections: [
    {
      slug: "posts",
      label: "Blog Posts",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "slug", type: "text", required: true },
        { name: "content", type: "richtext" },
      ],
    },
  ],

  // 3. Globals (Singletons)
  globals: [
    {
      slug: "site-settings",
      label: "Site Settings",
      fields: [
        { name: "siteTitle", type: "text", required: true },
        { name: "description", type: "textarea" },
      ],
    },
  ],

  // 4. Authentication
  auth: {
    secret: process.env.KYRO_SECRET || "super-secret-key",
    tokenExpiration: 86400, // 24 hours
  },

  // 5. Admin Dashboard customization
  admin: {
    meta: {
      title: "My Kyro Admin",
      description: "Manage content easily",
    },
  },
  
  // 6. Plugins
  plugins: [],
});
```

## Configuration Options

### `adapter`
**Required.** The database adapter controls how Kyro reads and writes your data.
Kyro supports multiple databases out of the box. You can use the local SQLite adapter (`createLocalAdapter`), Drizzle ORM (`createDrizzleAdapter`), or MongoDB (`createMongoDBAdapter`).

*Learn more in the [Database Adapters](./database-adapters) guide.*

### `collections`
An array of objects defining your content types (e.g., Users, Posts, Products). Each collection configures its own fields, access control rules, and admin panel behavior.

*Learn more about defining fields in the [Field Types](./field-types) guide.*

### `globals`
An array of objects defining singletons. Globals are perfect for site-wide settings like Navigation, Footer details, or SEO defaults.

*Learn more in the [Globals](./globals) guide.*

### `auth`
Configures authentication for both the Admin Panel and your API endpoints. 
Setting `auth: true` enables the default authentication. You can pass an object to define secret keys, session timeouts, and specific adapters.

*Learn more in the [Authentication](./authentication) guide.*

### `admin`
Customizes the appearance and behavior of the Kyro CMS Admin Dashboard.
- `meta`: Customize the title, description, and OG image of the admin panel.
- `dateFormat`: Set the format used for date fields across the dashboard.
- `disable`: Set to `true` to disable the admin panel entirely.

*Learn more in the [Admin Customization](./admin-customization) guide.*

### `plugins`
An array of plugin configurations. Plugins can inject new collections, extend existing ones, or add entirely new features (like SEO helpers, E-Commerce workflows, or analytics).

### `graphQL`
Options for configuring the auto-generated GraphQL API.
- `disablePlayground`: Set to `true` to turn off the GraphQL Playground endpoint.
- `maxComplexity`: Set a maximum query complexity to prevent abusive queries.

### `cors`
Configures CORS (Cross-Origin Resource Sharing) policies for the API.
- `origins`: An array of allowed origin strings.
- `credentials`: Set to `true` to allow passing cookies across origins.

### `typescript`
- `outputFile`: Path where Kyro will generate TypeScript types for your collections and globals.

### `localization`
- `locales`: An array of locale strings (e.g., `['en', 'es', 'fr']`).
- `defaultLocale`: The default locale string.

## Typings and Autocomplete

By wrapping your configuration object in `defineConfig()`, you enable strict TypeScript type-checking and robust autocomplete in your editor. This guarantees that your configuration is valid before you run your app.

```typescript
import { defineConfig } from "@kyro-cms/core";

export default defineConfig({
  // Your config here...
});
```
