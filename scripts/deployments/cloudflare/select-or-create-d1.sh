#!/usr/bin/env bash
# docs/deployments/cloudflare/select-or-create-d1.sh
# ─────────────────────────────────────────────────────────────────────────────
# Interactive helper for Cloudflare D1 databases.
# Lists existing D1 DBs via wrangler and lets the user pick one or create new.
# Uses ONLY built-in bash + ANSI — no fzf or other external tools required.
# The chosen (or newly created) database name is printed to stdout.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── ANSI colours ─────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ── Validate wrangler ─────────────────────────────────────────────────────────
if ! command -v wrangler >/dev/null 2>&1 && ! command -v npx >/dev/null 2>&1; then
  echo -e "${RED}❌  wrangler CLI not found. Install it: npm i -g wrangler${NC}" >&2
  exit 1
fi
WRANGLER="${WRANGLER:-$(command -v wrangler 2>/dev/null || echo "npx --yes wrangler")}"

# ── Fetch existing D1 databases ───────────────────────────────────────────────
DB_NAMES=()
DB_JSON=$($WRANGLER d1 list --output json 2>/dev/null || true)

if [[ -n "$DB_JSON" ]]; then
  # Modern Wrangler (v3+) supports --output json
  while IFS= read -r name; do
    [[ -n "$name" ]] && DB_NAMES+=("$name")
  done < <(echo "$DB_JSON" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>{
      try { JSON.parse(d).forEach(x=>process.stdout.write(x.name+'\n')); }
      catch(e){}
    });
  " 2>/dev/null || true)
fi

# Fallback: plain-text table parse
if [[ -z "${DB_NAMES[*]:-}" ]]; then
  while IFS= read -r line; do
    name="${line%%[[:space:]]*}"
    [[ -n "$name" && "$name" != "name" && "$name" != "---" ]] && DB_NAMES+=("$name")
  done < <($WRANGLER d1 list 2>/dev/null | tail -n +2 || true)
fi

# ── Build option list ─────────────────────────────────────────────────────────
OPTIONS=("✨  Create new D1 database")
for db in "${DB_NAMES[@]:-}"; do
  [[ -n "$db" ]] && OPTIONS+=("$db")
done
COUNT=${#OPTIONS[@]}

# ── Render styled menu ────────────────────────────────────────────────────────
echo -e "\n${BOLD}Select a D1 Database${NC} ${DIM}($(( ${#OPTIONS[@]} - 1 )) found)${NC}" >&2
echo -e "--------------------------------------------------" >&2

for i in "${!OPTIONS[@]}"; do
  num=$((i + 1))
  label="${OPTIONS[$i]}"
  if [[ $i -eq 0 ]]; then
    echo -e " ${GREEN}${BOLD}${num})${NC} ${label}" >&2
  else
    echo -e " ${DIM}${num})${NC} ${label}" >&2
  fi
done

echo -e "--------------------------------------------------" >&2

# ── Prompt ────────────────────────────────────────────────────────────────────
CHOICE=""
while true; do
  read -rp "> Enter number [1]: " CHOICE <&2 || CHOICE="1"
  CHOICE="${CHOICE:-1}"
  if [[ "$CHOICE" =~ ^[0-9]+$ ]] && [ "$CHOICE" -ge 1 ] && [ "$CHOICE" -le "$COUNT" ]; then
    break
  fi
  echo -e "${RED}✗ Please enter a number between 1 and ${COUNT}.${NC}" >&2
done

SELECTED="${OPTIONS[$((CHOICE - 1))]}"

# ── Act on selection ──────────────────────────────────────────────────────────
if [[ "$SELECTED" == "✨  Create new D1 database" ]]; then
  echo -e "\n${BOLD}New D1 Database Name${NC} ${DIM}(Alphanumerics and hyphens only)${NC}" >&2
  echo -e "--------------------------------------------------" >&2

  NEW_NAME=""
  while true; do
    read -rp "> Name: " NEW_NAME <&2 || true
    if [[ -z "$NEW_NAME" ]]; then
      echo -e "${RED}✗ Name cannot be empty.${NC}" >&2
    elif [[ ! "$NEW_NAME" =~ ^[A-Za-z0-9_-]+$ ]]; then
      echo -e "${RED}✗ Invalid name — use only letters, numbers, hyphens and underscores.${NC}" >&2
    else
      break
    fi
  done

  echo -e "\n${YELLOW}🚀 Creating D1 database '${NEW_NAME}'…${NC}" >&2
  $WRANGLER d1 create "$NEW_NAME" >&2
  echo -e "  ${GREEN}✅ Created: ${NEW_NAME}${NC}" >&2
  echo "$NEW_NAME"
else
  echo -e "  ${GREEN}✅ Selected: ${SELECTED}${NC}" >&2
  echo "$SELECTED"
fi
