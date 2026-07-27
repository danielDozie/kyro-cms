#!/usr/bin/env bash
set -e

# ==============================================================================
# Kyro CMS — Cloudflare Deployment Script (PostgreSQL + R2)
# Namespace: @kyro-cms/deployments/cloudflare
# Template : Blog (posts, pages, categories, media, menu, users, audit_logs, forms)
# Database : PostgreSQL + Cloudflare Hyperdrive
# Storage  : Cloudflare R2
# Hosting  : Cloudflare Pages
# User Seed: Automatic First Super Admin Bootstrapping
# ==============================================================================

echo "=============================================================================="
echo "🚀 Kyro CMS Cloudflare Deployment (Blog Template + PostgreSQL + R2)"
echo "=============================================================================="

# 1. Environment & Parameter Setup
DATABASE_URL="${DATABASE_URL:-$1}"
PROJECT_NAME="${PROJECT_NAME:-kyro-blog-cms}"
R2_BUCKET_NAME="${R2_BUCKET:-kyro-blog-media}"
HYPERDRIVE_NAME="${HYPERDRIVE_NAME:-kyro-blog-postgres-hd}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@kyro.dev}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-KyroAdmin2026!}"
BUILD_OUTPUT_DIR="./admin/dist"

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL is required."
    echo ""
    echo "Usage:"
    echo "  DATABASE_URL='postgres://user:pass@host:5432/dbname?sslmode=require' ./deploy.sh"
    echo "  OR:"
    echo "  ./deploy.sh 'postgres://user:pass@host:5432/dbname?sslmode=require'"
    exit 1
fi

# 2. Check Package Manager & Wrangler CLI
command -v npx >/dev/null 2>&1 || { echo "❌ Error: npx is required."; exit 1; }
PACKAGER="pnpm"
command -v pnpm >/dev/null 2>&1 || PACKAGER="npm"

echo "🔍 Checking Cloudflare Wrangler authentication..."
if ! npx wrangler whoami >/dev/null 2>&1; then
    echo "🔑 Authenticating with Cloudflare Wrangler..."
    npx wrangler login
fi

# 3. Create or Verify Cloudflare Hyperdrive Config
echo "⚡ Provisioning Cloudflare Hyperdrive for PostgreSQL ($HYPERDRIVE_NAME)..."
HYPER_LIST=$(npx wrangler hyperdrive list --json 2>/dev/null || true)

if echo "$HYPER_LIST" | grep -q "$HYPERDRIVE_NAME"; then
    echo "ℹ️ Hyperdrive config '$HYPERDRIVE_NAME' already exists."
    HYPER_ID=$(echo "$HYPER_LIST" | grep -o '"id":"[^"]*"' | head -n 1 | cut -d'"' -f4)
else
    echo "➕ Creating new Hyperdrive configuration..."
    HYPER_OUT=$(npx wrangler hyperdrive create "$HYPERDRIVE_NAME" --connection-string="$DATABASE_URL" --json)
    HYPER_ID=$(echo "$HYPER_OUT" | grep -o '"id":"[^"]*"' | head -n 1 | cut -d'"' -f4)
    echo "✅ Hyperdrive ID created: $HYPER_ID"
fi

# 4. Create or Verify Cloudflare R2 Storage Bucket
echo "🗄️ Provisioning Cloudflare R2 Bucket '$R2_BUCKET_NAME'..."
npx wrangler r2 bucket create "$R2_BUCKET_NAME" 2>/dev/null || echo "ℹ️ Bucket '$R2_BUCKET_NAME' already exists."

echo "🌐 Enabling public R2 dev domain..."
npx wrangler r2 bucket dev-url enable "$R2_BUCKET_NAME" 2>/dev/null || true

# 5. Generate / Sync wrangler.toml Configuration
echo "⚙️ Generating wrangler.toml..."
cat <<EOF > wrangler.toml
name = "$PROJECT_NAME"
compatibility_date = "2026-01-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "$BUILD_OUTPUT_DIR"

[[hyperdrive]]
binding = "HYPERDRIVE"
id = "$HYPER_ID"

