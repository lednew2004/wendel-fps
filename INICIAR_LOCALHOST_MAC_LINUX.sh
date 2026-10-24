#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo 'Node.js 22+ necessario: https://nodejs.org/'
  exit 1
fi
echo 'TITAN PROTOCOL 3.9.0 — acesse http://localhost:3000'
exec node server/server.mjs
