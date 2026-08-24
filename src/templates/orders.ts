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
      "customerName",
      "paymentMethod",
      "orderStatus",
      "paymentStatus",
      "total",
      "createdAt",
    ],
    description: "Customer orders and fulfillment details",
    icon: "Receipt",
  },
  fields: [
    // Sidebar Quick Controls & Status
    {
      name: "slug",
      type: "text",
      required: true,
      label: "Order Slug",
      admin: { position: "sidebar", autoGenerate: "orderNumber", readOnly: true },
    },
    {
      name: "orderNumber",
      type: "text",
      required: true,
      label: "Order Number",
      admin: { position: "sidebar", readOnly: true },
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
      name: "orderStatus",
      type: "select",
      label: "Order Status",
      admin: { position: "sidebar" },
      options: [
        { label: "Pending", value: "pending", color: "#6b7280" },
        { label: "Processing", value: "processing", color: "#3b82f6" },
        { label: "Preparing", value: "preparing", color: "#6366f1" },
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
        { label: "Pending", value: "pending", color: "#6b7280" },
        { label: "Paid", value: "paid", color: "#10b981" },
        { label: "Failed", value: "failed", color: "#ef4444" },
        { label: "Refunded", value: "refunded", color: "#8b5cf6" },
        { label: "Partially Refunded", value: "partially_refunded", color: "#f59e0b" },
      ] as any,
      defaultValue: "pending",
    },
    {
      name: "paymentMethod",
      type: "select",
      label: "Payment Method",
      admin: { position: "sidebar", readOnly: true },
      options: [
        { label: "Apple Pay", value: "applepay" },
        { label: "Google Pay", value: "googlepay" },
        { label: "Credit / Debit Card", value: "card" },
        { label: "Cash on Delivery", value: "cash" },
        { label: "Bank Transfer", value: "transfer" },
        { label: "PayPal", value: "paypal" },
      ],
      defaultValue: "card",
    },
    {
      name: "deliveryMethod",
      type: "select",
      label: "Fulfillment Type",
      admin: { position: "sidebar", readOnly: true },
      options: [
        { label: "Delivery", value: "delivery" },
        { label: "Pickup", value: "pickup" },
        { label: "Dine-in", value: "dine-in" },
      ],
      defaultValue: "delivery",
    },

    // Main Compact Tabbed Sections
    {
      type: "tabs",
      tabs: [
        {
          label: "Items & Totals",
          fields: [
            {
              name: "items",
              type: "array",
              label: "Order Items",
              admin: { readOnly: true, display: "pills" },
              fields: [
                {
                  name: "name",
                  type: "text",
                  label: "Item Name",
                  admin: { readOnly: true },
                },
                {
                  name: "quantity",
                  type: "number",
                  label: "Qty",
                  defaultValue: 1,
                  admin: { readOnly: true },
                },
                {
                  name: "unitPrice",
                  type: "number",
                  label: "Unit Price ($)",
                  admin: { readOnly: true },
                },
                {
                  name: "total",
                  type: "number",
                  label: "Line Total ($)",
                  admin: { readOnly: true },
                },
                {
                  name: "options",
                  type: "text",
                  label: "Selected Customizations / Options",
                  admin: { readOnly: true },
                },
                {
                  name: "product",
                  type: "relationship",
                  label: "Product",
                  relationTo: "products",
                  admin: { readOnly: true },
                },
                {
                  name: "image",
                  type: "text",
                  label: "Item Image URL",
                  admin: { readOnly: true },
                },
              ],
            },
            {
              name: "subtotal",
              type: "number",
              required: true,
              label: "Subtotal ($)",
              admin: { readOnly: true },
            },
            {
              name: "tax",
              type: "number",
              label: "Tax / VAT ($)",
              admin: { readOnly: true },
            },
            {
              name: "shipping",
              type: "number",
              label: "Delivery / Shipping Fee ($)",
              admin: { readOnly: true },
            },
            {
              name: "tip",
              type: "number",
              label: "Tip ($)",
              defaultValue: 0,
              admin: { readOnly: true },
            },
            {
              name: "discount",
              type: "number",
              label: "Discount ($)",
              defaultValue: 0,
              admin: { readOnly: true },
            },
            {
              name: "couponCode",
              type: "text",
              label: "Coupon Code Applied",
              admin: { readOnly: true },
            },
            {
              name: "total",
              type: "number",
              required: true,
              label: "Grand Total ($)",
              admin: { readOnly: true },
            },
          ],
        },
        {
          label: "Customer & Delivery",
          fields: [
            {
              name: "customer",
              type: "relationship",
              label: "Customer Account",
              relationTo: "customers",
              admin: { readOnly: true },
            },
            {
              name: "customerName",
              type: "text",
              label: "Customer Name",
              admin: { readOnly: true },
            },
            {
              name: "customerEmail",
              type: "text",
              label: "Customer Email",
              admin: { readOnly: true },
            },
            {
              name: "customerPhone",
              type: "text",
              label: "Phone Number",
              admin: { readOnly: true },
            },
            {
              name: "deliveryTime",
              type: "text",
              label: "Requested Delivery Time",
              admin: { readOnly: true },
            },
            {
              name: "shippingAddress",
              type: "group",
              label: "Delivery Address",
              admin: { readOnly: true },
              fields: [
                { name: "line1", type: "text", label: "Street Address", admin: { readOnly: true } },
                { name: "line2", type: "text", label: "Apt / Suite / Unit", admin: { readOnly: true } },
                { name: "city", type: "text", label: "City", admin: { readOnly: true } },
                { name: "state", type: "text", label: "State / Region", admin: { readOnly: true } },
                { name: "postalCode", type: "text", label: "Zip / Postal Code", admin: { readOnly: true } },
                { name: "country", type: "text", label: "Country", defaultValue: "USA", admin: { readOnly: true } },
              ],
            },
          ],
        },
        {
          label: "Notes & Instructions",
          fields: [
            {
              name: "notes",
              type: "textarea",
              label: "Customer Instructions / Notes",
              admin: { readOnly: true, description: "Customer instructions supplied at checkout" },
            },
            {
              name: "internalNotes",
              type: "textarea",
              label: "Staff Internal Fulfillment Notes",
              admin: { description: "Editable internal notes for kitchen/admin staff" },
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data }: any) => {
        if (data && Array.isArray(data.items)) {
          data.totalQuantity = data.items.reduce(
            (sum: number, item: any) => sum + (Number(item.quantity) || 1),
            0
          );
        }
        return data;
      },
    ],
    afterChange: [
      async ({ data, doc, operation, req }) => {
        const orderData = data || doc;
        if (operation === "create" && orderData) {
          try {
            const { EmailTransport } = await import("../auth/nodemailer-transport.js");
            const db = (req as any)?.db || (globalThis as any).kyroDb;
            const transport = (await EmailTransport.fromConfig(db).catch(() => null)) || EmailTransport.fromEnv();
            
            if (transport) {
              const customerEmail =
                orderData.customerEmail ||
                (typeof orderData.customer === "string" && orderData.customer.includes("@") ? orderData.customer : null);

              if (customerEmail) {
                const templates = transport.getTemplates();
                const totalFormatted =
                  typeof orderData.total === "number" ? orderData.total.toFixed(2) : String(orderData.total || "0.00");
                const orderNum = orderData.orderNumber || orderData.id || "ORD";

                const host = (req as any)?.headers?.host || "localhost:4321";
                const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
                const trackingUrl = `${protocol}://${host}/track-order?orderId=${encodeURIComponent(orderNum)}`;

                const email = templates.orderConfirmation(
                  orderNum,
                  orderData.customerName || "Customer",
                  totalFormatted,
                  trackingUrl
                );

                await transport.send({
                  to: customerEmail,
                  ...email,
                });
                console.log(`[Kyro CMS Hook] Auto-sent orderConfirmation email to ${customerEmail} for order ${orderNum}`);
              }
            }
          } catch (err) {
            console.error("[Kyro CMS Hook] Failed to execute orders afterChange email hook:", err);
          }
        }
      },
    ],
  },
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
