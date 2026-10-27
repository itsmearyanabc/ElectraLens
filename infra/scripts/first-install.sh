#!/usr/bin/env bash
# First-time install of ElectraLens on the VPS, start to finish. Touches only ElectraLens:
# /opt/electralens, /opt/electralens-node, /etc/electralens, pm2 processes named electralens-*,
# and one site for electralens.armedias.com: with Caddy, /etc/caddy/electralens.caddy plus one
# import line in the Caddyfile; with nginx, one sites-available file. Other apps, sites and pm2
# processes are never stopped or edited; the web server is reloaded only after its config check
# passes, and is put back as it was if the check fails.
#
#   bash /opt/electralens/infra/scripts/first-install.sh
set -euo pipefail

DOMAIN=electralens.armedias.com
ROOT=/opt/electralens
SITE=/etc/nginx/sites-available/electralens.conf
CADDYFILE=/etc/caddy/Caddyfile
CADDY_IMPORT="import /etc/caddy/electralens.caddy"
step() { echo; echo "======== $* ========"; }

step "1/7 checking ports 3100, 4100, 4200 are free"
if pm2 describe electralens-web >/dev/null 2>&1; then
  echo "ElectraLens is already running on them (re-run)"
elif ss -ltn | grep -qE ':(3100|4100|4200) '; then
  ss -ltnp | grep -E ':(3100|4100|4200) '
  echo "A port ElectraLens needs is in use by another app. Stopping without changing anything." >&2
  exit 1
fi
echo "ports free"

step "2/7 checking DNS for $DOMAIN"
getent hosts "$DOMAIN" || { echo "DNS for $DOMAIN does not resolve yet" >&2; exit 1; }

step "3/7 installing ElectraLens' own Node 24, pnpm and uv (system Node untouched)"
bash "$ROOT/infra/scripts/install-tools.sh"

step "4/7 settings (answer each question; secrets are hidden)"
if [[ -f /etc/electralens/electralens.env ]]; then
  read -r -p "Settings already exist. Enter them again? [y/N] " again
  [[ "$again" =~ ^[Yy]$ ]] && bash "$ROOT/infra/scripts/setup-env.sh"
else
  bash "$ROOT/infra/scripts/setup-env.sh"
fi

step "5/7 building and starting (about 5-10 minutes)"
bash "$ROOT/infra/scripts/deploy.sh"

step "6/7 creating the admin and staff accounts from the settings"
(cd "$ROOT" && /opt/electralens-node/bin/node --env-file=/etc/electralens/electralens.env apps/api/dist/bootstrap.js)

step "7/7 web server site and HTTPS for $DOMAIN"
if systemctl is-active --quiet caddy && [[ -f "$CADDYFILE" ]]; then
  # Caddy owns 80/443: add one import line (backed up first) and let Caddy fetch the certificate.
  cp "$ROOT/infra/caddy/electralens.caddy" /etc/caddy/electralens.caddy
  backup="$CADDYFILE.before-electralens"
  cp "$CADDYFILE" "$backup"
  grep -qF "$CADDY_IMPORT" "$CADDYFILE" || printf '\n%s\n' "$CADDY_IMPORT" >> "$CADDYFILE"
  if ! caddy validate --config "$CADDYFILE" --adapter caddyfile; then
    cp "$backup" "$CADDYFILE"
    rm -f /etc/caddy/electralens.caddy
    echo "Caddy rejected the new site, so the Caddyfile was restored; other sites are unaffected." >&2
    exit 1
  fi
  systemctl reload caddy
elif command -v nginx >/dev/null; then
  cp "$ROOT/infra/nginx/electralens.conf" "$SITE"
  ln -sf "$SITE" /etc/nginx/sites-enabled/electralens.conf
  if ! nginx -t; then
    rm -f /etc/nginx/sites-enabled/electralens.conf
    echo "nginx rejected the new site, so it was removed again; other sites are unaffected." >&2
    exit 1
  fi
  systemctl reload nginx
  command -v certbot >/dev/null || apt-get install -y certbot python3-certbot-nginx
  read -r -p "Email for the HTTPS certificate notices: " cert_email
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect -m "$cert_email"
else
  echo "Neither a systemd Caddy with $CADDYFILE nor nginx was found; the app runs on" >&2
  echo "127.0.0.1:3100 (web) and :4100 (api), but no public site was added." >&2
  exit 1
fi
pm2 save

echo
pm2 list | grep -E 'electralens|name'
echo
echo "Done: https://$DOMAIN  (staff console: https://$DOMAIN/en/ops/login)"
