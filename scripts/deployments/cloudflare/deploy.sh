#!/usr/bin/env bash
set -e

# ==============================================================================
# Kyro CMS — Cloudflare Deployment Script (Workers with Assets)
# Hosting : Cloudflare Workers with Assets (Full SSR & Static UI)
# Database: Auto-Provisioned Cloudflare D1 OR PostgreSQL (via Cloudflare Hyperdrive)
# Storage : Cloudflare R2 Storage Bucket
# Admin   : Automatic Super Admin Provisioning & Schema Migration
# ==============================================================================

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${CYAN}==============================================================================${NC}"
echo -e "${BOLD}🚀 Kyro CMS Cloudflare Deployment (Workers)${NC}"
echo -e "${CYAN}==============================================================================${NC}"

# 1. Path Resolution
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$ROOT_DIR"

# Defaults
DB_MODE=""           # 'd1' or 'postgres'
NON_INTERACTIVE=false

RANDOM_SUFFIX="$(openssl rand -hex 3 2>/dev/null || echo "$RANDOM")"
RANDOM_PASS="$(openssl rand -base64 12 2>/dev/null | tr -dc 'a-zA-Z0-9' | head -c 16 || echo "KyroPass$(date +%s)")"

PROJECT_NAME=""
R2_BUCKET_NAME=""
HYPERDRIVE_NAME=""
DATABASE_URL=""
ADMIN_EMAIL=""
ADMIN_PASSWORD=""

