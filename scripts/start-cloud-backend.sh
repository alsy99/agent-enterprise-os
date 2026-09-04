#!/usr/bin/env bash
# Start Agent Suite API on Cursor Cloud and print a public tunnel URL for GitHub Pages.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${API_PORT:-43124}"
export PORT HOST=0.0.0.0

if ! curl -sf "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
  echo "[suite] starting API on :${PORT}"
  npx tsx scripts/api-server.ts &
  API_PID=$!
  for i in $(seq 1 30); do
    curl -sf "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1 && break
    sleep 0.5
  done
else
  echo "[suite] API already healthy on :${PORT}"
  API_PID=""
fi

CLOUDFLARED="${CLOUDFLARED_BIN:-cloudflared}"
if ! command -v "$CLOUDFLARED" >/dev/null 2>&1; then
  CLOUDFLARED="/tmp/cloudflared"
fi

echo "[suite] opening Cloudflare quick tunnel…"
exec "$CLOUDFLARED" tunnel --url "http://127.0.0.1:${PORT}"
