---
title: Admin Customization
description: Learn how to customize the Kyro CMS Admin Dashboard and extend the core system with custom plugins.
---

# Admin Customization

Kyro CMS is designed to be highly extensible. While the core system provides a robust API and Admin UI, you will inevitably encounter use-cases specific to your business logic. You can handle these requirements using **Plugins** and **Admin UI Customization**.

## The Plugin System

Plugins are the primary way to package and share custom functionality. A plugin can modify your schema, inject custom API endpoints, register lifecycle hooks, and even inject custom React components into the Admin Dashboard.

### Using Existing Plugins

Kyro provides several official plugins that you can import and register in your `kyro.config.ts`:

```typescript
import { defineConfig } from "@kyro-cms/core";
import { 
  SEOPlugin, 
  AnalyticsPlugin 
} from "@kyro-cms/core/plugins";

export default defineConfig({
  // ...
  plugins: [
    new SEOPlugin({ sitemap: true, robotsTxt: true }),
    new AnalyticsPlugin({ providers: ['google', 'plausible'] }),
  ],
});
```

### Creating Custom Plugins

To create your own plugin, extend the `KyroPlugin` base class.

```typescript
import { KyroPlugin } from "@kyro-cms/core";

export class CustomStripePlugin extends KyroPlugin {
  name = "custom-stripe-plugin";

  // Modify the schema before the CMS initializes
  override modifyConfig(config) {
    config.collections.push({
      name: "stripe_logs",
      fields: [/* ... */]
    });
    return config;
  }

  // Register lifecycle hooks
  hooks = {
    "collection.beforeCreate": async (args) => {
      // Execute logic before any document is saved
      return args;
    },
  };

  constructor() {
    super('custom-stripe-plugin');
    
    // Inject a custom React UI for the plugin's configuration modal
    this.adminEntry = 'my-stripe-plugin/admin';
  }
}
```

## Admin UI Customization

The Admin Dashboard is built with React. You can inject your own custom React components into specific slots within the UI.

### Custom Fields

If the 21 built-in field types aren't enough, you can build your own. For example, a custom color picker:

```typescript
// kyro.config.ts
import { z } from "zod";

export default {
  name: "settings",
  fields: z.object({
    themeColor: z.string().kyroAdmin({
      // Tell the admin dashboard to use your custom component
      component: "CustomColorPicker" 
    })
  })
}
```

Then, when mounting your admin dashboard, you register the component:

```astro
---
// admin/index.astro
import { Admin } from '@kyro-cms/admin';
import config from '../kyro.config';
import CustomColorPicker from '../components/admin/CustomColorPicker';

const customComponents = {
  CustomColorPicker
};
---

<Admin client:load config={config} components={customComponents} />
```

### Custom Views & Pages

You can also inject entirely new pages into the sidebar navigation.

```typescript
// kyro.config.ts
export default defineConfig({
  admin: {
    views: [
      {
        path: "/reports",
        name: "Monthly Reports",
        component: "ReportsDashboard",
        icon: "chart-bar"
      }
    ]
  }
});
```

## Styling the Admin

If you just want to tweak the colors and branding of the Admin Dashboard, you don't need a plugin. Kyro provides a theming utility:

```typescript
import { createAdminStyling } from "@kyro-cms/core/client";

const myTheme = createAdminStyling({
  primaryColor: "#6366f1",
  borderRadius: "medium",
  fontFamily: "Inter, sans-serif",
});
```

You can then pass this theme object or generated CSS variables to your `<Admin />` component.

### Custom Block Visual Identity (Theming)

If you have built custom Semantic Blocks using a plugin or local extension, you can tap into the internal `blockTheme` system so your custom blocks perfectly match the core UI's aesthetic.

By assigning unique Tailwind class strings to your custom block slug, Kyro will automatically render glowing borders, colored icons, and colored `SlidePanel` accent lines for your block.

```typescript
// Example: Registering visual identity for a custom block
import { blockTheme } from "@kyro-cms/admin/components";

// Target your custom block's exact slug
blockTheme["my-custom-quiz-block"] = {
  text: "text-purple-500",
  border: "border-purple-500",
  borderLeft: "border-l-2 border-purple-500"
};
```

### Adding Custom Blocks to the UI Drawer

In Kyro, the `+ Add Block` UI drawer is completely dynamic. You don't need to write any React code to add your custom blocks to the admin panel. 

By simply defining `admin.group` and `admin.description` in your block's schema definition, the CMS will automatically construct the UI drawer category for you.

