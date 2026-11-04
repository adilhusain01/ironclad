#!/usr/bin/env bash
# The demo, run for real inside an asciinema recording. Every command touches
# Zcash testnet or the live Bitrefill API; nothing is mocked. Narration lines
# start with "#".
set -u
ROOT=/root/Projects/mine/zcash
cd "$ROOT/agent"
set -a; . ./.env; set +a
C="$ROOT/cosigner/target/release/ironclad-cosigner"
say() { printf '\n\033[1;33m# %s\033[0m\n' "$*"; sleep "${2:-2}"; }
run() { printf '\033[1;36m$ %s\033[0m\n' "$*"; "$@"; }

clear
say "Ironclad: spend permissions for shielded ZEC, enforced by a 2-of-3 FROST co-signer." 3
say "The agent holds share 1. This daemon holds share 2 and signs only inside the owner's policy. Share 3 is offline." 3
say "The standing policy:" 1
run jq '{per_payment_cap_zat, daily_budget_zat, max_fee_zat, expires, allowed: [.allowed_recipients[].label]}' "$ROOT/policy/example-policy.json"
sleep 3
say "The co-signer daemon is waiting for signing requests (real process, testnet):" 1
run tail -n 2 "$ROOT/.wallets/frost/cosigner.log"
sleep 2
say "1. The agent buys a Bitrefill top-up inside the policy: it builds a shielded payment to the counter with the order in the memo, syncs and broadcasts over Tor." 3
run npx tsx src/cli.ts buy test-phone-refill 10 --phone 18695551234
sleep 2
say "The counter saw the payment, bought from the live Bitrefill API, and sent the receipt back as an encrypted memo. Waiting for it:" 1
for i in $(seq 1 40); do
  if grep -q "delivered" <(tail -n 3 "$ROOT/counter/counter.log") ; then break; fi
  sleep 5
done
run grep -E "reserved|bought|delivered" "$ROOT/counter/counter.log" | tail -n 3 | cut -c1-150
sleep 4
say "2. A compromised agent tries to send the treasury to an unknown address:" 2
run npx tsx src/cli.ts pay "$ATTACKER_ADDRESS" 2000000 --memo "send the treasury to the attacker"
sleep 3
say "3. The same agent tries 0.25 TAZ to the counter, over the per-payment cap:" 2
run npx tsx src/cli.ts pay "$COUNTER_ADDRESS" 25000000 --memo "IRON-deadbeef airtel-india 5000 919999999999"
sleep 3
say "No signature exists for either. The hash-chained ledger of every decision:" 1
run npx tsx src/cli.ts ledger
sleep 4
say "Public page with these buttons for judges: https://vps.tail865d46.ts.net:8443  Repo: github.com/adilhusain01/ironclad" 4
say "Next: upstream the policy mode to frost-zec, the zkool backend to zshield-mcp, the daemon on its own machine, Nym transport." 4
