---
title: SaaS & Multi-Tenant Provisioning
description: Use Kyro CMS to build multi-vendor platforms, SaaS applications, and enterprise systems using row-level access control.
---

# SaaS & Multi-Tenant Provisioning

Kyro CMS is uniquely positioned to power Software-as-a-Service (SaaS) products and multi-vendor marketplaces. Because it provides granular row-level access control and dynamic querying, you can easily scope data to specific organizations or tenants within a single database.

## Tenant Scoping Architecture

In a multi-tenant application, multiple customers (tenants) share the same database, but they must only ever see their own data.

To achieve this in Kyro, you define an `organizations` (or `tenants`) collection, and relate all other collections to it.

```typescript
import { defineConfig } from "@kyro-cms/core";
import { z } from "zod";

export default defineConfig({
  collections: [
    {
      name: "organizations",
      fields: z.object({
        name: z.string(),
        domain: z.string(),
      })
    },
    {
      name: "projects",
      fields: z.object({
        title: z.string(),
        organizationId: z.string().kyroType("relationship", { relationTo: "organizations" }),
      }),
      // Scope access dynamically!
      access: {
        read: ({ req, doc }) => {
          // If the user is a super admin, they can see all projects
          if (req.user.role === "super_admin") return true;
          
          // Otherwise, they can only see projects belonging to their organization
          return doc.organizationId === req.user.organizationId;
        },
        create: ({ req, data }) => {
          // Ensure users can only create projects in their own organization
          return data.organizationId === req.user.organizationId;
        }
      }
    }
  ]
});
```

## Row-Level Access Control

Notice the `access` property in the example above. Kyro allows you to define access control as a function that returns a boolean. This function is evaluated on the server-side *before* any data is returned to the API or the Admin Dashboard.

If a user logs into the Admin Dashboard and they are restricted by this access control rule, Kyro will automatically filter the list views and relationships so they only see documents where `organizationId` matches their own.

## Multi-Vendor E-Commerce

You can apply this exact same logic to the E-Commerce templates.

By adding a `vendorId` relationship to the `Products` and `Orders` collections, you can build a marketplace where thousands of vendors log into the same Kyro Admin Dashboard, but only see their own products and their own sales.

```typescript
import { ecommerceCollections } from "@kyro-cms/core/templates";

const products = ecommerceCollections.products;

// Add vendor relation
products.fields.push({
  name: "vendor",
  type: "relationship",
  relationTo: "users",
  required: true
});

// Scope product visibility to the vendor
products.access = {
  read: ({ req, doc }) => doc.vendor === req.user.id || req.user.role === "admin",
  update: ({ req, doc }) => doc.vendor === req.user.id || req.user.role === "admin",
};
```
