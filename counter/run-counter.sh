#!/usr/bin/env bash
# Runs the counter against the mock Bitrefill (dev) or the real API (set BITREFILL_BASE_URL and BITREFILL_API_KEY in .env).
cd "$(dirname "$0")"
set -a; [ -f .env ] && . ./.env; set +a
export ZKOOL_URL="${ZKOOL_URL:-http://127.0.0.1:8010}" COUNTER_ACCOUNT="${COUNTER_ACCOUNT:-1}" ORDERS_PATH="${ORDERS_PATH:-./orders.json}" COUNTER_POLICY="${COUNTER_POLICY:-./counter-policy.json}" POLL_MS="${POLL_MS:-10000}"
export BITREFILL_API_KEY="${BITREFILL_API_KEY:-mock}" BITREFILL_BASE_URL="${BITREFILL_BASE_URL:-http://127.0.0.1:8790/v2}"
exec npx tsx src/main.ts
