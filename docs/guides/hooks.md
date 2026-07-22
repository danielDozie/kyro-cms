---
title: Lifecycle Hooks
description: Intercept and modify data at various stages of the document lifecycle in Kyro CMS using Collection, Global, and Field Hooks.
---

# Lifecycle Hooks

Hooks in Kyro CMS allow you to intercept, validate, or modify data at various stages of the document lifecycle. They are essential for tasks like hashing passwords, auto-generating fields (like slugs or timestamps), interacting with third-party APIs, or enforcing complex validation rules.

There are three levels of hooks in Kyro CMS:
1. **Collection Hooks:** Run on collections (e.g., Posts, Users).
2. **Global Hooks:** Run on singletons (e.g., Settings, Navigation).
3. **Field Hooks:** Run on specific fields within a Collection or Global schema.

---

## Hook Arguments (`HookArgs`)

All hooks receive a unified `HookArgs` object. This object contains context about the current operation:

```typescript
export interface HookArgs<T = any> {
  collection?: string;
  global?: string;
  data?: T;                        // The incoming data (before saving)
  originalDoc?: T;                 // The existing document (before changes)
  doc?: T;                         // The resulting document (after changes/reads)
  req: Request;                    // The incoming HTTP request
  user?: User;                     // The currently authenticated user
  operation: 'create' | 'read' | 'update' | 'delete';
  tenantId?: string;               // ID of the tenant (if multi-tenancy is active)
  field?: string;                  // Field name (for Field Hooks)
  value?: any;                     // Current field value (for Field Hooks)
  previousValue?: any;             // Previous field value (for Field Hooks)
  siblingData?: Record<string, any>; // Data of sibling fields
  context?: Record<string, any>;   // Custom context passed between hooks
}
```

If a hook returns a value (or a Promise resolving to a value), that value replaces the current `data` or `value` in the lifecycle. If a hook returns `void`, the pipeline continues without modifying the data.

---

## 1. Collection Hooks

Collection Hooks run during the lifecycle of documents within a specific collection. They are defined in your `CollectionConfig` under the `hooks` property.

### Standard Lifecycle Hooks

- `beforeValidate`: Runs before the incoming data is validated against the schema. Ideal for sanitizing or casting data.
- `beforeChange`: Runs immediately before a document is saved (either created or updated) to the database. Useful for auto-generating fields or hashing passwords.
- `afterChange`: Runs immediately after a document has been saved. Useful for triggering side effects like sending emails, triggering webhooks, or syncing to external services.
- `beforeRead`: Runs before a document is fetched from the database. Can be used to enforce read-level row security or modify query parameters.
- `afterRead`: Runs after a document is fetched, but before it is returned to the client. Useful for removing sensitive fields (like passwords) or computing virtual fields.
- `beforeDelete`: Runs right before a document is permanently deleted from the database.
- `afterDelete`: Runs immediately after a document has been deleted. Useful for cleaning up associated files or external records.

### Auth-Specific Hooks

If your collection is authentication-enabled (`auth: true`), you also have access to:

- `beforeLogin`
- `afterLogin`
- `afterLogout`
- `afterRefresh`
- `afterForgotPassword`

### Example: Collection Hooks

```typescript
import { CollectionConfig } from '@kyro-cms/core';
import bcrypt from 'bcryptjs';

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  fields: [
    { name: 'email', type: 'text', required: true },
    { name: 'password', type: 'text', required: true },
    { name: 'fullName', type: 'text' },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        // Automatically hash passwords on create or when updated
        if (operation === 'create' || (operation === 'update' && data.password)) {
          const salt = await bcrypt.genSalt(10);
          data.password = await bcrypt.hash(data.password, salt);
        }
        return data; // Always return the mutated data!
      }
    ],
    afterChange: [
      async ({ doc, operation }) => {
        if (operation === 'create') {
          console.log(`New user registered: ${doc.email}`);
        }
      }
    ],
    afterRead: [
      ({ doc }) => {
        // Strip the password hash before sending to the client
        if (doc?.password) {
          delete doc.password;
        }
        return doc;
      }
    ]
  }
};
```

---

## 2. Global Hooks

Globals are singletons (e.g., Site Settings). Their hooks mirror the Collection lifecycle but exclude deletion and auth-specific events.

Available Global Hooks:
- `beforeValidate`
- `beforeChange`
- `afterChange`
- `beforeRead`
- `afterRead`

### Example: Global Hooks

```typescript
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  fields: [
    { name: 'siteName', type: 'text' },
    { name: 'maintenanceMode', type: 'checkbox' }
  ],
  hooks: {
    afterChange: [
      async ({ doc }) => {
        if (doc.maintenanceMode) {
          // Notify the infrastructure team or clear caches
          await fetch('https://api.example.com/clear-cache', { method: 'POST' });
        }
      }
    ]
  }
};
```

---

## 3. Field Hooks

Field hooks allow you to isolate logic to a single field, making your schema cleaner and your logic highly reusable.

Available Field Hooks:
- `beforeValidate`
- `beforeChange`
- `afterChange`
- `afterRead`

### Example: Field Hooks (Auto-generating a Slug)

Instead of managing slug generation in a Collection hook where you have to look up the field manually, you can attach it directly to the `slug` field.

```typescript
import { Field } from '@kyro-cms/core';

export const SlugField: Field = {
  name: 'slug',
  type: 'text',
  hooks: {
    beforeChange: [
      ({ value, siblingData }) => {
        // If a slug was manually provided, use it
        if (value) {
          return value.toLowerCase().replace(/\s+/g, '-');
        }
        // Otherwise, auto-generate it from the title
        if (siblingData?.title) {
          return siblingData.title.toLowerCase().replace(/\s+/g, '-');
        }
        return value;
      }
    ]
  }
};
```

> [!TIP]
> In Field Hooks, you receive `value` (the value of the current field) and `siblingData` (a map of the data for all other fields at the same nesting level). This is incredibly useful for computing derived values.
