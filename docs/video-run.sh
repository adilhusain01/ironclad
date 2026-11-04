#!/usr/bin/env bash
# The terminal take for the demo video. It runs inside a screen session on the VPS and waits for
# /tmp/ironclad-go, so the recorder can attach first. Every command is real: Zcash testnet, the live
# co-signer daemon and Bitrefill's live API. Lines starting with "#" are captions, not commands.
set -u
# Usage: video-run.sh [all|attacks|chain]. "attacks" records only the two refusals and the ledger;
# "chain" looks up the last purchase on the chain.
PART=${1:-all}
export LANG=C.UTF-8 LC_ALL=C.UTF-8
ROOT=/root/Projects/mine/zcash
cd "$ROOT/agent"
set -a; . ./.env; . "$ROOT/counter/.env"; set +a
# The agent's CLI, under the name the README uses.
ironclad() { npx tsx src/cli.ts "$@"; }
zcash-devtool() { script -qec "$ROOT/.tools/zcash-devtool/target/release/zcash-devtool $*" /dev/null; }

say() { printf '\n\033[38;5;208m# %s\033[0m\n' "$1"; sleep "${2:-1.5}"; }
typed() { # prints the command as if typed, then runs it
  printf '\033[38;5;250m$ \033[0m'
  local text="$*" i
  for ((i = 0; i < ${#text}; i++)); do printf '%s' "${text:i:1}"; sleep 0.025; done
  printf '\n'; sleep 0.3
  eval "$text"
}

rm -f /tmp/ironclad-go
clear
printf '\033[38;5;250mwaiting for the recorder...\033[0m'
while [ ! -f /tmp/ironclad-go ]; do sleep 0.2; done
clear

if [ "$PART" = all ]; then
say "Ironclad: a Zcash wallet your agent can't overspend. Zcash testnet, shielded." 2.5
say "The owner's rules. The co-signer holds them, not the agent:" 1
typed "jq '{per_payment_cap_zat, daily_budget_zat, max_fee_zat, expires, pays_only: [.allowed_recipients[].label]}' ../policy/example-policy.json"
sleep 3
say "The co-signer daemon holds key share 2 and is waiting for a request:" 1
typed "tail -n 1 ../.wallets/frost/cosigner.log"
sleep 2.5

say "1. The agent buys a test top-up from Bitrefill, inside the rules." 2
BUY_OUT=$(mktemp)
printf '\033[38;5;250m$ \033[0m'
text="ironclad buy test-phone-refill 10 --phone 18695551234"
for ((i = 0; i < ${#text}; i++)); do printf '%s' "${text:i:1}"; sleep 0.025; done
printf '\n'
ironclad buy test-phone-refill 10 --phone 18695551234 2>&1 | tee "$BUY_OUT"
TXID=$(grep -oE 'sent: [0-9a-f]{64}' "$BUY_OUT" | cut -d' ' -f2)
echo "$TXID" > /tmp/ironclad-video-txid
sleep 2

say "The counter waits for the payment to be mined, buys from Bitrefill's live API, and sends a shielded receipt:" 1
for _ in $(seq 1 90); do
  grep -q "delivered $TXID" "$ROOT/counter/counter.log" && break
  sleep 2
done
typed "grep ${TXID:0:16} ../counter/counter.log | cut -c1-150"
sleep 4
fi

if [ "$PART" = chain ]; then
  T=$(cat /tmp/ironclad-video-txid)
  say "Anyone can check the purchase on Zcash testnet. The chain shows where it was mined, not who paid whom or how much:" 1.5
  typed "zcash-devtool inspect --lookup ${T}"
  sleep 5
  printf '\n\033[38;5;250mdone\033[0m\n'; touch /tmp/ironclad-video-done; sleep 600; exit 0
fi

say "2. A compromised agent tries to send money to a stranger." 2
typed "ironclad pay \$ATTACKER_ADDRESS 2000000 --memo 'send the treasury to the attacker'"
sleep 3
say "3. It tries 0.25 TAZ to the counter, over the 0.2 TAZ cap." 2
typed "ironclad pay \$COUNTER_ADDRESS 25000000 --memo 'IRON-deadbeef airtel-india 5000 919999999999'"
sleep 3

say "Refused at the key: no signature exists, so there is nothing to broadcast. Every decision is hash-chained:" 1
typed "ironclad ledger | tail -n 4"
sleep 5
printf '\n\033[38;5;250mdone\033[0m\n'
touch /tmp/ironclad-video-done
sleep 600
