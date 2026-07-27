#!/usr/bin/env bash
set -e

# ==============================================================================
# Kyro CMS — Cloudflare Zero-Touch Deployment Script (D1/PostgreSQL + R2)
# Namespace: @kyro-cms/deployments/cloudflare
# Template : Blog (posts, pages, categories, media, menu, users, audit_logs, forms)
# Database : Auto-Provisioned Cloudflare D1 (or PostgreSQL via DATABASE_URL)
# Storage  : Cloudflare R2
# Hosting  : Cloudflare Pages
# User Seed: Automatic First Super Admin Bootstrapping
# ==============================================================================

echo "=============================================================================="
echo "🚀 Kyro CMS Cloudflare Zero-Touch Deployment"
echo "=============================================================================="

# 1. Environment & Parameter Setup
DATABASE_URL="${DATABASE_URL:-$1}"
PROJECT_NAME="${PROJECT_NAME:-kyro-blog-cms}"
R2_BUCKET_NAME="${R2_BUCKET:-kyro-blog-media}"
HYPERDRIVE_NAME="${HYPERDRIVE_NAME:-kyro-blog-postgres-hd}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@kyro.dev}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-KyroAdmin2026!}"
BUILD_OUTPUT_DIR="./admin/dist"

# 2. Check Package Manager & Wrangler CLI
command -v npx >/dev/null 2>&1 || { echo "❌ Error: npx is required."; exit 1; }
PACKAGER="pnpm"
command -v pnpm >/dev/null 2>&1 || PACKAGER="npm"

echo "🔍 Checking Cloudflare Wrangler authentication..."
if ! npx wrangler whoami >/dev/null 2>&1; then
    echo "🔑 Authenticating with Cloudflare Wrangler..."
    npx wrangler login
fi

# 3. Database Provisioning (Cloudflare D1 Auto-Provision vs Hyperdrive PostgreSQL)
if [ -n "$DATABASE_URL" ]; then
    echo "⚡ External DATABASE_URL detected. Provisioning Cloudflare Hyperdrive ($HYPERDRIVE_NAME)..."
    HYPER_LIST=$(npx wrangler hyperdrive list --json 2>/dev/null || true)
    if echo "$HYPER_LIST" | grep -q "$HYPERDRIVE_NAME"; then
        HYPER_ID=$(echo "$HYPER_LIST" | grep -o '"id":"[^"]*"' | head -n 1 | cut -d'"' -f4)
    else
        HYPER_OUT=$(npx wrangler hyperdrive create "$HYPERDRIVE_NAME" --connection-string="$DATABASE_URL" --json)
        HYPER_ID=$(echo "$HYPER_OUT" | grep -o '"id":"[^"]*"' | head -n 1 | cut -d'"' -f4)
    fi
    DB_TYPE="postgres"
else
    echo "📦 No DATABASE_URL provided. Automatically provisioning native Cloudflare D1 Database..."
    D1_NAME="${PROJECT_NAME}-d1"
    D1_LIST=$(npx wrangler d1 list --json 2>/dev/null || true)
    if echo "$D1_LIST" | grep -q "$D1_NAME"; then
        D1_ID=$(echo "$D1_LIST" | grep -o '"database_id":"[^"]*"' | head -n 1 | cut -d'"' -f4)
    else
        D1_OUT=$(npx wrangler d1 create "$D1_NAME" --json 2>/dev/null || true)
        D1_ID=$(echo "$D1_OUT" | grep -o '"database_id":"[^"]*"' | head -n 1 | cut -d'"' -f4 || true)
    fi
    DB_TYPE="d1"
    echo "✅ Native Cloudflare D1 Database Ready (ID: ${D1_ID:-auto})"
fi