```typescript
// kyro.config.ts
export default defineConfig({
  collections: [
    {
      name: "pages",
      fields: [
        {
          name: "content",
          type: "blocks",
          blocks: [
            ...coreSemanticBlocks,
            {
              slug: "my-custom-quiz-block",
              label: "Interactive Quiz",
              // The drawer will automatically group this block under "Custom Widgets"
              admin: {
                group: "Custom Widgets",
                description: "A specialized quiz block for engagement"
              },
              fields: [
                { name: "title", type: "text" }
              ]
            }
          ]
        }
      ]
    }
  ]
});
```
If you omit the `admin.group`, Kyro will gracefully fall back to placing your block in a default "Custom Blocks" category.

### Block Picker Modes

Blocks-type fields offer two picker modes controlled by `admin.pickerMode`:

- **`"drawer"` (default):** The slide-out `BlockDrawer` panel with a grid layout, categories, and drag-and-drop support — ideal for larger block sets like page content.
- **`"dropdown"`:** A compact inline dropdown menu that appears below the "Add Element" button — ideal for small sets of inline primitives (e.g., the built-in heading/text/image/button/video/list elements).

```typescript
{
  name: "elements",
  type: "blocks",
  label: "Extra Content Elements",
  blocks: elementBlocks,
  admin: { pickerMode: "dropdown" },
}
```

### Inline Group Layout

Groups support `admin: { inline: true }` to render sub-fields in a horizontal flex row instead of the default vertical stack. This is useful for compact field combinations like label + URL pairs:

```typescript
{
  name: "buttonData",
  type: "group",
  label: "Button",
  admin: { inline: true },
  fields: [
    { name: "text", type: "text", label: "Label" },
    { name: "url", type: "text", label: "URL" },
  ],
}
```

### Compact Array Rendering

Array fields with 4 or fewer sub-fields that are all primitive types (`text`, `textarea`, `number`, `checkbox`, `select`, `radio`, `color`, `email`, `password`, `code`, `markdown`, `upload`) automatically render as compact inline rows — no accordion, no expand/collapse. Each item appears as a single numbered row with inline fields and a remove button.

## Collection Overrides

Collection overrides allow you to customize how built-in collections behave without modifying their source definitions. This is especially useful for extending relationships to include user-defined collections, or even appending completely new fields.

> [!TIP]
> **Modifying and Adding Fields**
> `collectionOverrides` can be used both to modify properties of **existing** fields and to **append new fields**. If the field path you specify does not exist in the collection, Kyro CMS will automatically append it as a new field at the specified path.

### Admin-Level Overrides

You can override collection admin properties like icons, columns, and layout:

```typescript
// kyro.config.ts
export default defineConfig({
  admin: {
    collectionOverrides: {
      pages: {
        icon: "FileText",
        defaultColumns: ["title", "slug", "updatedAt"]
      },
      posts: {
        icon: "Newspaper",
        group: "Content"
      }
    }
  }
});
```

### Field-Level Overrides

Override specific field properties using dot-notation paths. This is particularly useful for extending relationship fields with additional collections:

```typescript
// kyro.config.ts
export default defineConfig({
  admin: {
    collectionOverrides: {
      menu: {
        fields: {
          // Path syntax: "parentField.arrayField.targetField"
          "menu.menuItem.internalTarget": {
            relationTo: [
              "pages",
              "posts",
              "trips",           // User-defined collections
              "destinations",
              "services"
            ]
          }
        }
      }
    }
  }
});
```

### Path Syntax for Nested Fields

Field override paths use dot notation to navigate through nested field structures:

- **Simple field**: `"fieldName"`
- **Nested in group**: `"groupName.fieldName"`
- **Nested in array**: `"arrayName.fieldName"`
- **Multiple levels**: `"groupName.arrayName.fieldName"`

> [!TIP]
> **Structural UI Wrappers (Tabs, Rows)**
> If a field is wrapped in a structural layout field like `tabs` or `row`, you **do not** need to include the wrapper's name in your path! Kyro CMS natively traverses through layout wrappers to find your field, mirroring the actual flat database structure.
> For example, if `content` is inside `tabs`, you still just use `"content"`.

Example with a complex structure:

```typescript
collectionOverrides: {
  menu: {
    fields: {
      // Navigate through: group "menu" → array "menuItem" → field "internalTarget"
      "menu.menuItem.internalTarget": {
        relationTo: ["pages", "posts", "custom_collection"]
      }
    }
  }
}
```

### Real-World Example

If you have a Menu collection with guaranteed relationships to pages and posts, but want to allow optional relationships to custom collections:

