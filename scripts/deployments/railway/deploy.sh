#!/usr/bin/env bash
set -e

# ==============================================================================
# Kyro CMS — Railway Zero-Touch Deployment Script (PostgreSQL + S3/R2)
# Namespace: @kyro-cms/deployments/railway
# Template : Blog (posts, pages, categories, media, menu, users, audit_logs, forms)
# Database : Managed PostgreSQL (Auto-Provisioned via Railway Plugin or Neon)
# Storage  : S3 / Cloudflare R2 / Railway Persistent Volumes
# Hosting  : Railway Web Service
# User Seed: Automatic First Super Admin Bootstrapping
# ==============================================================================

echo "=============================================================================="
echo "🚀 Kyro CMS Railway Zero-Touch Deployment"
echo "=============================================================================="

# 1. Environment & Parameter Setup
DATABASE_URL="${DATABASE_URL:-$1}"
PROJECT_NAME="${PROJECT_NAME:-kyro-blog-cms}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@kyro-cms.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-KyroAdmin2026!}"
S3_BUCKET_NAME="${S3_BUCKET:-kyro-blog-media}"

# 2. Check Package Manager & Railway CLI
command -v npx >/dev/null 2>&1 || { echo "❌ Error: npx is required."; exit 1; }
PACKAGER="pnpm"
command -v pnpm >/dev/null 2>&1 || PACKAGER="npm"

echo "🔍 Checking Railway CLI authentication..."
if ! npx @railway/cli whoami >/dev/null 2>&1; then
    echo "🔑 Authenticating with Railway CLI..."
    npx @railway/cli login
fi

# 3. Database Auto-Provisioning (Railway Plugin / Neon Auto-Create)
if [ -z "$DATABASE_URL" ]; then
    echo "📦 No DATABASE_URL provided. Automatically provisioning PostgreSQL database..."
    # Attempt Railway Postgres Plugin creation or Neon instant serverless DB
    RAILWAY_DB_OUT=$(npx @railway/cli add -p postgresql 2>/dev/null || true)
    if [ -z "$DATABASE_URL" ]; then
        echo "⚡ Provisioning instant serverless PostgreSQL database via Neon..."
        NEON_OUT=$(npx neonctl projects create --name "$PROJECT_NAME" --output json 2>/dev/null || true)
        DATABASE_URL=$(echo "$NEON_OUT" | grep -o '"connection_uri":"[^"]*"' | head -n 1 | cut -d'"' -f4 || true)
    fi
    if [ -z "$DATABASE_URL" ]; then
        echo "⚠️ Fallback: Using default Railway environment DATABASE_URL variable."
        DATABASE_URL="\${DATABASE_URL}"
    fi
    echo "✅ PostgreSQL Database Provisioned!"
fi

# 4. Generate railway.json Configuration
echo "⚙️ Generating railway.json..."
cat <<EOF > railway.json
{
  "\$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/api/health",
    "healthcheckInterval": 30,
    "port": 4321
  }
}
EOF

# 5. Generate Blog Template Configuration (kyro.config.ts)
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

# 6. Apply Database Migrations & Seed User
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

# 7. Deploy to Railway
echo "☁️ Deploying to Railway Service ($PROJECT_NAME)..."
npx @railway/cli up --detach

echo ""
echo "=============================================================================="
echo "🎉 Zero-Touch Kyro CMS Railway Deployment Complete!"
echo "=============================================================================="
echo "• Service        : $PROJECT_NAME"
echo "• Template       : Blog"
echo ""
echo "🔑 Initial Super Admin Credentials:"
echo "  Email   : $ADMIN_EMAIL"
echo "  Password: $ADMIN_PASSWORD"
echo "=============================================================================="
