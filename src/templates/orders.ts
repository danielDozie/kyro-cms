import type { CollectionConfig } from "../registry/types.js";


export const ordersCollection: CollectionConfig = {
  slug: "orders",
  label: "Orders",
  labelPlural: "Orders",
  singularLabel: "Order",
  admin: {
    group: "Commerce",
    disablePreview: true,
    useAsTitle: "orderNumber",
    defaultColumns: [
      "orderNumber",
      "customer",
      "orderStatus",
      "total",
      "createdAt",
      "updatedAt",
    ],
    description: "Customer orders",
  },
  fields: [
    {
      name: "slug",
      type: "text",
      required: true,
      label: "Slug",
      admin: { position: "sidebar", autoGenerate: "orderNumber" },
    },
    {
      name: "orderNumber",
      type: "text",
      required: true,
      label: "Order Number",
      admin: { readOnly: true },
      hooks: {
        beforeValidate: [
          async ({ value, operation, req }) => {
            if (operation === "create" && !value) {
              try {
                const host = req?.headers?.host || "localhost:4321";
                const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
                const baseUrl = `${protocol}://${host}`;
                
                const res = await fetch(`${baseUrl}/api/globals/store-settings`);
                if (res.ok) {
                  const data = await res.json();
                  const prefix = data?.orders?.orderNumberPrefix || "ORD";
                  const randomNum = Math.floor(100000 + Math.random() * 900000);
                  return `${prefix}-${randomNum}`;
                }
              } catch (e) {
                console.error("Failed to fetch store settings for order prefix:", e);
              }
              const randomNum = Math.floor(100000 + Math.random() * 900000);
              return `ORD-${randomNum}`;
            }
            return value;
          }
        ]
      }
    },
    {
      name: "customer",
      type: "relationship",
      required: true,
      label: "Customer",
      relationTo: "customers",
    },
    {
      name: "orderStatus",
      type: "select",
      label: "Order Status",
      options: [
        { label: "Pending", value: "pending", color: "#6b7280" },
        { label: "Processing", value: "processing", color: "#3b82f6" },
        { label: "Shipped", value: "shipped", color: "#8b5cf6" },
        { label: "In Transit", value: "in_transit", color: "#f59e0b" },
        { label: "Delivered", value: "delivered", color: "#10b981" },
        { label: "Completed", value: "completed", color: "#059669" },
        { label: "Cancelled", value: "cancelled", color: "#ef4444" },
      ] as any,
      defaultValue: "pending",
    },
    {
      name: "paymentStatus",
      type: "select",
      label: "Payment Status",
      admin: { position: "sidebar" },
      options: [
        { label: "Pending", value: "pending" },
        { label: "Paid", value: "paid" },
        { label: "Failed", value: "failed" },
        { label: "Refunded", value: "refunded" },
      ],
      defaultValue: "pending",
    },
    {
      name: "items",
      type: "array",
      label: "Items",
      fields: [
        {
          name: "product",
          type: "relationship",
          label: "Product",
          relationTo: "products",
          required: true,
          admin: { readOnly: (data: any) => Boolean(data?.id) }
        },
        { 
          name: "quantity", 
          type: "number", 
          label: "Quantity",
          admin: { readOnly: (data: any) => Boolean(data?.id) }
        },
        { 
          name: "unitPrice", 
          type: "number", 
          label: "Unit Price",
          admin: { readOnly: (data: any) => Boolean(data?.id) }
        },
        { 
          name: "total", 
          type: "number", 
          label: "Total",
          admin: { readOnly: (data: any) => Boolean(data?.id) }
        },
      ],
      admin: {
        readOnly: (data: any) => Boolean(data?.id)
      }
    },
    { 
      name: "subtotal", 
      type: "number", 
      required: true, 
      label: "Subtotal",
      admin: { readOnly: (data: any) => Boolean(data?.subtotal) }
    },
    { name: "tax", type: "number", label: "Tax" },
    { name: "shipping", type: "number", label: "Shipping" },
    { name: "discount", type: "number", label: "Discount" },
    { 
      name: "total", 
      type: "number", 
      required: true, 
      label: "Total",
      admin: { readOnly: (data: any) => Boolean(data?.total) }
    },
    { 
      name: "notes", 
      type: "textarea", 
      label: "Notes",
      admin: { position: "sidebar" }
    },
  ],
  timestamps: true,
  versions: {
    drafts: true,
    maxPerDoc: 10,
  },
};

export const ordersCollections: Record<string, CollectionConfig> = {
  orders: ordersCollection,
};

export default ordersCollections;
