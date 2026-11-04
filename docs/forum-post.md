# Draft reply for the forum thread "What are you building on Zcash?" (Adil posts it)

Building at the Free Society Hack in Mumbai today: **Ironclad**, spend permissions for shielded ZEC.

An AI agent gets one share of a 2-of-3 FROST group on Ironwood; a policy daemon holds a second share and co-signs only PCZTs that fit the owner's standing policy (per-payment cap, daily budget, recipient allow-list, fee ceiling, expiry). A payment outside the policy cannot be signed at all, whatever the agent is told; every decision lands in a hash-chained ledger. The agent uses it to buy Indian top-ups and gift cards through Bitrefill: a co-signed shielded payment carries the order memo, a counter buys the product, and the gift code comes back as an encrypted memo.

It builds on Khadim's frost-zec co-signer (thank you) and zcash-devtool's PCZT flow. Testnet proof: a 2-of-3 spend co-signed by the daemon, `82457796b6d92643d6cfcade47716789a3c1ee72c9ebc77c27ccca592365e26a`, and refusals of an over-cap payment and an unknown recipient at the key. Repo: github.com/adilhusain01/ironclad. Next: upstream the policy mode to frost-zec and offer the daemon as the chain layer behind zshield-mcp. Feedback on the policy format is welcome; a shared spec would let any wallet's co-signer enforce the same instruction.