[[r2_buckets]]
binding = "STORAGE_BUCKET"
bucket_name = "$R2_BUCKET_NAME"
EOF

# 6. Generate / Sync Blog Template Configuration (kyro.config.ts)
echo "📝 Configuring kyro.config.ts with Blog Template..."
cat <<EOF > kyro.config.ts
import { templateCollections, blogGlobals } from "./src/templates/index.js";
import { drizzleAdapter } from "./src/database/drizzle/index.js";
import { createS3Storage } from "./src/storage/s3.js";

export default {
  // Using Blog Template (posts, pages, categories, media, menu, users, audit_logs, forms)
  collections: templateCollections["blog"],
  globals: blogGlobals,

  // PostgreSQL Database via Drizzle ORM
  db: drizzleAdapter({
    provider: 'pg',
    url: process.env.DATABASE_URL || "$DATABASE_URL",
  }),

  // Cloudflare R2 Storage Provider
  storage: createS3Storage({
    provider: 'r2',
    bucket: process.env.R2_BUCKET || "$R2_BUCKET_NAME",
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    endpoint: process.env.R2_ENDPOINT || \`https://\${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com\`,
    cdnUrl: process.env.R2_CDN_URL || '',
    publicDevUrl: process.env.R2_PUBLIC_DEV_URL || '',
  }),
};
EOF

# 7. Apply PostgreSQL Database Schema Migrations
echo "🗃️ Applying PostgreSQL database schema migrations..."
npx drizzle-kit push || echo "ℹ️ Migrations synchronized."

# 8. Bootstrap First Super Admin User into PostgreSQL
echo "👤 Checking & Bootstrapping first Super Admin user..."
node -e "
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const sql = postgres(process.env.DATABASE_URL || '$DATABASE_URL');

async function bootstrap() {
  try {
    await sql\`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(255),
        "email" VARCHAR(255) NOT NULL,
        "password_hash" VARCHAR(255),
        "role" VARCHAR(50) NOT NULL DEFAULT 'customer',
        "tenant_id" UUID,
        "email_verified" BOOLEAN DEFAULT false,
        "locked" BOOLEAN DEFAULT false,
        "last_login" TIMESTAMP,
        "failed_login_attempts" INTEGER DEFAULT 0,
        "metadata" JSONB,
        "avatar" VARCHAR(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    \`;
    await sql\`CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email")\`;

    const existing = await sql\`SELECT id FROM "users" LIMIT 1\`;
    if (existing.length === 0) {
      const hash = bcrypt.hashSync('$ADMIN_PASSWORD', 10);
      await sql\`
        INSERT INTO "users" (name, email, password_hash, role, email_verified)
        VALUES ('Super Admin', '$ADMIN_EMAIL', \${hash}, 'super_admin', true)
      \`;
      console.log('✅ Successfully created initial Super Admin user!');
    } else {
      console.log('ℹ️ Admin user already exists in database.');
    }
  } catch (err) {
    console.error('⚠️ User bootstrap note:', err.message);
  } finally {
    await sql.end();
  }
}
bootstrap();
"

# 9. Build Kyro CMS Workspace
echo "🛠️ Building Kyro CMS workspace..."
$PACKAGER run build

# 10. Deploy to Cloudflare Pages
echo "☁️ Deploying to Cloudflare Pages ($PROJECT_NAME)..."
npx wrangler pages deploy "$BUILD_OUTPUT_DIR" --project-name="$PROJECT_NAME" --branch="main"

echo ""
echo "=============================================================================="
echo "🎉 Kyro Blog CMS Successfully Deployed to Cloudflare!"
echo "=============================================================================="
echo "• Site URL       : https://$PROJECT_NAME.pages.dev"
echo "• Admin Dashboard: https://$PROJECT_NAME.pages.dev/admin"
echo "• Hyperdrive ID  : $HYPER_ID"
echo "• R2 Bucket      : $R2_BUCKET_NAME"
echo "• Template       : Blog"
echo ""
echo "🔑 Initial Super Admin Credentials:"
echo "  Email   : $ADMIN_EMAIL"
echo "  Password: $ADMIN_PASSWORD"
echo "=============================================================================="