# 2. Parse Command Line Arguments
show_help() {
    echo "Usage: ./deploy.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -d, --database <d1|postgres>     Set database type (default: d1)"
    echo "  -u, --database-url <URL>         PostgreSQL connection string (forces postgres mode)"
    echo "  -n, --name <PROJECT_NAME>        Cloudflare project name"
    echo "  -r2, --r2-bucket <BUCKET_NAME>   R2 storage bucket name"
    echo "  -e, --email <ADMIN_EMAIL>        Initial Super Admin email (default: admin@kyro-cms.com)"
    echo "  -p, --password <ADMIN_PASS>      Initial Super Admin password"
    echo "  -y, --non-interactive            Skip interactive prompts and use defaults"
    echo "  -h, --help                       Show this help message"
    echo ""
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -d|--database)
            DB_MODE="$2"
            shift 2
            ;;
        -u|--database-url)
            DATABASE_URL="$2"
            DB_MODE="postgres"
            shift 2
            ;;
        -n|--name|--project-name)
            PROJECT_NAME="$2"
            shift 2
            ;;
        -r2|--r2-bucket)
            R2_BUCKET_NAME="$2"
            shift 2
            ;;
        -e|--email|--admin-email)
            ADMIN_EMAIL="$2"
            shift 2
            ;;
        -p|--password|--admin-password)
            ADMIN_PASSWORD="$2"
            shift 2
            ;;
        -y|--non-interactive)
            NON_INTERACTIVE=true
            shift
            ;;
        -h|--help)
            show_help
            ;;
        *)
            if [ -z "$DATABASE_URL" ] && [[ "$1" =~ ^postgres(ql)?:// ]]; then
                DATABASE_URL="$1"
                DB_MODE="postgres"
            fi
            shift
            ;;
    esac
done

# ─────────────────────────────────────────────────────────────────────────────
# Pure-bash UI helpers (zero external dependencies)
# ─────────────────────────────────────────────────────────────────────────────

DIM='\033[2m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'

# kyro_pick <prompt> <item1> [item2 ...]
# Renders a styled numbered menu, returns chosen value in KYRO_PICK_RESULT.
# Last item can be "__custom__:<label>" which triggers a free-text read.
kyro_pick() {
    local prompt="$1"; shift
    local items=("$@")
    local count=${#items[@]}
    local custom_label=""

    echo -e "\n${BOLD}${prompt}${NC}"
    echo -e "--------------------------------------------------"
    local i
    for i in "${!items[@]}"; do
        local item="${items[$i]}"
        local display="$item"
        if [[ "$item" == __custom__:* ]]; then
            display="${item#__custom__:}"
            custom_label="$display"
        fi
        local num=$((i + 1))
        if [ "$i" -eq 0 ]; then
            echo -e " ${GREEN}${BOLD}${num})${NC} ${display} ${DIM}← default${NC}"
        else
            echo -e " ${DIM}${num})${NC} ${display}"
        fi
    done
    echo -e "--------------------------------------------------"

    local choice
    while true; do
        read -rp "> Enter number [1]: " choice
        choice="${choice:-1}"
        if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "$count" ]; then
            local selected="${items[$((choice - 1))]}"
            if [[ "$selected" == __custom__:* ]]; then
                read -rp "> ${custom_label}: " KYRO_PICK_RESULT
            else
                KYRO_PICK_RESULT="$selected"
            fi
            return 0
        fi
        echo -e "${RED}✗ Invalid choice — enter a number between 1 and ${count}.${NC}"
    done
}

# kyro_input <prompt> [default]
# Styled single-line input with an optional default.
kyro_input() {
    local prompt="$1"
    local default="${2:-}"
    local hint=""
    [ -n "$default" ] && hint=" [${default}]"
    
    echo -e "\n${BOLD}${prompt}${NC}"
    echo -e "--------------------------------------------------"
    read -rp "> Enter value${hint}: " KYRO_INPUT_RESULT
    KYRO_INPUT_RESULT="${KYRO_INPUT_RESULT:-$default}"
}

# ─────────────────────────────────────────────────────────────────────────────
# 3. Interactive Prompts (if TTY & not non-interactive)
# ─────────────────────────────────────────────────────────────────────────────
if [ "$NON_INTERACTIVE" = false ] && [ -t 0 ]; then
    echo -e ""
    echo -e "  ${YELLOW}${BOLD}📋 Setup Configuration${NC}"
    echo -e "  ${DIM}Use the numbered menus below to configure your deployment.${NC}"

    # ── Database ──────────────────────────────────────────────────────────────
    if [ -z "$DB_MODE" ]; then
        kyro_pick "Select Database Infrastructure" \
            "Native Cloudflare D1  ${DIM}— serverless SQLite, auto-provisioned${NC}" \
            "PostgreSQL  ${DIM}— via Cloudflare Hyperdrive${NC}"
        case "$KYRO_PICK_RESULT" in
            PostgreSQL*) DB_MODE="postgres" ;;
            *)           DB_MODE="d1" ;;
        esac
    fi

    if [ "$DB_MODE" = "postgres" ] && [ -z "$DATABASE_URL" ]; then
        kyro_input "PostgreSQL Connection URL" "postgresql://user:pass@host/db"
        DATABASE_URL="$KYRO_INPUT_RESULT"
    fi

    # ── Project Name ──────────────────────────────────────────────────────────
    if [ -z "$PROJECT_NAME" ]; then
        kyro_pick "Cloudflare Project Name" \
            "kyro-app-${RANDOM_SUFFIX}" \
            "kyro-demo-${RANDOM_SUFFIX}" \
            "kyro-${RANDOM_SUFFIX}" \
            "__custom__:Enter a custom project name"
        PROJECT_NAME="$KYRO_PICK_RESULT"
        PROJECT_NAME="${PROJECT_NAME:-kyro-app-${RANDOM_SUFFIX}}"
    fi

    # ── R2 Bucket ─────────────────────────────────────────────────────────────
    if [ -z "$R2_BUCKET_NAME" ]; then
        kyro_pick "Cloudflare R2 Bucket Name" \
            "kyro-media-${RANDOM_SUFFIX}" \
            "kyro-assets-${RANDOM_SUFFIX}" \
            "__custom__:Enter a custom bucket name"
        R2_BUCKET_NAME="$KYRO_PICK_RESULT"
        R2_BUCKET_NAME="${R2_BUCKET_NAME:-kyro-media-${RANDOM_SUFFIX}}"
    fi

    # ── Admin Email ───────────────────────────────────────────────────────────
    if [ -z "$ADMIN_EMAIL" ]; then
        kyro_pick "Initial Super Admin Email" \
            "admin@kyro-cms.com" \
            "admin@example.com" \
            "__custom__:Enter a custom email"
        ADMIN_EMAIL="$KYRO_PICK_RESULT"
        ADMIN_EMAIL="${ADMIN_EMAIL:-admin@kyro-cms.com}"
    fi

    # ── Admin Password ────────────────────────────────────────────────────────
    if [ -z "$ADMIN_PASSWORD" ]; then
        kyro_pick "Initial Super Admin Password" \
            "Auto-generate a secure password  ${DIM}← recommended${NC}" \
            "__custom__:Enter a custom password"
        case "$KYRO_PICK_RESULT" in
            Auto-generate*) ADMIN_PASSWORD="${RANDOM_PASS}" ;;
            *)              ADMIN_PASSWORD="$KYRO_PICK_RESULT" ;;
        esac
        ADMIN_PASSWORD="${ADMIN_PASSWORD:-${RANDOM_PASS}}"
    fi

    # ── Hyperdrive Name (PostgreSQL only) ─────────────────────────────────────
    if [ "$DB_MODE" = "postgres" ] && [ -z "$HYPERDRIVE_NAME" ]; then
        kyro_pick "Cloudflare Hyperdrive Name" \
            "kyro-postgres-hd-${RANDOM_SUFFIX}" \
            "hyperdrive-${RANDOM_SUFFIX}" \
            "__custom__:Enter a custom Hyperdrive name"
        HYPERDRIVE_NAME="$KYRO_PICK_RESULT"
        HYPERDRIVE_NAME="${HYPERDRIVE_NAME:-kyro-postgres-hd-${RANDOM_SUFFIX}}"
    fi
