---
title: E-Commerce
description: How to build online stores using Kyro CMS's pre-built e-commerce templates and features.
---

# E-Commerce

Kyro CMS is an excellent foundation for building headless e-commerce platforms. Because it is completely unopinionated about your frontend, you can use Kyro to power the backend of a highly customized Astro, Next.js, or React Native storefront.

## The E-Commerce Template

Instead of building your store schema from scratch, Kyro provides a pre-built template of collections designed specifically for e-commerce.

You can import these collections directly into your configuration:

```typescript
import { defineConfig, createLocalAdapter } from "@kyro-cms/core";
import { ecommerceCollections } from "@kyro-cms/core/templates";

export default defineConfig({
  adapter: createLocalAdapter({ path: "./store.db" }),
  // This automatically registers Products, Orders, Customers, and Categories
  collections: [
    ...Object.values(ecommerceCollections)
  ],
});
```

## Included Collections

The `ecommerceCollections` bundle includes:

### 1. Products
Manages your inventory. Includes fields for:
- Title, Slug, Description
- Pricing (Base Price, Sale Price, Currency)
- Inventory management (SKU, Stock Count, Low Stock Threshold)
- Relationships to Categories and Media
- Variants (e.g., Size, Color)

### 2. Categories
Hierarchical organization for products.
- Title, Slug
- Parent Category (Self-referential relationship)
- Featured Image

### 3. Customers
Manages buyer data (distinct from Admin users).
- Name, Email, Phone
- Billing and Shipping Addresses
- Order History (Relationship to Orders)

### 4. Orders
Tracks purchases and fulfillment.
- Order Number
- Status (Pending, Paid, Shipped, Delivered, Cancelled)
- Line Items (Array of Product References, Quantities, and Snapshotted Prices)
- Total Amount
- Stripe/Payment Intent IDs

## Customizing the Template

The beauty of the template approach is that it just returns an array of standard Kyro Collection definitions. You can easily modify them before passing them to `defineConfig`.

```typescript
import { defineConfig } from "@kyro-cms/core";
import { ecommerceCollections } from "@kyro-cms/core/templates";

// Extract the products collection
const productsCollection = ecommerceCollections.products;

// Add a custom "Reviews" relationship field to the existing products schema
productsCollection.fields.push({
  name: "reviews",
  type: "relationship",
  relationTo: "reviews",
  hasMany: true
});

export default defineConfig({
  // ...
  collections: [
    productsCollection,
    ecommerceCollections.orders,
    ecommerceCollections.customers,
    ecommerceCollections.categories,
    // Plus your custom collections
    {
      name: "reviews",
      fields: [/* ... */]
    }
  ],
});
```

## Payment Processing Integration

Kyro CMS does not process credit cards directly. You are expected to integrate a payment provider like Stripe or PayPal on your frontend, and use Kyro's API (or webhooks) to securely record the transaction.

A typical workflow:
1. Customer adds items to cart on your Astro frontend.
2. Frontend requests Kyro API to calculate the final total based on actual product prices in the database (preventing client-side tampering).
3. Frontend redirects to Stripe Checkout.
4. Stripe fires a webhook to your Kyro backend.
5. A Kyro webhook handler (or custom API route) verifies the signature and creates an `Order` document.
