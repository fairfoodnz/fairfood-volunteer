#!/usr/bin/env bash
# One-shot bootstrap for the local Garage S3 container.
# Safe to re-run: every step is idempotent.

set -euo pipefail

BUCKET="${GARAGE_BUCKET:-fairfood}"
KEY_NAME="${GARAGE_KEY_NAME:-fairfood-local}"
ZONE="${GARAGE_ZONE:-dc1}"
CAPACITY="${GARAGE_CAPACITY:-1G}"

gx() { docker compose exec -T garage /garage "$@"; }

echo "→ waiting for garage..."
for _ in $(seq 1 30); do
  if gx status >/dev/null 2>&1; then break; fi
  sleep 1
done

if ! gx status >/dev/null 2>&1; then
  echo "✗ garage did not come up. Try: docker compose logs garage" >&2
  exit 1
fi

NODE_ID=$(gx node id -q | awk -F@ '{print $1}')
echo "→ node id: $NODE_ID"

if gx status | grep -q "NO ROLE ASSIGNED"; then
  echo "→ assigning layout..."
  gx layout assign "$NODE_ID" -z "$ZONE" -c "$CAPACITY" -t local
  gx layout apply --version 1
else
  echo "→ layout already applied"
fi

if gx bucket info "$BUCKET" >/dev/null 2>&1; then
  echo "→ bucket '$BUCKET' already exists"
else
  echo "→ creating bucket '$BUCKET'..."
  gx bucket create "$BUCKET"
fi

if gx key info "$KEY_NAME" >/dev/null 2>&1; then
  echo "→ key '$KEY_NAME' already exists"
else
  echo "→ creating key '$KEY_NAME'..."
  gx key create "$KEY_NAME"
fi

gx bucket allow --read --write --owner "$BUCKET" --key "$KEY_NAME" >/dev/null

echo
echo "✓ garage ready. Add these to .env (S3_SECRET_ACCESS_KEY only shown once below):"
echo
echo "S3_ENDPOINT=\"http://localhost:3900\""
echo "S3_REGION=\"garage\""
echo "S3_BUCKET=\"$BUCKET\""
gx key info "$KEY_NAME" --show-secret | awk -F': *' '
  /^Key ID/         { printf "S3_ACCESS_KEY_ID=\"%s\"\n", $2 }
  /^Secret key/     { printf "S3_SECRET_ACCESS_KEY=\"%s\"\n", $2 }
'
