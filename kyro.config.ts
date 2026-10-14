import { defineKyroConfig } from "./src/index.js";
import {
  templateCollections,
  allGlobalSettings,
} from "./src/templates/index.js";
import { createLocalAdapter } from "./src/database/local/index.js";
import { getAppSecret } from "./src/lib/secret.js";

export default defineKyroConfig({
  organizations: [
    {
      id: "org_acme_corp",
      name: "Acme Media Global",
      slug: "acme-media",
      projects: [
        {
          id: "proj_corporate_site",
          name: "Corporate Marketing Site",
          slug: "corporate-site",
          environment: "production",
          collections: ["pages", "posts", "categories", "forms"],
        },
        {
          id: "proj_global_store",
          name: "Global E-Commerce Store",
          slug: "global-store",
          environment: "staging",
          collections: ["products", "orders", "customers", "coupons", "menu"],
        },
        {
          id: "proj_developer_docs",
          name: "Developer Documentation",
          slug: "developer-docs",
          environment: "development",
          collections: ["pages", "posts", "categories", "form-entries"],
        },
      ],
    },
  ],
  collections: templateCollections["kitchen-sink"],
  globals: allGlobalSettings,
  adapter: createLocalAdapter({
    path: process.env.DATABASE_URL || "./data/kyro.db",
  }),
  auth: {
    secret: getAppSecret(),
  },
  admin: {
    meta: {
      title: "Kyro CMS Admin",
      description: "Manage your content with ease",
    },
  },
});
