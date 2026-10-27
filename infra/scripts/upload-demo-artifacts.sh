#!/usr/bin/env bash
# Uploads the demo publication's public files (manifest, report, aggregates) from infra/demo to
# the public-artifacts bucket, with the secret key from the VPS settings. The matching database
# rows are loaded separately (`el demo-sql`, applied with `supabase db query --linked`); the files
# must be these exact bytes, because the manifest commits to their hashes.
#   bash /opt/electralens/infra/scripts/upload-demo-artifacts.sh
set -euo pipefail

ROOT="${ELECTRALENS_ROOT:-/opt/electralens}"
ENV_FILE=/etc/electralens/electralens.env
setting() { grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2-; }
url=$(setting SUPABASE_URL)
key=$(setting SUPABASE_SECRET_KEY)

cd "$ROOT/infra/demo"
for file in $(find . -type f -name '*.json' | sed 's#^\./##' | sort); do
  code=$(curl -sS -o /tmp/electralens-upload.txt -w '%{http_code}' -X POST \
    "$url/storage/v1/object/public-artifacts/$file" \
    -H "authorization: Bearer $key" -H "apikey: $key" \
    -H 'content-type: application/json' -H 'cache-control: max-age=60' -H 'x-upsert: true' \
    --data-binary "@$file")
  if [[ "$code" != 200 ]]; then
    echo "upload $file failed ($code): $(head -c 300 /tmp/electralens-upload.txt)" >&2
    exit 1
  fi
  echo "uploaded public-artifacts/$file"
done
rm -f /tmp/electralens-upload.txt