fi

# Fallback defaults
PROJECT_NAME="${PROJECT_NAME:-kyro-app-${RANDOM_SUFFIX}}"
R2_BUCKET_NAME="${R2_BUCKET_NAME:-kyro-media-${RANDOM_SUFFIX}}"
HYPERDRIVE_NAME="${HYPERDRIVE_NAME:-kyro-postgres-hd-${RANDOM_SUFFIX}}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@kyro-cms.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-${RANDOM_PASS}}"
DB_MODE="${DB_MODE:-d1}"

echo -e "\n${CYAN}⚙️ Configuration Summary:${NC}"
echo -e "  • Target Hosting: ${BOLD}Cloudflare Workers with Assets${NC}"
echo -e "  • Database Mode : ${BOLD}${DB_MODE}${NC}"
echo -e "  • Project Name  : ${BOLD}${PROJECT_NAME}${NC}"
echo -e "  • R2 Bucket Name: ${BOLD}${R2_BUCKET_NAME}${NC}"
echo -e "  • Admin Email   : ${BOLD}${ADMIN_EMAIL}${NC}"

# 4. Check Package Manager & Wrangler CLI
PACKAGER="pnpm"
command -v pnpm >/dev/null 2>&1 || PACKAGER="npm"
export WRANGLER="$PACKAGER dlx wrangler"

echo -e "\n🔍 Checking Cloudflare Wrangler authentication..."
if ! $WRANGLER whoami >/dev/null 2>&1; then
    echo -e "${RED}❌ Cloudflare Wrangler authentication required.${NC}"
    echo -e "   Please run ${BOLD}'$WRANGLER login'${NC} in your terminal or set ${BOLD}CLOUDFLARE_API_TOKEN${NC}."
    exit 1
fi
echo -e "${GREEN}✅ Cloudflare Wrangler Authenticated.${NC}"

# 5. Database Provisioning
if [ "$DB_MODE" = "postgres" ]; then
    if [ -z "$DATABASE_URL" ]; then
        echo -e "${RED}❌ Database mode set to postgres, but no DATABASE_URL provided.${NC}"
        exit 1
    fi
    echo -e "\n⚡ Provisioning Cloudflare Hyperdrive connection (${HYPERDRIVE_NAME})..."
    HYPER_LIST=$($WRANGLER hyperdrive list --json 2>/dev/null || true)
    HYPER_ID=$(node -e "try { const raw = process.argv[1] || ''; const idx = Math.min(...[raw.indexOf('{'), raw.indexOf('[')].filter(i => i !== -1)); if (idx >= 0) { const data = JSON.parse(raw.slice(idx)); const item = Array.isArray(data) ? data.find(h => h.name === '$HYPERDRIVE_NAME') : data; console.log(item ? (item.id || item.uuid || '') : ''); } } catch(e){}" "$HYPER_LIST")
    if [ -z "$HYPER_ID" ]; then
        HYPER_OUT=$($WRANGLER hyperdrive create "$HYPERDRIVE_NAME" --connection-string="$DATABASE_URL" --json 2>/dev/null || true)
        HYPER_ID=$(node -e "try { const raw = process.argv[1] || ''; const idx = Math.min(...[raw.indexOf('{'), raw.indexOf('[')].filter(i => i !== -1)); if (idx >= 0) { const data = JSON.parse(raw.slice(idx)); console.log(data.id || data.uuid || ''); } } catch(e){}" "$HYPER_OUT")
    fi
    echo -e "${GREEN}✅ Hyperdrive Provisioned (ID: ${HYPER_ID:-auto})${NC}"
