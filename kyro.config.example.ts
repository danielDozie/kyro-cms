import { defineKyroConfig } from "./src/index.js";
import { templateCollections, coreGlobalSettings } from "./src/templates/index.js";
import { createLocalAdapter } from "./src/database/local/adapter.js";
import { createS3Storage } from "./src/storage/s3.js";

export default defineKyroConfig({
  // Public Blog Template (posts, pages, categories, media, menu, users, audit_logs, forms)
  collections: templateCollections["blog"],
  globals: coreGlobalSettings,

  // Database adapter — Local SQLite adapter (or Drizzle PostgreSQL for production)
  adapter: createLocalAdapter({
    path: process.env.DATABASE_URL || "./data/kyro.db",
  }),

  // Optional S3/Cloudflare R2 Storage provider
  storage: process.env.R2_BUCKET
    ? createS3Storage({
        provider: 'r2',
        region: 'auto',
        bucket: process.env.R2_BUCKET,
        accountId: process.env.R2_ACCOUNT_ID || '',
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
        endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      })
    : undefined,
});
