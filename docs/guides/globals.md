---
title: Globals (Singletons)
description: Manage single-document collections like site settings, navigation menus, and SEO defaults in Kyro CMS.
---

# Globals (Singletons)

In Kyro CMS, collections that are meant to have only one single document are called **Globals** (or Global Schemas).

Instead of defining them as a standard `CollectionConfig` (which allows multiple documents), you define them as a `GlobalConfig`.

This is incredibly useful for things like:
- Site Settings (Title, Logo)
- Theme Configurations
- Navigation Menus
- SEO Defaults
- Feature Toggles

## How Globals Work Under the Hood

### 1. Database Storage
When you register a Global (e.g., `site-settings`), the CMS automatically creates a dedicated database table for it (prefixed with `_globals_`, like `_globals_site-settings`). However, unlike normal collections that generate random UUIDs for every new entry, a Global enforces exactly one row in the database, permanently locked to a single ID (`id: "global"`).

### 2. Admin UI Experience
Because there is only ever one document, the Admin Dashboard adapts automatically:
* It **skips the List/Table view** completely.
* When you click a Global in the sidebar, it instantly opens the single form for editing.
* "Create New" buttons, pagination, and bulk actions are completely stripped away.

### 3. REST API Routes
Globals get their own dedicated API routes that act as singletons:
* **`GET /api/globals/:slug`** – Fetches the single document.
* **`POST /api/globals/:slug`** – Acts as a smart "upsert". If the document doesn't exist yet, it creates the single row. If it already exists, it updates it. No need to pass an `id` in the URL!

## Defining a Global Schema

To create a Global, define an object using the `GlobalConfig` interface. 

Here is a practical example of a "Site Settings" Global to manage a single site-wide title and logo:

```typescript
import type { GlobalConfig } from "@kyro-cms/core";

export const SiteSettings: GlobalConfig = {
  slug: "site-settings", // Creates the database table `_globals_site-settings`
  label: "Site Settings",
  
  // Optional: Group it under a specific section in the Admin sidebar
  admin: {
    group: "Configuration",
    description: "Manage global website settings like the logo and title.",
  },
  
  // Define fields exactly as you would for a normal collection
  fields: [
    {
      name: "siteTitle",
      type: "text",
      required: true,
      defaultValue: "My Awesome Website",
    },
    {
      name: "maintenanceMode",
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "logo",
      type: "upload", 
      relationTo: "media",
    }
  ],
};
```

## Registering Globals

Once defined, add it to the `globals` array where your Kyro CMS instance is initialized (usually in your `kyro.config.ts`):

```typescript
import { SiteSettings } from "./globals/SiteSettings";

export default {
  // Normal multi-document collections go here
  collections: [
    Users,
    Posts,
    Media
  ],
  
  // Single-document collections (Globals) go here!
  globals: [
    SiteSettings 
  ],
  
  // ... other configs
}
```

The moment the server starts, Kyro CMS will automatically provision the database table, add the sidebar navigation link in the Admin Dashboard, and expose the REST endpoints.

> [!TIP] Globals also support the X-Draft header for draft saves. Use PATCH /api/globals/{slug} with X-Draft: true to save as draft.

---

## Built-in Globals

Kyro CMS ships with several pre-configured globals:

### Site Settings (`site-settings`)

Manages site-wide configuration including identity, analytics, and layout elements.

```typescript
// Key fields in site-settings:
{
  siteTitle: "My Site",
  siteDescription: "...",
  siteUrl: "https://example.com",
  defaultLanguage: "en",               // Default language for the Admin UI
  mapApiKey: "...",                    // API key for map integrations
  analyticsEnabled: true,
  
  // Header/footer elements (blocks field)
  headerBlocks: [
    { blockType: "text", text: "Welcome" },
    { blockType: "button", label: "Sign Up", url: "/signup" },
    { blockType: "form", form: "form_id" },
  ],
  footerBlocks: [
    { blockType: "text", text: "© 2026 My Site" },
  ],
}
```

### Brand Settings (`brand-settings`)

Manages brand identity, contact info, and social links.

```typescript
{
  identity: {
    primaryLogo: "media_id",
    darkLogo: "media_id",       // optional, for dark mode
    favicon: "media_id",
    showSiteName: true,         // Display the site name next to the logo in the Sidebar
  },
  companyInfo: {
    companyName: "Acme Inc",
    address: "123 Main St",
    phone: "+1 555 1234",
    email: "hello@acme.com",
  },
  businessHours: [
    { day: "Mon - Fri", hours: "9:00 AM - 5:00 PM" },
    { day: "Saturday", hours: "10:00 AM - 2:00 PM" },
  ],
  socialLinks: [
    { platform: "twitter", url: "https://twitter.com/acme" },
    { platform: "github", url: "https://github.com/acme" },
  ],
}
```

### SEO Settings (`seo-settings`)

Default SEO values and OpenGraph configuration.

```typescript
{
  metaTitle: "Default Title",
  metaDescription: "Default description",
  defaultOgImage: "media_id",
  titleTemplate: "%s | My Site",
}
```

Page-level SEO (on pages/posts/products) includes `keywords`, `twitter` card group, `advanced` group (noindex, nofollow, canonical URL, JSON-LD structured data).

### Storage Settings (`storage-settings`)

Configures the active storage provider (S3, R2, Cloudinary, local, etc.).

### Email Settings (`email-settings`)

SMTP configuration for transactional emails.
