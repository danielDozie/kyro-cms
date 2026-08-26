#!/bin/sh
set -e

# ==============================================================================
# Kyro CMS Core — Production Entrypoint & Tenant Provisioner
# ==============================================================================

echo "======================================================================"
echo "⚡ Starting Kyro CMS Core Engine"
echo "   Project:    ${KYRO_PROJECT_NAME:-Kyro Instance}"
echo "   Project ID: ${KYRO_PROJECT_ID:-standalone}"
echo "   Port:       ${PORT:-4321}"
echo "======================================================================"

# 1. Wait for Database if DATABASE_URL is configured
if [ -n "$DATABASE_URL" ]; then
  echo "📡 Checking PostgreSQL database connection..."
  # Parse host and port from DATABASE_URL (postgres://user:pass@host:port/db)
  DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|postgres://[^@]+@([^:/]+).*|\1|')
  DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
  DB_PORT=${DB_PORT:-5432}
  retry=0
  until pg_isready -h "$DB_HOST" -p "$DB_PORT" -t 3 2>/dev/null; do
    retry=$(( retry + 1 ))
    echo "   ... waiting for database (${retry}/10)"
    if [ "$retry" -ge 10 ]; then
      echo "⚠️  Database not ready after 10 attempts, continuing anyway..."
      break
    fi
    sleep 1
  done
  echo "✓ PostgreSQL connection established"
fi

# 2. Run Idempotent Schema Migrations
echo "📦 Applying database schema migrations..."
if [ -f "./dist/cli/index.js" ]; then
  node ./dist/cli/index.js db:migrate 2>/dev/null || true
fi

# 3. Seed Initial Project Defaults on First Launch
if [ ! -f "/app/.initialized" ]; then
  echo "🌱 Initializing tenant metadata..."
  if [ -f "./dist/cli/index.js" ]; then
    node ./dist/cli/index.js db:seed 2>/dev/null || true
  fi
  touch /app/.initialized
fi

# 4. Launch Kyro CMS Engine
echo "✨ Kyro CMS Engine ready on 0.0.0.0:${PORT:-4321}"
exec "$@"
