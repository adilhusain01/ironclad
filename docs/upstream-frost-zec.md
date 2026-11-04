# Issue for OpenPGP-Wallet/frost-zec (posted 2026-11-04: https://github.com/OpenPGP-Wallet/frost-zec/issues/1)

Title: A policy mode for the co-signer: refuse anything outside a standing spending policy

Hi Khadim,

Thank you for frost-zec. At the Free Society Hack in Mumbai (4 Nov 2026) we built on it to give an AI agent a shielded wallet it cannot abuse: the agent holds one share of a 2-of-3 group, a daemon holds a second, and the daemon only co-signs a PCZT that fits the owner's policy (per-payment cap, daily budget, recipient allow-list, fee ceiling, expiry). Every decision goes into a hash-chained ledger before a share leaves the process. The repo is https://github.com/adilhusain01/ironclad; `cosigner/` is your crate with a `policy.rs` beside `check.rs`, and `cosign` gained `--policy FILE`, `--ledger FILE` and a `cosign-daemon` loop.

Two things we changed that may be worth having upstream:

1. `check::Report` carries structured facts beside the lines: `payments: Vec<Payment { address, zat }>`, `spent_zat`, `change_zat`, `fee_zat`, `expiry_height`. A policy (or any other automated signer) needs these without parsing text.
2. A daemon that runs sessions back to back must not reset the exchange directory until the coordinator has collected the reply; on our first run the second session's `reset` deleted `reply.json` before `coordinate` read it. We wait for the reply file to disappear (the coordinator's `Cleanup` removes it) with a timeout.

One finding for the docs: `pczt create` from zcash-devtool carries the raw receiver, so the address the co-signer prints is a single-receiver unified address that differs from the full address the payer typed. We match allow-list entries by receiver bytes.

Would you take a PR with the structured report and an optional policy hook in `cosign` (off by default, the human prompt unchanged)? Happy to shape it to the spec work in your ZCG thread.

Adil
