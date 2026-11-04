#!/usr/bin/env bash
# Starts every Ironclad service on the VPS after a reboot or a crash:
# zkool_graphql (the counter's wallet), the mock Bitrefill (dev only), the counter,
# the policy co-signer daemon and the public dashboard. Safe to run twice.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH=/root/.cargo/bin:$PATH

start() { # name, pattern that finds the running process, dir, command...
  # A pid file is not enough: setsid can fork, so the recorded pid is not the service's. Look for the
  # process itself, so running this twice never starts a second co-signer on the same session folder.
  local name=$1 pattern=$2 dir=$3; shift 3
  if pgrep -f -- "$pattern" >/dev/null; then echo "$name: running ($(pgrep -f -- "$pattern" | head -1))"; return; fi
  (cd "$dir" && setsid nohup "$@" >> "$name.log" 2>&1 < /dev/null &)
  sleep 1; echo "$name: started ($(pgrep -f -- "$pattern" | head -1))"
}

start zkool "zkool_graphql -d counter.db" "$ROOT/.wallets/zkool-counter" \
  "$ROOT/.tools/zkool/zkool_graphql" -d counter.db -p 8010 --bind-address 127.0.0.1 -l https://testnet.zec.rocks:443 -C 1 --allow-unauthenticated --allow-unencrypted-database
if ! grep -q "^BITREFILL_API_KEY=." "$ROOT/counter/.env" 2>/dev/null; then
  start mock "src/mock-bitrefill.ts" "$ROOT/counter" npx tsx src/mock-bitrefill.ts
fi
start cosigner "ironclad-cosigner cosign-daemon" "$ROOT/.wallets/frost" \
  "$ROOT/cosigner/target/release/ironclad-cosigner" cosign-daemon --as 2 --dir session --policy "$ROOT/policy/example-policy.json" --ledger ledger.jsonl
start counter "tsx src/main.ts" "$ROOT/counter" ./run-counter.sh
# The dashboard runs the agent, and zcash-devtool needs a terminal (it opens /dev/tty), so it lives in a
# detached screen rather than under nohup.
if pgrep -f -- "tsx src/dashboard.ts" >/dev/null; then echo "dashboard: running"; else
  (cd "$ROOT/counter" && screen -dmS ironclad-dashboard bash -c "./run-dashboard.sh >> dashboard.log 2>&1"); echo "dashboard: started in screen ironclad-dashboard"
fi
