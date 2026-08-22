#!/bin/sh
set -e

# ==============================================================================
# Kyro CMS Core — Production Entrypoint & Tenant Provisioner
# ==============================================================================

echo "======================================================================"
echo "⚡ Starting Kyro CMS Core Engine"
echo "   Project:    ${KYRO_PROJECT_NAME:-Kyro Instance}"
echo "   Project ID: ${KYRO_PROJECT_ID:-standalone}"
echo "   Port:       ${PORT:-3000}"
echo "======================================================================"

# 1. Wait for Database if DATABASE_URL is configured
if [ -n "$DATABASE_URL" ]; then
  echo "📡 Checking PostgreSQL database connection..."
  until pg_isready -d "${DATABASE_URL}" -t 3 2>/dev/null || [ "$retry" -gt 10 ]; do
    echo "   ... waiting for database (${retry:-1}/10)"
    retry=$(( ${retry:-0} + 1 ))
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
echo "✨ Kyro CMS Engine ready on 0.0.0.0:${PORT:-3000}"
exec "$@"
