#!/usr/bin/env bash
# Deploy or update ElectraLens on the VPS (S8). Run as root from /opt/electralens:
#   bash infra/scripts/deploy.sh
set -euo pipefail

ROOT="${ELECTRALENS_ROOT:-/opt/electralens}"
ENV_DIR=/etc/electralens
cd "$ROOT"

for file in electralens.env anchor.env; do
  if [[ ! -f "$ENV_DIR/$file" ]]; then
    echo "missing $ENV_DIR/$file (copy infra/env/$file.example and fill it in)" >&2
    exit 1
  fi
  chmod 600 "$ENV_DIR/$file"
done

echo "== pulling"
git pull --ff-only

echo "== installing"
corepack enable >/dev/null 2>&1 || true
pnpm install --frozen-lockfile
uv sync --directory services/engine --frozen

echo "== building"
pnpm --filter "@electralens/web..." --filter "@electralens/api..." --filter "@electralens/anchor..." build

# The worker names the engine in each manifest by the deployed commit.
sha=$(git rev-parse --short=12 HEAD)
sed -i "s/^ELECTRALENS_GIT_SHA=.*/ELECTRALENS_GIT_SHA=$sha/" "$ENV_DIR/electralens.env"

echo "== (re)starting"
pm2 startOrReload infra/pm2/ecosystem.config.cjs --update-env
pm2 save

echo "== health"
sleep 5
curl -fsS http://127.0.0.1:4100/ready && echo
curl -fsS -o /dev/null -w "web %{http_code}\n" http://127.0.0.1:3100/healthz
echo "deployed $sha"
