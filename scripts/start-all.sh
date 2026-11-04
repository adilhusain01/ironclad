#!/usr/bin/env bash
# Starts every Ironclad service on the VPS after a reboot or a crash:
# zkool_graphql (the counter's wallet), the mock Bitrefill (dev only), the counter,
# the policy co-signer daemon and the public dashboard. Safe to run twice.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH=/root/.cargo/bin:$PATH

start() { # name, pidfile, dir, command...
  local name=$1 pidfile=$2 dir=$3; shift 3
  if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then echo "$name: running ($(cat "$pidfile"))"; return; fi
  (cd "$dir" && setsid nohup "$@" >> "$name.log" 2>&1 < /dev/null & echo $! > "$pidfile")
  sleep 1; echo "$name: started ($(cat "$pidfile"))"
}

start zkool "$ROOT/.wallets/zkool-counter/zkool.pid" "$ROOT/.wallets/zkool-counter" \
  "$ROOT/.tools/zkool/zkool_graphql" -d counter.db -p 8010 --bind-address 127.0.0.1 -l https://testnet.zec.rocks:443 -C 1 --allow-unauthenticated --allow-unencrypted-database
if ! grep -q "^BITREFILL_API_KEY=." "$ROOT/counter/.env" 2>/dev/null; then
  start mock "$ROOT/counter/mock.pid" "$ROOT/counter" npx tsx src/mock-bitrefill.ts
fi
start cosigner "$ROOT/.wallets/frost/cosigner.pid" "$ROOT/.wallets/frost" \
  "$ROOT/cosigner/target/release/ironclad-cosigner" cosign-daemon --as 2 --dir session --policy "$ROOT/policy/example-policy.json" --ledger ledger.jsonl
start counter "$ROOT/counter/counter.pid" "$ROOT/counter" ./run-counter.sh
start dashboard "$ROOT/counter/dashboard.pid" "$ROOT/counter" ./run-dashboard.sh
