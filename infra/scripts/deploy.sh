#!/usr/bin/env bash
# Deploy or update ElectraLens on the VPS (S8). Run as root:
#   bash /opt/electralens/infra/scripts/deploy.sh
set -euo pipefail

ROOT="${ELECTRALENS_ROOT:-/opt/electralens}"
ENV_DIR=/etc/electralens
cd "$ROOT"

# ElectraLens' own Node 24 (installed by install-tools.sh) comes first; other apps are untouched.
if [[ -x /opt/electralens-node/bin/node ]]; then
  export PATH="/opt/electralens-node/bin:$PATH"
fi
export PATH="$HOME/.local/bin:$PATH"   # uv
export ELECTRALENS_NODE="$(command -v node)"
export ELECTRALENS_UV="$(command -v uv)"
node_major=$(node -p 'process.versions.node.split(".")[0]')
if (( node_major < 24 )); then
  echo "Node 24 or newer is needed (found $(node --version)); run infra/scripts/install-tools.sh" >&2
  exit 1
fi

for file in electralens.env anchor.env; do
  if [[ ! -f "$ENV_DIR/$file" ]]; then
    echo "missing $ENV_DIR/$file (run infra/scripts/setup-env.sh first)" >&2
    exit 1
  fi
  chmod 600 "$ENV_DIR/$file"
done

echo "== pulling"
git pull --ff-only

echo "== installing"
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
sleep 8
curl -fsS http://127.0.0.1:4100/ready && echo
curl -fsS -o /dev/null -w "web %{http_code}\n" http://127.0.0.1:3100/healthz
echo "deployed $sha"
