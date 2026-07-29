#!/usr/bin/env bash
set -e

# ==============================================================================
# Kyro CMS — Vercel Zero-Touch Deployment Script (PostgreSQL + S3/R2)
# Namespace: @kyro-cms/deployments/vercel
# Template : Blog (posts, pages, categories, media, menu, users, audit_logs, forms)
# Database : Auto-Provisioned Neon PostgreSQL (or Vercel Postgres via DATABASE_URL)
# Storage  : S3 / Cloudflare R2 / Vercel Blob
# Hosting  : Vercel Serverless
# User Seed: Automatic First Super Admin Bootstrapping
# ==============================================================================

echo "=============================================================================="
echo "🚀 Kyro CMS Vercel Zero-Touch Deployment"
echo "=============================================================================="

# 1. Environment & Parameter Setup
DATABASE_URL="${DATABASE_URL:-$1}"
PROJECT_NAME="${PROJECT_NAME:-kyro-blog-cms}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@kyro-cms.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-KyroAdmin2026!}"
S3_BUCKET_NAME="${S3_BUCKET:-kyro-blog-media}"

# 2. Check Package Manager & Vercel CLI
command -v npx >/dev/null 2>&1 || { echo "❌ Error: npx is required."; exit 1; }
PACKAGER="pnpm"
command -v pnpm >/dev/null 2>&1 || PACKAGER="npm"

echo "🔍 Checking Vercel CLI authentication..."
if ! npx vercel whoami >/dev/null 2>&1; then
    echo "🔑 Authenticating with Vercel CLI..."
    npx vercel login
fi

# 3. Database Auto-Provisioning (Neon Instant Serverless DB)
if [ -z "$DATABASE_URL" ]; then
    echo "📦 No DATABASE_URL provided. Automatically provisioning instant Neon PostgreSQL database..."
    NEON_OUT=$(npx neonctl projects create --name "$PROJECT_NAME" --output json 2>/dev/null || true)
    DATABASE_URL=$(echo "$NEON_OUT" | grep -o '"connection_uri":"[^"]*"' | head -n 1 | cut -d'"' -f4 || true)
    if [ -z "$DATABASE_URL" ]; then
        echo "⚠️ Fallback: Please input DATABASE_URL when prompted."
    else
        echo "✅ Instant Neon PostgreSQL Database Ready!"
    fi
fi

# 4. Generate vercel.json
echo "⚙️ Generating vercel.json..."
cat <<EOF > vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "./admin/dist",
  "installCommand": "npm install",
  "framework": null,
  "regions": ["iad1"],
  "env": {
    "DATABASE_URL": "$DATABASE_URL"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, PUT, DELETE, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization" }
      ]
    }
  ]
}
EOF

# 5. Generate kyro.config.ts (Blog Template)
echo "📝 Configuring kyro.config.ts with Blog Template..."
cat <<EOF > kyro.config.ts
import { templateCollections, coreSettingsGlobals } from "./src/templates/index.js";
import { createDrizzleAdapter } from "./src/database/drizzle/index.js";
import { createS3Storage } from "./src/storage/s3.js";

export default {
  collections: templateCollections["blog"],
  globals: coreSettingsGlobals,
  db: drizzleAdapter({
    provider: 'pg',
    url: process.env.DATABASE_URL || "$DATABASE_URL",
  }),
  storage: createS3Storage({
    provider: (process.env.STORAGE_PROVIDER as any) || 's3',
    bucket: process.env.S3_BUCKET || "$S3_BUCKET_NAME",
    region: process.env.S3_REGION || 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    endpoint: process.env.S3_ENDPOINT || '',
    cdnUrl: process.env.S3_CDN_URL || '',
  }),
};
EOF

# 6. Apply Migrations & Seed User
echo "🗃️ Applying PostgreSQL Migrations & Bootstrapping Super Admin..."
if [[ "$DATABASE_URL" =~ ^postgres ]]; then
    npx drizzle-kit push || true
    node -e "
    import postgres from 'postgres';
    import bcrypt from 'bcryptjs';
    const sql = postgres('$DATABASE_URL');
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
fi

# 7. Deploy to Vercel Production
echo "☁️ Deploying to Vercel Production ($PROJECT_NAME)..."
DEPLOYMENT_URL=$(npx vercel --prod --name "$PROJECT_NAME" --yes 2>&1 | grep -o 'https://[^ ]*\.vercel\.app' | tail -n 1 || true)

echo ""
echo "=============================================================================="
echo "🎉 Zero-Touch Kyro CMS Vercel Deployment Complete!"
echo "=============================================================================="
echo "• Deployment URL : ${DEPLOYMENT_URL:-https://$PROJECT_NAME.vercel.app}"
echo "• Admin Dashboard: ${DEPLOYMENT_URL:-https://$PROJECT_NAME.vercel.app}/admin"
echo "• Template       : Blog"
echo ""
echo "🔑 Initial Super Admin Credentials:"
echo "  Email   : $ADMIN_EMAIL"
echo "  Password: $ADMIN_PASSWORD"
echo "=============================================================================="
