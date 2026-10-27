#!/usr/bin/env bash
# Writes /etc/electralens/electralens.env and anchor.env by asking for each value. Secrets are
# typed (hidden) into this terminal only: they never go into the repository, a command line or
# shell history. Internal keys are generated here. Re-running it overwrites both files.
set -euo pipefail

ENV_DIR=/etc/electralens
SITE=https://electralens.armedias.com
mkdir -p "$ENV_DIR" && chmod 700 "$ENV_DIR"

ask() {   # ask VAR "question" [default]
  local value
  read -r -p "$2${3:+ [$3]}: " value
  printf -v "$1" '%s' "${value:-${3:-}}"
}
ask_secret() {   # ask_secret VAR "question"   (input hidden)
  local value
  read -r -s -p "$2: " value
  echo
  printf -v "$1" '%s' "$value"
}
need() { [[ -n "${!1}" ]] || { echo "$1 is required" >&2; exit 1; }; }

echo "== Supabase (Dashboard -> Project Settings -> API Keys, and Connect -> Session pooler)"
ask SUPABASE_URL "Project URL" "https://iuupravfeffusjydzeyt.supabase.co"
ask PUBLISHABLE "Publishable key (sb_publishable_...)"
ask_secret SECRET "Secret key (sb_secret_..., hidden)"
ask_secret DATABASE_URL "Session pooler connection string with the DB password (hidden)"
need PUBLISHABLE; need SECRET; need DATABASE_URL

echo
echo "== Admin login for the staff console (password: 14+ characters)"
ask ADMIN_EMAIL "Admin email"
ask_secret ADMIN_PASSWORD "Admin password (hidden)"
need ADMIN_EMAIL
(( ${#ADMIN_PASSWORD} >= 14 )) || { echo "the password must be at least 14 characters" >&2; exit 1; }

echo
echo "== Demo staff (optional; press Enter to skip). The two-person rule needs different people."
staff_lines=""
for role in DATA_STEWARD ANALYST REVIEWER PUBLISHER; do
  ask email "  $role email (Enter to skip)"
  if [[ -n "$email" ]]; then
    ask_secret password "  $role password (hidden, 14+)"
    (( ${#password} >= 14 )) || { echo "the password must be at least 14 characters" >&2; exit 1; }
    staff_lines+="ELECTRALENS_${role}_EMAIL=$email"$'\n'"ELECTRALENS_${role}_PASSWORD=$password"$'\n'
  fi
done

echo
echo "== Hoodi registry (press Enter to skip until the contract is deployed)"
ask REGISTRY "Registry address (0x...)"
ask DEPLOY_BLOCK "Registry deploy block" "0"
PUBLISHER_KEY=""
if [[ -n "$REGISTRY" ]]; then
  ask_secret PUBLISHER_KEY "Publisher private key (the hot wallet from secrets/publisher_private_key, hidden)"
fi

HMAC=$(openssl rand -hex 32)
SALT=$(openssl rand -hex 16)
umask 077

cat > "$ENV_DIR/electralens.env" <<EOF
APP_ORIGIN=$SITE
API_INTERNAL_URL=http://127.0.0.1:4100
SUPABASE_URL=$SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY=$PUBLISHABLE
SUPABASE_SECRET_KEY=$SECRET
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$PUBLISHABLE
DATABASE_URL=$DATABASE_URL
NEXT_PUBLIC_CHAIN_ID=560048
NEXT_PUBLIC_RPC_URL=https://ethereum-hoodi-rpc.publicnode.com
NEXT_PUBLIC_REGISTRY_ADDRESS=$REGISTRY
NEXT_PUBLIC_EXPLORER_URL=https://hoodi.etherscan.io
ANCHOR_HMAC_KEY=$HMAC
ANCHOR_URL=http://127.0.0.1:4200
IP_HASH_SALT=$SALT
TURNSTILE_DISABLED=1
WORKER_ID=vps-worker-1
POLL_INTERVAL_MS=3000
ELECTRALENS_GIT_SHA=
ELECTRALENS_ADMIN_EMAIL=$ADMIN_EMAIL
ELECTRALENS_ADMIN_PASSWORD=$ADMIN_PASSWORD
${staff_lines}EOF

cat > "$ENV_DIR/anchor.env" <<EOF
ANCHOR_HMAC_KEY=$HMAC
PUBLISHER_PRIVATE_KEY=$PUBLISHER_KEY
RPC_URL=https://ethereum-hoodi-rpc.publicnode.com
CHAIN_ID=560048
CHAIN_NETWORK=hoodi
REGISTRY_ADDRESS=$REGISTRY
REGISTRY_DEPLOY_BLOCK=$DEPLOY_BLOCK
CONFIRMATIONS=1
SUPABASE_URL=$SUPABASE_URL
SUPABASE_SECRET_KEY=$SECRET
RECONCILE_INTERVAL_MS=600000
MIN_BALANCE_WEI=10000000000000000
EOF

chmod 600 "$ENV_DIR/electralens.env" "$ENV_DIR/anchor.env"
echo
echo "wrote $ENV_DIR/electralens.env and $ENV_DIR/anchor.env (root only, chmod 600)"
