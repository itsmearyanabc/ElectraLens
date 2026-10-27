#!/usr/bin/env bash
# One-time tools for ElectraLens on the VPS. Installs a private Node 24 in /opt/electralens-node
# (the system Node used by the other pm2 apps is not touched), pnpm through corepack, and uv.
set -euo pipefail

NODE_VERSION=24.13.1
DEST=/opt/electralens-node

if [[ ! -x "$DEST/bin/node" ]]; then
  echo "== installing Node $NODE_VERSION into $DEST"
  tmp=$(mktemp -d)
  curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.xz" -o "$tmp/node.tar.xz"
  curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt" -o "$tmp/SHASUMS256.txt"
  (cd "$tmp" && grep " node-v$NODE_VERSION-linux-x64.tar.xz\$" SHASUMS256.txt | sed "s#node-v.*#node.tar.xz#" | sha256sum -c -)
  mkdir -p "$DEST"
  tar -xJf "$tmp/node.tar.xz" -C "$DEST" --strip-components=1
  rm -rf "$tmp"
fi
export PATH="$DEST/bin:$PATH"
corepack enable --install-directory "$DEST/bin"
corepack prepare pnpm@12.15.0 --activate

if ! command -v uv >/dev/null 2>&1 && [[ ! -x "$HOME/.local/bin/uv" ]]; then
  echo "== installing uv"
  curl -LsSf https://astral.sh/uv/install.sh | sh
fi

echo "node $("$DEST/bin/node" --version), pnpm $("$DEST/bin/pnpm" --version), uv $("$HOME/.local/bin/uv" --version 2>/dev/null || uv --version)"
