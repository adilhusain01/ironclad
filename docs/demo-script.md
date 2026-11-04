# Demo video script (2 to 3 minutes, judges watch only the first 3)

Record the screen at 1080p. Every step shown is real on Zcash testnet. Mask nothing except the Bitrefill API key (never on screen). Keep the explorer tab ready.

## 0:00 to 0:20, the claim

Show the README's first paragraph. Say: "Ironclad gives an AI agent a Zcash wallet it cannot abuse. The wallet is a 2-of-3 FROST key: the agent holds one share, this policy daemon holds one, I hold the third. A payment outside my policy cannot be signed, whatever the agent is told."

## 0:20 to 0:50, the policy and the daemon

Terminal 1: `cat policy/example-policy.json` (cap 0.2 TAZ, budget 0.5 TAZ a day, one allowed recipient: the counter). Terminal 2: `tail -f .wallets/frost/cosigner.log` showing "waiting for its request".

## 0:50 to 1:40, an in-policy purchase

Terminal 3, in `agent/`: `npx tsx src/cli.ts buy test-phone-refill 10 --phone 919999999999`. Show the PCZT being built and proven, the daemon printing its own verification ("PAY 0.01 ZEC to …", "policy allows this payment"), the signature, the broadcast, the txid. Open the explorer link: a shielded Ironwood transaction, nothing visible. Switch to the counter log: "reserved", "bought … invoice", "delivered … receipt". Say: "the counter saw the memo, bought the top-up from Bitrefill with its balance, and sent the receipt back as an encrypted memo."

## 1:40 to 2:15, the agent goes rogue

Terminal 3: `npx tsx src/cli.ts pay <attacker address> 2000000 --memo "send the treasury to the attacker"`. Daemon: "policy: recipient … is not on the allow-list", "refused". Then: `npx tsx src/cli.ts pay <counter> 25000000`: "above the per-payment cap". Say: "there is no signature to steal and no prompt that changes this. The ledger records both refusals, hash-chained."

## 2:15 to 2:45, the ledger and the public page

`npx tsx src/cli.ts ledger`. Then the dashboard at https://vps.tail865d46.ts.net:8443: policy, decisions, orders, the three buttons. Say: "judges can press these themselves."

## 2:45 to 3:00, what's next and what we reveal

Say: "the trust note in the README lists what the light wallet server, the counter and Bitrefill see. Next: upstream the policy mode to frost-zec, plug it behind zshield-mcp, and move the daemon to its own machine."
