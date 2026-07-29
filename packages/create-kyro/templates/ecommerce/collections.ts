import type { CollectionConfig, GlobalConfig } from '@kyro-cms/core';

export const ecommerceCollections: Record<string, CollectionConfig> = {
  products: {
    slug: 'products',
    label: 'Products',
    labelPlural: 'Products',
    singularLabel: 'Product',
    admin: {
      useAsTitle: 'title',
      defaultColumns: ['title', 'price', 'status', 'inventory'],
      description: 'Product catalog'
    },
    fields: [
      {
        name: 'title',
        type: 'text',
        required: true,
        label: 'Title'
      },
      {
        name: 'slug',
        type: 'text',
        required: true,
        label: 'Slug'
      },
      {
        name: 'description',
        type: 'richtext',
        label: 'Description'
      },
      {
        name: 'price',
        type: 'number',
        required: true,
        label: 'Price'
      },
      {
        name: 'compareAtPrice',
        type: 'number',
        label: 'Compare at Price',
        admin: { description: 'Original price for sale display' }
      },
      {
        name: 'costPrice',
        type: 'number',
        label: 'Cost Price',
        admin: { description: 'For profit calculation' }
      },
      {
        name: 'sku',
        type: 'text',
        required: true,
        label: 'SKU'
      },
      {
        name: 'barcode',
        type: 'text',
        label: 'Barcode'
      },
      {
        name: 'status',
        type: 'select',
        label: 'Status',
        options: [
          { label: 'Draft', value: 'draft' },
          { label: 'Active', value: 'active' },
          { label: 'Archived', value: 'archived' }
        ],
        defaultValue: 'draft'
      },
      {
        name: 'images',
        type: 'array',
        label: 'Images',
        fields: [
          { name: 'url', type: 'text', label: 'URL' },
          { name: 'alt', type: 'text', label: 'Alt Text' }
        ]
      },
      {
        name: 'category',
        type: 'relationship',
        label: 'Category',
        relationTo: 'categories'
      },
      {
        name: 'inventory',
        type: 'number',
        label: 'Inventory',
        defaultValue: 0
      }
    ],
    timestamps: true
  },

  categories: {
    slug: 'categories',
    label: 'Categories',
    labelPlural: 'Categories',
    singularLabel: 'Category',
    admin: {
      useAsTitle: 'name',
      defaultColumns: ['name', 'slug', 'productCount'],
      description: 'Product categories'
    },
    fields: [
      { name: 'name', type: 'text', required: true, label: 'Name' },
      { name: 'slug', type: 'text', required: true, label: 'Slug' },
      { name: 'description', type: 'textarea', label: 'Description' },
      { name: 'image', type: 'text', label: 'Image URL' },
      {
        name: 'parent',
        type: 'relationship',
        label: 'Parent Category',
        relationTo: 'categories'
      }
    ],
    timestamps: true
  },

  customers: {
    slug: 'customers',
    label: 'Customers',
    labelPlural: 'Customers',
    singularLabel: 'Customer',
    admin: {
      useAsTitle: 'email',
      defaultColumns: ['email', 'firstName', 'lastName', 'orderCount', 'createdAt'],
      description: 'Customer accounts'
    },
    fields: [
      { name: 'email', type: 'email', required: true, label: 'Email' },
      { name: 'firstName', type: 'text', label: 'First Name' },
      { name: 'lastName', type: 'text', label: 'Last Name' },
      { name: 'phone', type: 'text', label: 'Phone' },
      {
        name: 'addresses',
        type: 'array',
        label: 'Addresses',
        fields: [
          { name: 'type', type: 'text', label: 'Type' },
          { name: 'line1', type: 'text', label: 'Address Line 1' },
          { name: 'line2', type: 'text', label: 'Address Line 2' },
          { name: 'city', type: 'text', label: 'City' },
          { name: 'state', type: 'text', label: 'State' },
          { name: 'postalCode', type: 'text', label: 'Postal Code' },
          { name: 'country', type: 'text', label: 'Country' }
        ]
      },
      {
        name: 'status',
        type: 'select',
        label: 'Status',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' },
          { label: 'Banned', value: 'banned' }
        ],
        defaultValue: 'active'
      }
    ],
    timestamps: true
  },

  orders: {
    slug: 'orders',
    label: 'Orders',
    labelPlural: 'Orders',
    singularLabel: 'Order',
    admin: {
      useAsTitle: 'orderNumber',
      defaultColumns: ['orderNumber', 'customer', 'status', 'total', 'createdAt'],
      description: 'Customer orders'
    },
    fields: [
      {
        name: 'orderNumber',
        type: 'text',
        required: true,
        label: 'Order Number'
      },
      {
        name: 'customer',
        type: 'relationship',
        required: true,
        label: 'Customer',
        relationTo: 'customers'
      },
      {
        name: 'status',
        type: 'select',
        label: 'Status',
        options: [
          { label: 'Pending', value: 'pending' },
          { label: 'Confirmed', value: 'confirmed' },
          { label: 'Processing', value: 'processing' },
          { label: 'Shipped', value: 'shipped' },
          { label: 'Delivered', value: 'delivered' },
          { label: 'Cancelled', value: 'cancelled' },
          { label: 'Refunded', value: 'refunded' }
        ],
        defaultValue: 'pending'
      },
      {
        name: 'paymentStatus',
        type: 'select',
        label: 'Payment Status',
        options: [
          { label: 'Pending', value: 'pending' },
          { label: 'Paid', value: 'paid' },
          { label: 'Failed', value: 'failed' },
          { label: 'Refunded', value: 'refunded' }
        ],
        defaultValue: 'pending'
      },
      {
        name: 'items',
        type: 'array',
        label: 'Items',
        fields: [
          { name: 'product', type: 'text', label: 'Product' },
          { name: 'quantity', type: 'number', label: 'Quantity' },
          { name: 'unitPrice', type: 'number', label: 'Unit Price' },
          { name: 'total', type: 'number', label: 'Total' }
        ]
      },
      { name: 'subtotal', type: 'number', required: true, label: 'Subtotal' },
      { name: 'tax', type: 'number', label: 'Tax' },
      { name: 'shipping', type: 'number', label: 'Shipping' },
      { name: 'discount', type: 'number', label: 'Discount' },
      { name: 'total', type: 'number', required: true, label: 'Total' },
      { name: 'notes', type: 'textarea', label: 'Notes' }
    ],
    timestamps: true
  },

  coupons: {
    slug: 'coupons',
    label: 'Coupons',
    labelPlural: 'Coupons',
    singularLabel: 'Coupon',
    admin: {
      useAsTitle: 'code',
      defaultColumns: ['code', 'type', 'value', 'active', 'expiresAt'],
      description: 'Discount codes and promotions'
    },
    fields: [
      { name: 'code', type: 'text', required: true, label: 'Code' },
      {
        name: 'type',
        type: 'select',
        required: true,
        label: 'Type',
        options: [
          { label: 'Percentage', value: 'percentage' },
          { label: 'Fixed Amount', value: 'fixed' },
          { label: 'Free Shipping', value: 'freeShipping' }
        ]
      },
      { name: 'value', type: 'number', label: 'Value' },
      { name: 'minPurchase', type: 'number', label: 'Minimum Purchase' },
      { name: 'maxDiscount', type: 'number', label: 'Max Discount' },
      { name: 'usageLimit', type: 'number', label: 'Usage Limit' },
      { name: 'usedCount', type: 'number', defaultValue: 0, label: 'Used Count' },
      { name: 'startsAt', type: 'date', label: 'Starts At' },
      { name: 'expiresAt', type: 'date', label: 'Expires At' },
      { name: 'active', type: 'checkbox', defaultValue: true, label: 'Active' }
    ],
    timestamps: true
  }
};

export const ecommerceGlobals: Record<string, GlobalConfig> = {
  storeSettings: {
    slug: 'storeSettings',
    label: 'Store Settings',
    fields: [
      { name: 'storeName', type: 'text', defaultValue: 'My Store', label: 'Store Name' },
      { name: 'storeEmail', type: 'email', label: 'Contact Email' },
      { name: 'storePhone', type: 'text', label: 'Phone' },
      {
        name: 'address',
        type: 'group',
        label: 'Address',
        fields: [
          { name: 'line1', type: 'text', label: 'Address Line 1' },
          { name: 'city', type: 'text', label: 'City' },
          { name: 'state', type: 'text', label: 'State' },
          { name: 'postalCode', type: 'text', label: 'Postal Code' },
          { name: 'country', type: 'text', label: 'Country' }
        ]
      },
      { name: 'currency', type: 'text', defaultValue: 'USD', label: 'Currency' },
      { name: 'taxRate', type: 'number', defaultValue: 0, label: 'Tax Rate (%)' }
    ]
  }
};
