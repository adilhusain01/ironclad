# Reply in the forum thread "What are you building on Zcash?", posted by Adil on 4 Nov 2026: https://forum.zcashcommunity.com/t/what-are-you-building-on-zcash/55172/49

The forum blocks links from new accounts, so the posted version writes the addresses as code; the text is otherwise the one below.

Built at the Free Society Hack in Mumbai on 4 November: **Ironclad**, spend permissions for shielded ZEC.

An AI agent gets one share of a 2-of-3 FROST group on Ironwood. A policy daemon holds the second share and only co-signs PCZTs that fit the owner's standing policy: a per-payment cap, a daily budget, a recipient allow-list, a fee ceiling and an expiry. A payment outside the policy can't be signed at all, whatever the agent is told, and every decision goes into a hash-chained ledger. The owner keeps the third share offline for recovery.

The agent uses it to buy phone top-ups through Bitrefill. A co-signed shielded payment carries the order in its memo, and a counter buys the product through Bitrefill's live API (its test top-up, for the demo) and sends a shielded receipt back.

It builds on Khadim's frost-zec co-signer, thank you, and zcash-devtool's PCZT flow. Testnet proof: a 2-of-3 spend co-signed by the daemon, `82457796b6d92643d6cfcade47716789a3c1ee72c9ebc77c27ccca592365e26a`, plus refusals of an over-cap payment and an unknown recipient at the key.

- Repo: https://github.com/adilhusain01/ironclad
- Demo (2:49): https://youtu.be/8QMsMO8Dx6E
- Upstream: a policy mode proposed to frost-zec (https://github.com/OpenPGP-Wallet/frost-zec/issues/1) and a real testnet backend for zshield-mcp (https://github.com/Steeve-Crypto/zshield-mcp/pull/4)

Feedback on the policy format is welcome. A shared spec would let any wallet's co-signer enforce the same instruction.