else
    # Provision Cloudflare D1 Database (using helper for selection/creation)
    if [ "$DB_MODE" = "d1" ]; then
      # Use the helper script to pick an existing DB or create a new one
      if [ "$NON_INTERACTIVE" = true ]; then
        # Non-interactive mode – fall back to default naming
        D1_NAME="${PROJECT_NAME}-d1"
        D1_OUT=$($WRANGLER d1 create "$D1_NAME" 2>/dev/null || true)
        D1_ID=$(node -e "const txt = process.argv[1] || ''; const m = txt.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i); console.log(m ? m[1] : '');" "$D1_OUT")
      else
        echo -e "\n🗂️ Selecting or creating D1 database…"
        SELECTED_DB=$(bash "${SCRIPT_DIR}/select-or-create-d1.sh")
        D1_NAME="$SELECTED_DB"
        # Fetch the ID of the selected (or newly created) DB
        D1_ID=$($WRANGLER d1 list --json | jq -r ".[] | select(.name==\"$D1_NAME\") | .id" | head -n1)
        echo -e "${GREEN}✅ Using D1 database: $D1_NAME (ID: $D1_ID)${NC}"
      fi
    fi
fi

# 6. Provision Cloudflare R2 Storage Bucket
echo -e "\n🗄️ Provisioning Cloudflare R2 Bucket '${R2_BUCKET_NAME}'..."
$WRANGLER r2 bucket create "$R2_BUCKET_NAME" 2>/dev/null || echo -e "ℹ️ Bucket '${R2_BUCKET_NAME}' ready."
echo "y" | $WRANGLER r2 bucket dev-url enable "$R2_BUCKET_NAME" 2>/dev/null || true

# 7. Generate wrangler.toml Configuration
echo -e "\n⚙️ Generating root wrangler.toml..."
if [ "$DB_MODE" = "postgres" ]; then
cat <<EOF > wrangler.toml
name = "$PROJECT_NAME"
compatibility_date = "2026-01-01"
compatibility_flags = ["nodejs_compat"]

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

[[d1_databases]]
binding = "DB"
database_name = "${PROJECT_NAME}-d1"
database_id = "$D1_ID"

[[r2_buckets]]
binding = "STORAGE_BUCKET"
bucket_name = "$R2_BUCKET_NAME"
EOF
fi

# 8. Schema Migration & Super Admin Seeding
echo -e "\n🗃️ Running Schema Migrations & Seeding Initial Super Admin..."
ADMIN_HASH=$(node -e "import bcrypt from 'bcryptjs'; console.log(bcrypt.hashSync('$ADMIN_PASSWORD', 10));" 2>/dev/null || echo "")