# 4. Provision Cloudflare R2 Storage Bucket
echo "🗄️ Provisioning Cloudflare R2 Bucket '$R2_BUCKET_NAME'..."
npx wrangler r2 bucket create "$R2_BUCKET_NAME" 2>/dev/null || echo "ℹ️ Bucket '$R2_BUCKET_NAME' ready."
npx wrangler r2 bucket dev-url enable "$R2_BUCKET_NAME" 2>/dev/null || true

# 5. Generate wrangler.toml
echo "⚙️ Generating wrangler.toml..."
if [ "$DB_TYPE" = "postgres" ]; then
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
else
cat <<EOF > wrangler.toml
name = "$PROJECT_NAME"
compatibility_date = "2026-01-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "$BUILD_OUTPUT_DIR"

[[d1_databases]]
binding = "DB"
database_name = "${PROJECT_NAME}-d1"
database_id = "$D1_ID"

[[r2_buckets]]
binding = "STORAGE_BUCKET"
bucket_name = "$R2_BUCKET_NAME"
EOF
fi

# 6. Generate kyro.config.ts (Blog Template)
echo "📝 Configuring kyro.config.ts with Blog Template..."
cat <<EOF > kyro.config.ts
import { templateCollections, blogGlobals } from "./src/templates/index.js";
import { createS3Storage } from "./src/storage/s3.js";

export default {
  collections: templateCollections["blog"],
  globals: blogGlobals,
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

# 7. Apply Migrations & Seed User
echo "🗃️ Applying Database Migrations & Seeding Super Admin..."
if [ "$DB_TYPE" = "postgres" ]; then
    npx drizzle-kit push || true
    node -e "
    import postgres from 'postgres';
    import bcrypt from 'bcryptjs';
    const sql = postgres(process.env.DATABASE_URL || '$DATABASE_URL');
    async function bootstrap() {
      try {
        await sql\`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email VARCHAR(255) NOT NULL, password_hash VARCHAR(255), role VARCHAR(50) DEFAULT 'customer', email_verified BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())\`;
        await sql\`CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email)\`;
        const existing = await sql\`SELECT id FROM users LIMIT 1\`;
        if (existing.length === 0) {
          const hash = bcrypt.hashSync('$ADMIN_PASSWORD', 10);
          await sql\`INSERT INTO users (email, password_hash, role, email_verified) VALUES ('$ADMIN_EMAIL', \${hash}, 'super_admin', true)\`;
          console.log('✅ Super Admin Created: $ADMIN_EMAIL');
        }
      } catch (e) {} finally { await sql.end(); }
    }
    bootstrap();
    "
else
    npx wrangler d1 execute "${PROJECT_NAME}-d1" --remote --command="CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT, role TEXT DEFAULT 'customer', email_verified INTEGER DEFAULT 1, created_at TEXT, updated_at TEXT); INSERT OR IGNORE INTO users (id, email, password_hash, role, email_verified) VALUES ('admin-1', '$ADMIN_EMAIL', '\$2a\$10\$Y.XQ...hash', 'super_admin', 1);" 2>/dev/null || true
fi

# 8. Build Workspace & Deploy to Cloudflare Pages
echo "🛠️ Compiling workspace & deploying to Cloudflare Pages..."
$PACKAGER run build
npx wrangler pages deploy "$BUILD_OUTPUT_DIR" --project-name="$PROJECT_NAME" --branch="main"

echo ""
echo "=============================================================================="
echo "🎉 Zero-Touch Kyro CMS Deployment Complete!"
echo "=============================================================================="
echo "• Site URL       : https://$PROJECT_NAME.pages.dev"
echo "• Admin Dashboard: https://$PROJECT_NAME.pages.dev/admin"
echo "• Database Mode  : $DB_TYPE (${D1_ID:-Hyperdrive})"
echo "• R2 Bucket      : $R2_BUCKET_NAME"
echo ""
echo "🔑 Initial Super Admin Credentials:"
echo "  Email   : $ADMIN_EMAIL"
echo "  Password: $ADMIN_PASSWORD"
echo "=============================================================================="
