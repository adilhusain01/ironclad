#!/usr/bin/env bash
cd "$(dirname "$0")"
set -a; [ -f .env ] && . ./.env; [ -f ../agent/.env ] && . ../agent/.env; set +a
exec npx tsx src/dashboard.ts