**1. Collection definition (pages/posts guaranteed):**
```typescript
// src/templates/menu.ts
export const menuCollection: CollectionConfig = {
  slug: "menu",
  fields: [
    {
      name: "menu",
      type: "group",
      fields: [
        {
          name: "menuItem",
          type: "array",
          fields: [
            {
              name: "internalTarget",
              type: "relationship",
              relationTo: ["pages", "posts"],  // Base required collections
              admin: {
                condition: { field: "linkType", equals: "internal" }
              }
            }
          ]
        }
      ]
    }
  ]
};
```

**2. User extends with custom collections:**
```typescript
// kyro.config.ts
export default defineConfig({
  admin: {
    collectionOverrides: {
      menu: {
        fields: {
          "menu.menuItem.internalTarget": {
            // Add your custom collections here
            relationTo: ["pages", "posts", "trips", "destinations", "services"]
          }
        }
      }
    }
  }
});
```

### Supported Field Overrides

Any field property can be overridden:

```typescript
"fieldPath": {
  relationTo: ["pages", "posts"],        // Relationship fields
  hidden: true,                          // Visibility
  readOnly: true,                        // Editability
  required: false,                       // Validation
  label: "Custom Label",                 // Display
  // ... any other field property
}
```

---

## Interactive Button Fields (Use Cases & Gotchas)

Kyro CMS provides a built-in `"button"` field type that serves two very different functions depending on where and how you configure it. Because of this dual nature, it can sometimes be a source of confusion.

### Use Case 1: Custom API Triggers (Interactive Actions)

When configured in **Collection** or **Global** schemas, a `"button"` field acts as an interactive UI element that triggers an authenticated REST API request when clicked. This is ideal for tasks like sending test emails, initiating webhooks, or syncing external integrations directly from the Admin Panel.

#### Configuration Structure
To make the button interactive, you **must** supply an `action` endpoint URL and an optional `method` (defaults to `"POST"`) under the `admin` block or at the root of the field definition:

```typescript
{
  name: "triggerSync",
  type: "button",
  label: "Sync Now",
  admin: {
    action: "/api/sync/trigger",
    method: "POST"
  }
}
```

#### The Email-Sibling Gotcha (Row Actions)
If you place a `"button"` field inside a `"row"` type field alongside an `"email"` field, Kyro's form renderer (`AutoForm`) automatically binds them:
1. When the button is clicked, it scans the row for the sibling email input.
2. It fetches the email value and sends it inside a JSON payload: `{"email": "user@example.com"}`.
3. It displays automated `"Sending..."` states and fires toast success/error notifications.

#### Standalone Form Posting
If the button is placed standalone (outside of a row or without email siblings), clicking it serializes the **entire** current form's state (`formData`) as a JSON payload and sends it to the configured `action` URL.

> [!WARNING]
> **Gotcha:** If you define a field of type `"button"` but omit the `action` endpoint configuration, the button will be displayed but clicking it will do nothing.

> [!IMPORTANT]
> **Renderer Behavior:** Actions are only rendered inside dynamic form editors (`AutoForm`). General data-display views (like lists or read-only summary panels) will bypass or ignore `"button"` fields since they represent operational controls rather than static data properties.

---

### Use Case 2: Content CTA blocks (The Block Builder)

When used inside **content blocks** (for example, in your blocks editor or page layout builder), the `"button"` field serves as a standard data input to store user-defined call-to-actions.

In this context, the Admin Panel automatically renders two text inputs:
1. **Button text** (e.g. `"Learn More"`)
2. **Button URL** (e.g. `"https://example.com"`)

This writes a structured object directly to your document:
```json
{
  "text": "Learn More",
  "url": "https://example.com"
}
```
You can then retrieve this JSON in your frontend Astro templates to output a fully styled clickable hyperlink.

### Mobile Responsiveness (v0.9.5+)

The admin dashboard is fully responsive. Key mobile features:
- **ActionBar**: Single-line toolbar with overflow menu (IconMoreVertical) on mobile. Status dot replaces badge.
- **FAB**: Floating action button (right-aligned, mobile-only) for quick command palette access.
- **SlidePanels**: Full-width on mobile (w-full sm:w-[size]).
- **PageHeader**: Collapsible breadcrumbs using `&lt;details&gt;` element.
- **AutoForm**: Settings sidebar is a collapsible accordion. Tab strip hidden on mobile.
- **Media Gallery**: Filter button opens a bottom sheet.
- **Theme variables**: All UI components use --kyro-* CSS variables for consistent theming.
