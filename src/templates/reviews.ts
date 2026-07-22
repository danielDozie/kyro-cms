import type { CollectionConfig } from "../registry/types.js";

export const reviewsCollection: CollectionConfig = {
  slug: "reviews",
  label: "Reviews",
  labelPlural: "Reviews",
  singularLabel: "Review",
  admin: {
    group: "Commerce",
    disablePreview: true,
    useAsTitle: "rating",
    defaultColumns: ["product", "customer", "rating", "status"],
    description: "Product reviews and ratings",
    icon: "Star",
  },
  fields: [
    {
      name: "product",
      type: "relationship",
      relationTo: "products",
      required: true,
      label: "Product",
    },
    {
      name: "customer",
      type: "relationship",
      relationTo: "customers",
      required: true,
      label: "Customer",
    },
    {
      name: "rating",
      type: "number",
      required: true,
      min: 0,
      max: 5,
      label: "Rating (0-5)",
      admin: {
        placeholder: "5",
      },
    },
    {
      name: "comment",
      type: "richtext",
      label: "Review Comment",
    },
    {
      name: "status",
      type: "select",
      label: "Status",
      admin: { position: "sidebar" },
      defaultValue: "pending",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
      ],
    },
  ],
  timestamps: true,
};

export const reviewsCollections: Record<string, CollectionConfig> = {
  reviews: reviewsCollection,
};
export default reviewsCollections;
