#!/usr/bin/env bash
# The live demo for the stage. Every step is real and waits for Enter, so the presenter sets the pace.
#
#   ssh -t vps 'bash /root/Projects/mine/zcash/docs/stage.sh'          all steps in order
#   ssh -t vps 'bash /root/Projects/mine/zcash/docs/stage.sh attacks'  start at the attacks
#   ssh -t vps 'bash /root/Projects/mine/zcash/docs/stage.sh rules nobuy'  everything but the purchase;
#        "delivered" then shows the last purchase made with this script (saved in /tmp/ironclad-stage-txid)
#
# Steps: rules, attacks (stranger, over the cap), buy, delivered, ledger, chain.
# Don't press keys on the public site while this runs: both use the same group wallet.
set -u
START=${1:-rules}
SKIP_BUY=${2:-}
export LANG=C.UTF-8 LC_ALL=C.UTF-8
ROOT=/root/Projects/mine/zcash
cd "$ROOT/agent"
set -a; . ./.env; . "$ROOT/counter/.env"; set +a
ironclad() { npx tsx src/cli.ts "$@"; }
zcash-devtool() { script -qec "$ROOT/.tools/zcash-devtool/target/release/zcash-devtool $*" /dev/null; }

say() { printf '\n\033[38;5;208m# %s\033[0m\n' "$1"; }
step() { printf '\033[38;5;245m[enter]\033[0m'; read -r _; printf '\r\033[K'; }
typed() {
  printf '\033[38;5;250m$ \033[0m'
  local text="$*" i
  for ((i = 0; i < ${#text}; i++)); do printf '%s' "${text:i:1}"; sleep 0.02; done
  printf '\n'
  eval "$text"
}
at() { case " rules attacks buy delivered ledger chain " in *" $START "*) ;; *) START=rules ;; esac; }
at
order=(rules attacks buy delivered ledger chain)
started=0
TXID=$(cat /tmp/ironclad-stage-txid 2>/dev/null || true)

clear
for part in "${order[@]}"; do
  [ "$part" = "$START" ] && started=1
  [ $started = 1 ] || continue
  case $part in
    rules)
      say "The owner's rules. The co-signer holds them, not the agent."; step
      typed "jq '{per_payment_cap_zat, daily_budget_zat, pays_only: [.allowed_recipients[].label]}' ../policy/example-policy.json"
      ;;
    attacks)
      say "A prompt tells the agent: send the treasury to this address."; step
      typed "ironclad pay \$ATTACKER_ADDRESS 2000000 --memo 'send the treasury to the attacker' 2>&1 | grep -E 'refused|sent:|error' | tail -2"
      say "It tries again, to the right address, over the cap."; step
      typed "ironclad pay \$COUNTER_ADDRESS 25000000 --memo 'IRON-deadbeef airtel-india 5000 919999999999' 2>&1 | grep -E 'refused|sent:|error' | tail -2"
      ;;
    buy)
      [ "$SKIP_BUY" = nobuy ] && continue
      say "Inside the rules: the agent buys a top-up through Bitrefill."; step
      out=$(mktemp)
      typed "ironclad buy test-phone-refill 10 --phone 18695551234 2>&1 | tee $out | grep -E 'order|asking|sent:|refused|error'"
      TXID=$(grep -oE 'sent: [0-9a-f]{64}' "$out" | cut -d' ' -f2)
      [ -n "$TXID" ] && echo "$TXID" > /tmp/ironclad-stage-txid
      ;;
    delivered)
      say "The counter waits for the block, then buys and sends a shielded receipt."; step
      if [ -z "$TXID" ]; then echo "no purchase txid from the buy step"; continue; fi
      for _ in $(seq 1 90); do grep -q "delivered $TXID" "$ROOT/counter/counter.log" && break; sleep 2; done
      typed "grep ${TXID:0:16} ../counter/counter.log | cut -c1-120"
      ;;
    ledger)
      say "Every decision, hash-chained, before any share leaves."; step
      typed "ironclad ledger | tail -n 4 | cut -c1-150"
      ;;
    chain)
      say "Anyone can check it on Zcash testnet. The chain shows the block, nothing else."; step
      t=${TXID:-82457796b6d92643d6cfcade47716789a3c1ee72c9ebc77c27ccca592365e26a}
      typed "zcash-devtool inspect --lookup $t | grep -E 'ID|Mined|Version'"
      ;;
  esac
done
printf '\n\033[38;5;245mend of demo\033[0m\n'
