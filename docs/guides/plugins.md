---
title: Plugins & Extensions
description: Learn how to extend Kyro CMS using global Config Plugins and lightweight Field Factories.
---

# Plugins & Extensions

Kyro CMS is designed to be highly modular and extensible. To support everything from minor schema tweaks to heavy third-party integrations (like payment systems or custom UI suites), Kyro provides two distinct architectural patterns for extending your CMS:

1. **Config Plugins (`kyro-plugin-[name]`)** — Global, heavyweight integrations registered in your central config.
2. **Field Factories (`kyro-field-[name]`)** — Lightweight, reusable schema creators injected directly into collection fields.

Understanding the difference between these two paradigms allows you to write clean, maintainable extensions that keep your admin interface lightweight and performant.

---

## Architecture Comparison

| Feature | Config Plugins (`kyro-plugin-*`) | Field Factories (`kyro-field-*`) |
| :--- | :--- | :--- |
| **Registration** | Global `plugins` array in `kyro.config.ts` | Injected into a collection's `fields` array |
| **Primary Scope** | Extends the system (routes, React UI, hooks, database) | Customizes a specific content schema / field behavior |
| **UI Overhead** | Heavy (may bundle custom pages, sidebars, or stylesheets) | Zero (uses native Kyro components and layouts) |
| **Complexity** | High (full access to Vite build pipeline and Express/Hono APIs) | Low (pure JavaScript/TypeScript schema factory functions) |

---

## 1. Config Plugins (`kyro-plugin-*`)

Config Plugins are best suited for deep integrations that need to hook into the Kyro lifecycle, register custom components in the admin dashboard, define API endpoints, or modify database models.

### Naming Convention
All official or third-party global plugins should use the `kyro-plugin-[name]` naming prefix.
*   *Example:* `kyro-plugin-stripe`, `kyro-plugin-seo`, `kyro-plugin-vercel-deploy`.

### The `KyroPlugin` Class
As of the latest architecture update, all Config Plugins must extend the `KyroPlugin` abstract class. This class-based approach enforces a consistent structure for managing lifecycle hooks, dynamically registering collections and globals, and injecting custom Admin UI views.

To install a global plugin, add it to your project's dependencies and register it in `kyro.config.ts`:

```typescript
import { defineConfig } from "@kyro-cms/core";
import { SeoPlugin } from "kyro-plugin-seo";
import { StripePlugin } from "kyro-plugin-stripe";

export default defineConfig({
  // ... core config
  plugins: [
    new SeoPlugin({
      fallbackTitle: "My Default Blog Site",
    }),
    new StripePlugin({
      secretKey: process.env.STRIPE_SECRET_KEY,
    }),
  ],
});
```

### Custom Admin Components (`adminEntry`)
Kyro CMS enforces a strict separation of concerns between server-side plugin logic and client-side Admin UI bundles. To prevent server code (e.g., Node.js file system APIs or database drivers) from crashing the Vite frontend build, plugins declare an `adminEntry` property.

This property points to a separate file exporting standard React components:

```typescript
// src/plugin.ts (Server-side)
import { KyroPlugin } from "@kyro-cms/core";

export class MyCustomPlugin extends KyroPlugin {
  constructor() {
    super('my-custom-plugin');
    
    // Tell Kyro Admin where to find the React views for this plugin
    this.adminEntry = 'kyro-plugin-my-custom/admin';
  }
}
```

```tsx
// src/admin.tsx (Client-side)
import React from 'react';

// The default export will automatically be rendered in the plugin's configuration modal
export default function MyCustomPluginSettings() {
  return (
    <div className="p-8">
      <h2>Custom Dashboard</h2>
      <p>This is a completely custom React view!</p>
    </div>
  );
}
```

By leveraging `adminEntry`, plugin authors are never locked into generic auto-generated forms. You can use standard React hooks, Tailwind CSS, or import third-party visualization libraries safely.

---

## 2. Field Factories (`kyro-field-*`)

Field Factories are lightweight, reusable functions that return Kyro field configurations. Instead of modifying global state, they generate fields that you can spread directly into any collection's `fields` array.

Because Field Factories use native Kyro components (such as `SelectField`, `TextField`, or `RelationshipField`), they do not load custom React bundles or styles, preventing bundle bloat.

### Naming Convention
All official or third-party schema/field generators should use the `kyro-field-[name]` naming prefix.
*   *Example:* `kyro-field-locations`, `kyro-field-color-picker`, `kyro-field-markdown-editor`.

### Using a Field Factory
To use a Field Factory, install the package and import it in your collection config file:

```typescript
import type { CollectionConfig } from "@kyro-cms/core";
import { RegionField, CountryField } from "kyro-field-locations";

export const destinationsCollection: CollectionConfig = {
  slug: "destinations",
  label: "Destinations",
  fields: [
    { name: "title", type: "text", label: "Title", required: true },
    { name: "description", type: "textarea", label: "Description" },
    
    // Injected using the spread operator
    { 
      ...RegionField({ name: "region", label: "Geographic Region" }), 
      admin: { position: "sidebar" } 
    },
    { 
      ...CountryField({ name: "country", dependsOn: "region" }), 
      admin: { position: "sidebar" } 
    },
  ],
};
```

---

## Building a Custom Field Factory

Creating your own `kyro-field-*` package is straightforward. Since they are pure functions, you can write them in a few lines of code.

### The Dynamic Options Engine
Kyro CMS features a dynamic options engine for `SelectField` fields. Instead of providing a static array of options, you can pass an **options callback function** that computes the options list dynamically.

The options callback receives context about the current record:
*   `data`: The global form state of the document.
*   `siblingData`: The local state of sibling fields (particularly useful for fields inside blocks or arrays).

### Step-by-Step Example

Here is how the `kyro-field-locations` package implements region-dependent country filtering:

```typescript
import type { SelectField } from "@kyro-cms/core";
import { getCountriesByRegion, getAllCountries } from "../data/countries";

export interface CountryFieldOptions {
  name?: string;
  dependsOn?: string;
  label?: string;
  required?: boolean;
}

export function CountryField(options: CountryFieldOptions = {}): SelectField {
  const { 
    name = "country", 
    dependsOn = "region", 
    label = "Country", 
    required = false 
  } = options;

  return {
    name,
    type: "select",
    label,
    required,
    // The options callback executes reactively in the admin panel 
    // whenever dependent fields change
    options: ({ data, siblingData }) => {
      // Find the value of the region field (checking siblings first)
      const region = siblingData?.[dependsOn] || data?.[dependsOn];
      
      if (region && typeof region === "string") {
        return getCountriesByRegion(region);
      }
      
      return getAllCountries(); 
    }
  };
}
```

> [!NOTE]
> In Kyro's current TypeScript type definitions, the `options` callback must run synchronously and return a flat `{ label: string, value: string }[]` array. Avoid using `async` or returning a `Promise` in your Field Factory function signatures.
