#!/usr/bin/env bash
# First-time install of ElectraLens on the VPS, start to finish. Touches only ElectraLens:
# /opt/electralens, /opt/electralens-node, /etc/electralens, pm2 processes named electralens-*,
# and one nginx site file for electralens.armedias.com. Other apps, sites and pm2 processes are
# never stopped, edited or reloaded (nginx is only reloaded after `nginx -t` passes).
#
#   bash /opt/electralens/infra/scripts/first-install.sh
set -euo pipefail

DOMAIN=electralens.armedias.com
ROOT=/opt/electralens
SITE=/etc/nginx/sites-available/electralens.conf
step() { echo; echo "======== $* ========"; }

step "1/7 checking ports 3100, 4100, 4200 are free"
if ss -ltn | grep -qE ':(3100|4100|4200) '; then
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

step "7/7 nginx site and HTTPS for $DOMAIN"
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
pm2 save

echo
pm2 list | grep -E 'electralens|name'
echo
echo "Done: https://$DOMAIN  (staff console: https://$DOMAIN/en/ops/login)"
