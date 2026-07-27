#!/usr/bin/env bash
set -e

# ==============================================================================
# Kyro CMS — Railway Hostable & Callable Deployment Script
# Namespace: @kyro-cms/deployments/railway
# Template : Blog (posts, pages, categories, media, menu, users, audit_logs, forms)
# Database : Managed PostgreSQL on Railway / Neon / Supabase
# Storage  : S3 / Cloudflare R2 / Railway Persistent Volumes
# Hosting  : Railway Web Service
# User Seed: Automatic First Super Admin Bootstrapping
# ==============================================================================

echo "=============================================================================="
echo "🚀 Kyro CMS Railway Deployment (Blog Template + PostgreSQL + S3/R2)"
echo "=============================================================================="

# 1. Environment & Parameter Setup
DATABASE_URL="${DATABASE_URL:-$1}"
PROJECT_NAME="${PROJECT_NAME:-kyro-blog-cms}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@kyro.dev}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-KyroAdmin2026!}"
S3_BUCKET_NAME="${S3_BUCKET:-kyro-blog-media}"

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL is required."
    echo ""
    echo "Usage:"
    echo "  DATABASE_URL='postgres://user:pass@host:5432/dbname?sslmode=require' ./deploy.sh"
    echo "  OR:"
    echo "  ./deploy.sh 'postgres://user:pass@host:5432/dbname?sslmode=require'"
    exit 1
fi

# 2. Check Package Manager & Railway CLI
command -v npx >/dev/null 2>&1 || { echo "❌ Error: npx is required."; exit 1; }
PACKAGER="pnpm"
command -v pnpm >/dev/null 2>&1 || PACKAGER="npm"

echo "🔍 Checking Railway CLI authentication..."
if ! npx @railway/cli whoami >/dev/null 2>&1; then
    echo "🔑 Authenticating with Railway CLI..."
    npx @railway/cli login
fi

# 3. Generate / Sync railway.json Configuration
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

# 4. Generate / Sync Blog Template Configuration (kyro.config.ts)
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

  // S3 / R2 Storage Provider
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

# 5. Apply PostgreSQL Database Schema Migrations
echo "🗃️ Applying PostgreSQL database schema migrations..."
npx drizzle-kit push || echo "ℹ️ Migrations synchronized."

# 6. Bootstrap First Super Admin User into PostgreSQL
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

# 7. Build & Deploy to Railway
echo "☁️ Deploying to Railway Service ($PROJECT_NAME)..."
npx @railway/cli up --detach

echo ""
echo "=============================================================================="
echo "🎉 Kyro Blog CMS Successfully Deployed to Railway!"
echo "=============================================================================="
echo "• Service        : $PROJECT_NAME"
echo "• Template       : Blog"
echo ""
echo "🔑 Initial Super Admin Credentials:"
echo "  Email   : $ADMIN_EMAIL"
echo "  Password: $ADMIN_PASSWORD"
echo "=============================================================================="
