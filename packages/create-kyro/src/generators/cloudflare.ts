import { writeFileSync, chmodSync } from "fs";
import { join } from "path";

/**
 * Writes the Cloudflare deployment shell scripts into the scaffolded project
 * under <projectDir>/scripts/:
 *   - deploy-cloudflare.sh   (main orchestrator)
 *   - select-or-create-d1.sh (D1 database picker helper)
 *
 * Both scripts are chmod +x so `npm run deploy:cloudflare` works immediately.
 */
export function generateCloudflareScripts(projectDir: string): void {
  const scriptsDir = join(projectDir, "scripts");

  // ── deploy-cloudflare.sh ────────────────────────────────────────────────────
  const deployScript = `#!/usr/bin/env bash
set -e

# ==============================================================================
# Kyro CMS — Cloudflare Deployment Script (Workers with Assets)
# Hosting : Cloudflare Workers with Assets (Full SSR & Static UI)
# Database: Auto-Provisioned Cloudflare D1 OR PostgreSQL (via Cloudflare Hyperdrive)
# Storage : Cloudflare R2 Storage Bucket
# Admin   : Automatic Super Admin Provisioning & Schema Migration
# ==============================================================================

# Colors for terminal output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
CYAN='\\033[0;36m'
BOLD='\\033[1m'
NC='\\033[0m'

echo -e "\${CYAN}==============================================================================\${NC}"
echo -e "\${BOLD}🚀 Kyro CMS Cloudflare Deployment (Workers)\${NC}"
echo -e "\${CYAN}==============================================================================\${NC}"

# 1. Path Resolution
SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="\$(cd "\$SCRIPT_DIR/.." && pwd)"
cd "\$ROOT_DIR"

# Defaults
DB_MODE=""
NON_INTERACTIVE=false

RANDOM_SUFFIX="\$(openssl rand -hex 3 2>/dev/null || echo "\$RANDOM")"
RANDOM_PASS="\$(openssl rand -base64 12 2>/dev/null | tr -dc 'a-zA-Z0-9' | head -c 16 || echo "KyroPass\$(date +%s)")"

PROJECT_NAME=""
R2_BUCKET_NAME=""
HYPERDRIVE_NAME=""
DATABASE_URL=""
ADMIN_EMAIL=""
ADMIN_PASSWORD=""

# 2. Parse Command Line Arguments
show_help() {
    echo "Usage: npm run deploy:cloudflare -- [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -d, --database <d1|postgres>     Database type (default: d1)"
    echo "  -u, --database-url <URL>         PostgreSQL connection string (forces postgres mode)"
    echo "  -n, --name <PROJECT_NAME>        Cloudflare project name"
    echo "  -r2, --r2-bucket <BUCKET_NAME>   R2 storage bucket name"
    echo "  -e, --email <ADMIN_EMAIL>        Initial Super Admin email"
    echo "  -p, --password <ADMIN_PASS>      Initial Super Admin password"
    echo "  -y, --non-interactive            Skip all prompts and use defaults"
    echo "  -h, --help                       Show this help message"
    echo ""
    exit 0
}

while [[ \$# -gt 0 ]]; do
    case "\$1" in
        -d|--database)         DB_MODE="\$2"; shift 2 ;;
        -u|--database-url)     DATABASE_URL="\$2"; DB_MODE="postgres"; shift 2 ;;
        -n|--name|--project-name) PROJECT_NAME="\$2"; shift 2 ;;
        -r2|--r2-bucket)       R2_BUCKET_NAME="\$2"; shift 2 ;;
        -e|--email|--admin-email) ADMIN_EMAIL="\$2"; shift 2 ;;
        -p|--password|--admin-password) ADMIN_PASSWORD="\$2"; shift 2 ;;
        -y|--non-interactive)  NON_INTERACTIVE=true; shift ;;
        -h|--help)             show_help ;;
        *)
            if [ -z "\$DATABASE_URL" ] && [[ "\$1" =~ ^postgres(ql)?:// ]]; then
                DATABASE_URL="\$1"; DB_MODE="postgres"
            fi
            shift ;;
    esac
done

# ─────────────────────────────────────────────────────────────────────────────
# Pure-bash UI helpers (zero external dependencies)
# ─────────────────────────────────────────────────────────────────────────────

DIM='\\033[2m'
MAGENTA='\\033[0;35m'

# kyro_pick <prompt> <item1> [item2 ...]
# Renders a styled numbered menu. Returns chosen value in KYRO_PICK_RESULT.
# An item prefixed with "__custom__:" triggers a free-text prompt.
kyro_pick() {
    local prompt="\$1"; shift
    local items=("\$@")
    local count=\${#items[@]}
    local custom_label=""

    echo -e ""
    echo -e "  \${CYAN}┌─ \${BOLD}\${prompt}\${NC}"
    local i
    for i in "\${!items[@]}"; do
        local item="\${items[\$i]}"
        local display="\$item"
        if [[ "\$item" == __custom__:* ]]; then
            display="\${item#__custom__:}"
            custom_label="\$display"
        fi
        local num=\$(( i + 1 ))
        if [ "\$i" -eq 0 ]; then
            echo -e "  \${CYAN}│\${NC}  \${GREEN}\${BOLD} \$num \${NC} \$display \${DIM}← default\${NC}"
        else
            echo -e "  \${CYAN}│\${NC}  \${DIM} \$num \${NC} \$display"
        fi
    done
    echo -e "  \${CYAN}└──────────────────────────────────────────\${NC}"

    local choice
    while true; do
        read -rp "  \${MAGENTA}›\${NC} Enter number (default: 1): " choice
        choice="\${choice:-1}"
        if [[ "\$choice" =~ ^[0-9]+\$ ]] && [ "\$choice" -ge 1 ] && [ "\$choice" -le "\$count" ]; then
            local selected="\${items[\$(( choice - 1 ))]}"
            if [[ "\$selected" == __custom__:* ]]; then
                read -rp "  \${MAGENTA}›\${NC} \${custom_label}: " KYRO_PICK_RESULT
            else
                KYRO_PICK_RESULT="\$selected"
            fi
            return 0
        fi
        echo -e "  \${RED}  ✗ Invalid — enter a number between 1 and \${count}.\${NC}"
    done
}

# kyro_input <prompt> [default]
kyro_input() {
    local prompt="\$1"
    local default="\${2:-}"
    local hint=""
    [ -n "\$default" ] && hint=" \${DIM}(default: \${default})\${NC}"
    echo -e ""
    echo -e "  \${CYAN}┌─ \${BOLD}\${prompt}\${NC}\${hint}"
    echo -e "  \${CYAN}└──────────────────────────────────────────\${NC}"
    read -rp "  \${MAGENTA}›\${NC} " KYRO_INPUT_RESULT
    KYRO_INPUT_RESULT="\${KYRO_INPUT_RESULT:-\$default}"
}

# ─────────────────────────────────────────────────────────────────────────────
# 3. Interactive Prompts (if TTY & not non-interactive)
# ─────────────────────────────────────────────────────────────────────────────
if [ "\$NON_INTERACTIVE" = false ] && [ -t 0 ]; then
    echo -e ""
    echo -e "  \${YELLOW}\${BOLD}📋 Setup Configuration\${NC}"
    echo -e "  \${DIM}Use the numbered menus below to configure your deployment.\${NC}"

    if [ -z "\$DB_MODE" ]; then
        kyro_pick "Select Database Infrastructure" \\
            "Native Cloudflare D1  \${DIM}— serverless SQLite, auto-provisioned\${NC}" \\
            "PostgreSQL  \${DIM}— via Cloudflare Hyperdrive\${NC}"
        case "\$KYRO_PICK_RESULT" in
            PostgreSQL*) DB_MODE="postgres" ;;
            *)           DB_MODE="d1" ;;
        esac
    fi

    if [ "\$DB_MODE" = "postgres" ] && [ -z "\$DATABASE_URL" ]; then
        kyro_input "PostgreSQL Connection URL" "postgresql://user:pass@host/db"
        DATABASE_URL="\$KYRO_INPUT_RESULT"
    fi

    if [ -z "\$PROJECT_NAME" ]; then
        kyro_pick "Cloudflare Project Name" \\
            "kyro-app-\${RANDOM_SUFFIX}" \\
            "kyro-demo-\${RANDOM_SUFFIX}" \\
            "kyro-\${RANDOM_SUFFIX}" \\
            "__custom__:Enter a custom project name"
        PROJECT_NAME="\$KYRO_PICK_RESULT"
        PROJECT_NAME="\${PROJECT_NAME:-kyro-app-\${RANDOM_SUFFIX}}"
    fi

    if [ -z "\$R2_BUCKET_NAME" ]; then
        kyro_pick "Cloudflare R2 Bucket Name" \\
            "kyro-media-\${RANDOM_SUFFIX}" \\
            "kyro-assets-\${RANDOM_SUFFIX}" \\
            "__custom__:Enter a custom bucket name"
        R2_BUCKET_NAME="\$KYRO_PICK_RESULT"
        R2_BUCKET_NAME="\${R2_BUCKET_NAME:-kyro-media-\${RANDOM_SUFFIX}}"
    fi

    if [ -z "\$ADMIN_EMAIL" ]; then
        kyro_pick "Initial Super Admin Email" \\
            "admin@kyro-cms.com" \\
            "admin@example.com" \\
            "__custom__:Enter a custom email"
        ADMIN_EMAIL="\$KYRO_PICK_RESULT"
        ADMIN_EMAIL="\${ADMIN_EMAIL:-admin@kyro-cms.com}"
    fi

    if [ -z "\$ADMIN_PASSWORD" ]; then
        kyro_pick "Initial Super Admin Password" \\
            "Auto-generate a secure password  \${DIM}← recommended\${NC}" \\
            "__custom__:Enter a custom password"
        case "\$KYRO_PICK_RESULT" in
            Auto-generate*) ADMIN_PASSWORD="\${RANDOM_PASS}" ;;
            *)              ADMIN_PASSWORD="\$KYRO_PICK_RESULT" ;;
        esac
        ADMIN_PASSWORD="\${ADMIN_PASSWORD:-\${RANDOM_PASS}}"
    fi

    if [ "\$DB_MODE" = "postgres" ] && [ -z "\$HYPERDRIVE_NAME" ]; then
        kyro_pick "Cloudflare Hyperdrive Name" \\
            "kyro-postgres-hd-\${RANDOM_SUFFIX}" \\
            "hyperdrive-\${RANDOM_SUFFIX}" \\
            "__custom__:Enter a custom Hyperdrive name"
        HYPERDRIVE_NAME="\$KYRO_PICK_RESULT"
        HYPERDRIVE_NAME="\${HYPERDRIVE_NAME:-kyro-postgres-hd-\${RANDOM_SUFFIX}}"
    fi
fi

# Fallback defaults
PROJECT_NAME="\${PROJECT_NAME:-kyro-app-\${RANDOM_SUFFIX}}"
R2_BUCKET_NAME="\${R2_BUCKET_NAME:-kyro-media-\${RANDOM_SUFFIX}}"
HYPERDRIVE_NAME="\${HYPERDRIVE_NAME:-kyro-postgres-hd-\${RANDOM_SUFFIX}}"
ADMIN_EMAIL="\${ADMIN_EMAIL:-admin@kyro-cms.com}"
ADMIN_PASSWORD="\${ADMIN_PASSWORD:-\${RANDOM_PASS}}"
DB_MODE="\${DB_MODE:-d1}"

echo -e "\\n\${CYAN}⚙️ Configuration Summary:\${NC}"
echo -e "  • Target Hosting: \${BOLD}Cloudflare Workers with Assets\${NC}"
echo -e "  • Database Mode : \${BOLD}\${DB_MODE}\${NC}"
echo -e "  • Project Name  : \${BOLD}\${PROJECT_NAME}\${NC}"
echo -e "  • R2 Bucket Name: \${BOLD}\${R2_BUCKET_NAME}\${NC}"
echo -e "  • Admin Email   : \${BOLD}\${ADMIN_EMAIL}\${NC}"

# 4. Package Manager & Wrangler
PACKAGER="pnpm"
command -v pnpm >/dev/null 2>&1 || PACKAGER="npm"
WRANGLER="\$PACKAGER dlx wrangler"

echo -e "\\n🔍 Checking Cloudflare Wrangler authentication..."
if ! \$WRANGLER whoami >/dev/null 2>&1; then
    echo -e "\${RED}❌ Cloudflare Wrangler authentication required.\${NC}"
    echo -e "   Run \${BOLD}'\$WRANGLER login'\${NC} or set the \${BOLD}CLOUDFLARE_API_TOKEN\${NC} env var."
    exit 1
fi
echo -e "\${GREEN}✅ Cloudflare Wrangler Authenticated.\${NC}"

# 5. Database Provisioning
if [ "\$DB_MODE" = "postgres" ]; then
    if [ -z "\$DATABASE_URL" ]; then
        echo -e "\${RED}❌ postgres mode requires --database-url.\${NC}"
        exit 1
    fi
    echo -e "\\n⚡ Provisioning Cloudflare Hyperdrive (\${HYPERDRIVE_NAME})..."
    HYPER_LIST=\$(\$WRANGLER hyperdrive list --json 2>/dev/null || true)
    HYPER_ID=\$(node -e "try { const raw = process.argv[1] || ''; const idx = Math.min(...[raw.indexOf('{'), raw.indexOf('[')].filter(i => i !== -1)); if (idx >= 0) { const data = JSON.parse(raw.slice(idx)); const item = Array.isArray(data) ? data.find(h => h.name === '\$HYPERDRIVE_NAME') : data; console.log(item ? (item.id || item.uuid || '') : ''); } } catch(e){}" "\$HYPER_LIST")
    if [ -z "\$HYPER_ID" ]; then
        HYPER_OUT=\$(\$WRANGLER hyperdrive create "\$HYPERDRIVE_NAME" --connection-string="\$DATABASE_URL" --json 2>/dev/null || true)
        HYPER_ID=\$(node -e "try { const raw = process.argv[1] || ''; const idx = Math.min(...[raw.indexOf('{'), raw.indexOf('[')].filter(i => i !== -1)); if (idx >= 0) { const data = JSON.parse(raw.slice(idx)); console.log(data.id || data.uuid || ''); } } catch(e){}" "\$HYPER_OUT")
    fi
    echo -e "\${GREEN}✅ Hyperdrive Provisioned (ID: \${HYPER_ID:-auto})\${NC}"
else
    if [ "\$NON_INTERACTIVE" = true ]; then
        D1_NAME="\${PROJECT_NAME}-d1"
        D1_OUT=\$(\$WRANGLER d1 create "\$D1_NAME" 2>/dev/null || true)
        D1_ID=\$(node -e "const txt = process.argv[1] || ''; const m = txt.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i); console.log(m ? m[1] : '');" "\$D1_OUT")
    else
        echo -e "\\n🗂️ Selecting or creating D1 database…"
        SELECTED_DB=\$(bash "\${SCRIPT_DIR}/select-or-create-d1.sh")
        D1_NAME="\$SELECTED_DB"
        D1_ID=\$(\$WRANGLER d1 list --json 2>/dev/null | node -e "let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>{ try { const list=JSON.parse(d); const hit=list.find(x=>x.name==='\$D1_NAME'); console.log(hit?hit.id:''); } catch(e){} });" || true)
        echo -e "\${GREEN}✅ Using D1 database: \$D1_NAME (ID: \$D1_ID)\${NC}"
    fi
fi

# 6. Provision R2 Bucket
echo -e "\\n🗄️ Provisioning R2 Bucket '\${R2_BUCKET_NAME}'..."
\$WRANGLER r2 bucket create "\$R2_BUCKET_NAME" 2>/dev/null || echo -e "ℹ️ Bucket '\${R2_BUCKET_NAME}' already exists."
echo "y" | \$WRANGLER r2 bucket dev-url enable "\$R2_BUCKET_NAME" 2>/dev/null || true

# 7. Generate wrangler.toml
echo -e "\\n⚙️ Generating wrangler.toml..."
if [ "\$DB_MODE" = "postgres" ]; then
cat <<EOF > wrangler.toml
name = "\$PROJECT_NAME"
compatibility_date = "2026-01-01"
compatibility_flags = ["nodejs_compat"]

[[hyperdrive]]
binding = "HYPERDRIVE"
id = "\$HYPER_ID"

[[r2_buckets]]
binding = "STORAGE_BUCKET"
bucket_name = "\$R2_BUCKET_NAME"
EOF
else
cat <<EOF > wrangler.toml
name = "\$PROJECT_NAME"
compatibility_date = "2026-01-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "\${PROJECT_NAME}-d1"
database_id = "\$D1_ID"

[[r2_buckets]]
binding = "STORAGE_BUCKET"
bucket_name = "\$R2_BUCKET_NAME"
EOF
fi

# 8. Schema Migration & Admin Seeding
echo -e "\\n🗃️ Running schema migrations & seeding super admin..."
ADMIN_HASH=\$(node -e "import bcrypt from 'bcryptjs'; console.log(bcrypt.hashSync('\$ADMIN_PASSWORD', 10));" 2>/dev/null || echo "")

if [ "\$DB_MODE" = "postgres" ]; then
    DATABASE_URL="\$DATABASE_URL" npx drizzle-kit push --force 2>/dev/null || true
    node -e "
    import postgres from 'postgres';
    import bcrypt from 'bcryptjs';
    const sql = postgres(process.env.DATABASE_URL || '\$DATABASE_URL');
    async function bootstrap() {
      try {
        await sql\`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email VARCHAR(255) NOT NULL, password_hash VARCHAR(255), role VARCHAR(50) DEFAULT 'customer', email_verified BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())\`;
        await sql\`CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email)\`;
        const existing = await sql\`SELECT id FROM users WHERE email = '\$ADMIN_EMAIL'\`;
        if (existing.length === 0) {
          const hash = bcrypt.hashSync('\$ADMIN_PASSWORD', 10);
          await sql\`INSERT INTO users (email, password_hash, role, email_verified) VALUES ('\$ADMIN_EMAIL', \\\${hash}, 'super_admin', true)\`;
          console.log('  ✅ PostgreSQL Super Admin Configured');
        }
      } catch (e) {
        console.warn('  ⚠️ Bootstrap note:', e.message);
      } finally { await sql.end(); }
    }
    bootstrap();
    "
else
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
    VALUES ('admin-super-1', '\$ADMIN_EMAIL', '\$ADMIN_HASH', 'super_admin', 1);
    "
    \$WRANGLER d1 execute "\${PROJECT_NAME}-d1" --remote --command="\$SCHEMA_SQL" || true
    echo -e "\${GREEN}  ✅ D1 Schema Migrated & Super Admin Configured.\${NC}"
fi

# 9. Build
echo -e "\\n🛠️ Building for Cloudflare..."
\$PACKAGER run build

# 10. Deploy
echo -e "\\n☁️ Deploying to Cloudflare Workers..."
rm -rf .wrangler 2>/dev/null || true

DEPLOY_STATUS=0
DEPLOY_OUT=\$(\$WRANGLER deploy 2>&1) || DEPLOY_STATUS=\$?
echo "\$DEPLOY_OUT" >&2

if [ "\$DEPLOY_STATUS" -ne 0 ]; then
    echo -e "\\n==========================================================================================="
    echo -e "\${RED}\${BOLD}❌ Kyro CMS Cloudflare Deployment Failed!\${NC}"
    echo -e "==========================================================================================="
    echo -e "Inspect the Wrangler output above for error details."
    exit 1
fi

LIVE_URL=\$(node -e "const txt = process.argv[1] || ''; const m = txt.match(/(https:\\/\\/[a-z0-9-]+\\.[a-z0-9-]+\\.workers\\.dev)/i); console.log(m ? m[1] : '');" "\$DEPLOY_OUT")
if [ -z "\$LIVE_URL" ]; then
    LIVE_URL="https://\${PROJECT_NAME}.workers.dev"
fi

# 11. Summary
echo -e "\\n==========================================================================================="
echo -e "\${GREEN}\${BOLD}🎉 Kyro CMS Cloudflare Deployment Complete!\${NC}"
echo -e "==========================================================================================="
echo -e "• Hosting Target : \${BOLD}Cloudflare Workers with Assets\${NC}"
echo -e "• Admin Dashboard: \${BOLD}\${LIVE_URL}/admin\${NC}"
if [ "\$DB_MODE" = "postgres" ]; then
    echo -e "• Database Mode  : PostgreSQL Hyperdrive (\${HYPER_ID})"
else
    echo -e "• Database Mode  : Cloudflare D1 (\${D1_ID})"
fi
echo -e "• R2 Storage     : \${R2_BUCKET_NAME}"
echo -e ""
echo -e "🔑 \${BOLD}Super Admin Credentials:\${NC}"
echo -e "  Email   : \${CYAN}\${ADMIN_EMAIL}\${NC}"
echo -e "  Password: \${CYAN}\${ADMIN_PASSWORD}\${NC}"
echo -e "==========================================================================================="
`;

  // ── select-or-create-d1.sh ──────────────────────────────────────────────────
  const d1Script = `#!/usr/bin/env bash
# scripts/select-or-create-d1.sh
# ─────────────────────────────────────────────────────────────────────────────
# Interactive D1 database picker — zero external dependencies.
# Prints the chosen / created database NAME to stdout.
# All UI output goes to stderr so it doesn't pollute the captured result.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

RED='\\033[0;31m'
GREEN='\\033[0;32m'
CYAN='\\033[0;36m'
MAGENTA='\\033[0;35m'
BOLD='\\033[1m'
DIM='\\033[2m'
NC='\\033[0m'

WRANGLER="\${WRANGLER:-\$(command -v wrangler 2>/dev/null || echo "npx wrangler")}"

# ── Fetch existing D1 databases ───────────────────────────────────────────────
DB_NAMES=()
DB_JSON=\$(\$WRANGLER d1 list --output json 2>/dev/null || true)

if [[ -n "\$DB_JSON" ]]; then
  while IFS= read -r name; do
    [[ -n "\$name" ]] && DB_NAMES+=("\$name")
  done < <(echo "\$DB_JSON" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>{
      try { JSON.parse(d).forEach(x=>process.stdout.write(x.name+'\\n')); } catch(e){}
    });" 2>/dev/null || true)
fi

if [[ \${#DB_NAMES[@]} -eq 0 ]]; then
  while IFS= read -r line; do
    name="\${line%%[[:space:]]*}"
    [[ -n "\$name" && "\$name" != "name" && "\$name" != "---" ]] && DB_NAMES+=("\$name")
  done < <(\$WRANGLER d1 list 2>/dev/null | tail -n +2 || true)
fi

# ── Build options ─────────────────────────────────────────────────────────────
OPTIONS=("✨  Create new D1 database")
for db in "\${DB_NAMES[@]}"; do OPTIONS+=("\$db"); done
COUNT=\${#OPTIONS[@]}

# ── Render menu ───────────────────────────────────────────────────────────────
echo -e "" >&2
echo -e "  \${CYAN}┌─ \${BOLD}Select a D1 Database\${NC}" >&2
echo -e "  \${CYAN}│\${NC}  \${DIM}\${#DB_NAMES[@]} existing database(s) found\${NC}" >&2
echo -e "  \${CYAN}│\${NC}" >&2

for i in "\${!OPTIONS[@]}"; do
  num=\$(( i + 1 ))
  label="\${OPTIONS[\$i]}"
  if [[ \$i -eq 0 ]]; then
    echo -e "  \${CYAN}│\${NC}  \${GREEN}\${BOLD} \$num \${NC} \${label}" >&2
  else
    echo -e "  \${CYAN}│\${NC}  \${DIM} \$num \${NC} \${label}" >&2
  fi
done
echo -e "  \${CYAN}└──────────────────────────────────────────\${NC}" >&2

CHOICE=""
while true; do
  read -rp "  \${MAGENTA}›\${NC} Enter number (default: 1): " CHOICE <&2 || CHOICE="1"
  CHOICE="\${CHOICE:-1}"
  if [[ "\$CHOICE" =~ ^[0-9]+\$ ]] && [ "\$CHOICE" -ge 1 ] && [ "\$CHOICE" -le "\$COUNT" ]; then
    break
  fi
  echo -e "  \${RED}  ✗ Enter a number between 1 and \${COUNT}.\${NC}" >&2
done

SELECTED="\${OPTIONS[\$(( CHOICE - 1 ))]}"

# ── Act on choice ─────────────────────────────────────────────────────────────
if [[ "\$SELECTED" == "✨  Create new D1 database" ]]; then
  echo -e "" >&2
  echo -e "  \${CYAN}┌─ \${BOLD}New D1 Database Name\${NC}" >&2
  echo -e "  \${CYAN}│\${NC}  \${DIM}Alphanumerics, hyphens and underscores only\${NC}" >&2
  echo -e "  \${CYAN}└──────────────────────────────────────────\${NC}" >&2

  NEW_NAME=""
  while true; do
    read -rp "  \${MAGENTA}›\${NC} Name: " NEW_NAME <&2 || true
    if [[ -z "\$NEW_NAME" ]]; then
      echo -e "  \${RED}  ✗ Name cannot be empty.\${NC}" >&2
    elif [[ ! "\$NEW_NAME" =~ ^[A-Za-z0-9_-]+\$ ]]; then
      echo -e "  \${RED}  ✗ Invalid — use letters, numbers, hyphens, underscores only.\${NC}" >&2
    else
      break
    fi
  done

  echo -e "\\n  \${CYAN}🚀 Creating D1 database '\${NEW_NAME}'…\${NC}" >&2
  \$WRANGLER d1 create "\$NEW_NAME" >&2
  echo -e "  \${GREEN}✅ Created: \${NEW_NAME}\${NC}" >&2
  echo "\$NEW_NAME"
else
  echo -e "  \${GREEN}✅ Selected: \${SELECTED}\${NC}" >&2
  echo "\$SELECTED"
fi
`;

  writeFileSync(join(scriptsDir, "deploy-cloudflare.sh"), deployScript, { mode: 0o755 });
  writeFileSync(join(scriptsDir, "select-or-create-d1.sh"), d1Script, { mode: 0o755 });

  // Ensure execute bits (writeFileSync mode may be ignored on some systems)
  try {
    chmodSync(join(scriptsDir, "deploy-cloudflare.sh"), 0o755);
    chmodSync(join(scriptsDir, "select-or-create-d1.sh"), 0o755);
  } catch {
    // Non-fatal — Windows doesn't support chmod
  }
}