if [ "$DB_MODE" = "postgres" ]; then
    DATABASE_URL="$DATABASE_URL" npx drizzle-kit push --force 2>/dev/null || true
    node -e "
    import postgres from 'postgres';
    import bcrypt from 'bcryptjs';
    const sql = postgres(process.env.DATABASE_URL || '$DATABASE_URL');
    async function bootstrap() {
      try {
        await sql\`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email VARCHAR(255) NOT NULL, password_hash VARCHAR(255), role VARCHAR(50) DEFAULT 'customer', email_verified BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())\`;
        await sql\`CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email)\`;
        const existing = await sql\`SELECT id FROM users WHERE email = '$ADMIN_EMAIL'\`;
        if (existing.length === 0) {
          const hash = bcrypt.hashSync('$ADMIN_PASSWORD', 10);
          await sql\`INSERT INTO users (email, password_hash, role, email_verified) VALUES ('$ADMIN_EMAIL', \${hash}, 'super_admin', true)\`;
          console.log('  ✅ PostgreSQL Super Admin Account Configured');
        }
      } catch (e) {
        console.warn('  ⚠️ Bootstrapping note:', e.message);
      } finally { await sql.end(); }
    }
    bootstrap();
    "
else
    # D1 Migration & Table Schema Creation
    SCHEMA_SQL="
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      role TEXT DEFAULT 'customer',
      email_verified INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      resource TEXT,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    INSERT OR IGNORE INTO users (id, email, password_hash, role, email_verified)
    VALUES ('admin-super-1', '$ADMIN_EMAIL', '$ADMIN_HASH', 'super_admin', 1);
    "
    $WRANGLER d1 execute "${PROJECT_NAME}-d1" --remote --command="$SCHEMA_SQL" || true
    echo -e "${GREEN}  ✅ D1 Schema Migrated & Super Admin Account Configured.${NC}"
fi

# 9. Build Workspace
echo -e "\n🛠️ Compiling workspace for Cloudflare production..."
CLOUDFLARE=true $PACKAGER run build:pages

# 10. Deploy to Cloudflare Workers with Assets
echo -e "\n☁️ Deploying to Cloudflare Workers with Assets..."
rm -rf .wrangler admin/.wrangler admin/dist/server/.wrangler 2>/dev/null || true

node -e "
const fs = require('fs');
const configPath = './admin/dist/server/wrangler.json';
if (fs.existsSync(configPath)) {
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  cfg.name = '$PROJECT_NAME';
  cfg.compatibility_flags = ['nodejs_compat'];
  cfg.vars = cfg.vars || {};
  if ('$DATABASE_URL') {
    cfg.vars.DATABASE_URL = '$DATABASE_URL';
  }
  if ('$DB_MODE' === 'postgres') {
    cfg.hyperdrive = [{ binding: 'HYPERDRIVE', id: '$HYPER_ID' }];
  } else {
    cfg.d1_databases = [{ binding: 'DB', database_name: '${PROJECT_NAME}-d1', database_id: '$D1_ID' }];
  }
  cfg.r2_buckets = [{ binding: 'STORAGE_BUCKET', bucket_name: '$R2_BUCKET_NAME' }];
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
}
"

DEPLOY_STATUS=0
DEPLOY_OUT=$($WRANGLER deploy --config admin/dist/server/wrangler.json 2>&1) || DEPLOY_STATUS=$?
echo "$DEPLOY_OUT" >&2

if [ "$DEPLOY_STATUS" -ne 0 ]; then
    echo -e "\n==========================================================================================="
    echo -e "${RED}${BOLD}❌ Kyro CMS Cloudflare Deployment Failed!${NC}"
    echo -e "==========================================================================================="
    echo -e "Please inspect the Wrangler output above for error details."
    exit 1
fi

LIVE_URL=$(node -e "const txt = process.argv[1] || ''; const m = txt.match(/(https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev)/i); console.log(m ? m[1] : '');" "$DEPLOY_OUT")
if [ -z "$LIVE_URL" ]; then
    LIVE_URL="https://${PROJECT_NAME}.workers.dev"
fi

# 11. Final Deployment Summary
echo -e "\n==========================================================================================="
echo -e "${GREEN}${BOLD}🎉 Kyro CMS Cloudflare Deployment Complete!${NC}"
echo -e "==========================================================================================="
echo -e "• Hosting Target : ${BOLD}Cloudflare Workers with Assets${NC}"
echo -e "• Admin Dashboard: ${BOLD}${LIVE_URL}/admin${NC}"
if [ "$DB_MODE" = "postgres" ]; then
    echo -e "• Database Mode  : PostgreSQL Hyperdrive (${HYPER_ID})"
else
    echo -e "• Database Mode  : Cloudflare D1 (${D1_ID})"
fi
echo -e "• R2 Storage     : ${R2_BUCKET_NAME}"
echo -e ""
echo -e "🔑 ${BOLD}Super Admin Credentials:${NC}"
echo -e "  Email   : ${CYAN}${ADMIN_EMAIL}${NC}"
echo -e "  Password: ${CYAN}${ADMIN_PASSWORD}${NC}"
echo -e "==========================================================================================="
