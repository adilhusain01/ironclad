# Ironclad: spend permissions for shielded ZEC, enforced by a threshold co-signer

Give an AI agent a Zcash wallet it cannot abuse. The wallet is a 2-of-3 FROST group on the Ironwood pool: the agent holds one share, a policy co-signer daemon holds one, the owner holds the third. The daemon only contributes its signature share to a transaction that fits the owner's standing policy (per-payment cap, daily budget, recipient allow-list, fee ceiling, expiry). A payment outside the policy is not "blocked by software"; it cannot be signed at all, whatever the agent is told. The agent uses this to buy Indian phone top-ups and gift cards from Bitrefill: a co-signed shielded payment to the counter carries the order memo, the counter buys the product with its Bitrefill balance, and gift codes come back as an encrypted memo.

Built at the Free Society Hack, Mumbai, 4 November 2026. Privacy track (themes 1 and 3) and Agentic Commerce track (lanes 1 and 5). Testnet only.

## Who it's for and the problem

- Agent builders who want to let an agent spend shielded ZEC. Every existing agent-payment project on Zcash enforces its spending policy in application code in front of a single-key wallet (zshield-mcp, Kage, ZecAgent, Zipher): whoever controls the host controls the money. Bitrefill's own agent safeguards say the same thing from the other side: "the skill is not a wallet, never give an agent wallet seeds". The gap is a wallet that can be handed to an agent safely.
- Households and small groups who want a standing instruction ("keep these two phones topped up, up to this much a day") enforced by the key, not by trust in a process.
- Related work by a mentor here: Drongo Labs' Swaraj checks every AI agent action against a declared policy before it runs and issues proof-backed receipts; Ironclad is the same idea applied to the money itself, at the key. Evidence this is wanted: the event brief lists "an agent wallet with a spending cap" and "a 2-of-3 shared treasury" as wanted shapes; zshield-mcp's maintainer (a mentor here) has an open issue for a real chain layer behind its policy; the Zcash Foundation's 2026 priorities name FROST; the organisers' Lane 1 examples are "spend firewall" and "signed agent receipts". Zcash has no contracts, so a policy inside a threshold co-signer is the shielded equivalent of EVM spend permissions and session keys.

## Demo

- Demo video (2:29, a real terminal recording of the flow, idle time compressed): https://vps.tail865d46.ts.net:8443/demo.mp4, also  in this repo (source recording )
- Public URL: https://vps.tail865d46.ts.net:8443 (the judge presses three buttons: an in-policy purchase, an over-cap attempt, an unknown recipient; the ledger and the counter's orders update on the page)
- Testnet transaction, a 2-of-3 FROST spend co-signed by the policy daemon: `82457796b6d92643d6cfcade47716789a3c1ee72c9ebc77c27ccca592365e26a` ([explorer](https://zexplorer.app/testnet/tx/82457796b6d92643d6cfcade47716789a3c1ee72c9ebc77c27ccca592365e26a))
- A purchase whose sync and broadcast went through Tor: `1cbec807f17289bf99254581c051fce9d62bf4ac182b33ec41820c3c7605f4ab`
- The counter's receipt memo for that order, sent back shielded: `a270bba044160af3be3eac15f66906d74d8942b5829b700707cc97085fe4c6e0`
- Group address (view it with the viewing key given on Stadium): `utest17rlcf2nujuu0yyczsq4vaeur7c6v7tqez3hqru22z3xq6d3ng6dysseqy8dr4d6q2k8re3rzuvewy5jvvcm8a2t0cgszkna3wcmr5hs7`
- Real Bitrefill purchase through the whole loop (agent, co-signer, shielded payment `67c238aedf77ac1887a14400768f220a6ca2c2514f7063622493770b43f6408c`, counter, Bitrefill REST v2, receipt memo `8c7f4d5380be3b0f808c89b26c67e100d0ff90939b8836017e14e805577067a0`): invoice id `57eeb022-02b6-4fd8-b60c-b15af9610e64` (the free `test-phone-refill` product, delivered). A paid Airtel top-up follows once the event credits are on the account.

## Which parts are for which track

- Privacy track (themes 1 and 3): the FROST group, the policy co-signer daemon and its ledger, the agent CLI, the counter's shielded order and receipt memos, the dashboard. All on Zcash testnet.
- Agentic Commerce track (lanes 1 and 5): the counter's Bitrefill REST client and purchase loop, the guardrails, the MCP server that lets any agent host shop through the policy, the agent's buy command.
- Shared: the trust note and FEEDBACK.md.

## Run it (under 15 minutes)

Rust and Node 24 are needed. Everything runs on Zcash testnet.

```bash
git clone https://github.com/adilhusain01/ironclad && cd ironclad
# 1. tools (about 20 minutes of compiling the first time)
mkdir -p .tools && git clone --depth 1 https://github.com/zcash/zcash-devtool.git .tools/zcash-devtool
(cd .tools/zcash-devtool && cargo build --release --all-features)
(cd cosigner && cargo build --release && cargo test --release)
# 2. make the 2-of-3 group (DKG runs offline in seconds) and a view-only wallet for it
mkdir -p .wallets/frost && cd .wallets/frost && ../../cosigner/target/release/ironclad-cosigner keygen --network test && ../../cosigner/target/release/ironclad-cosigner info && cd ../..
.tools/zcash-devtool/target/release/zcash-devtool wallet -w .wallets/group init-fvk --name group --fvk <viewing key from info> --birthday <current height> -s zecrocks
# 3. fund the group address from any testnet wallet (faucet: https://fauzec.com), then sync
.tools/zcash-devtool/target/release/zcash-devtool wallet -w .wallets/group sync -s zecrocks
# 4. write policy/example-policy.json: caps, budget, the counter's address
# 5. start the co-signer daemon (share 2), the counter and the dashboard
(cd .wallets/frost && ../../cosigner/target/release/ironclad-cosigner cosign-daemon --as 2 --dir session --policy ../../policy/example-policy.json --ledger ledger.jsonl)
(cd counter && npm i && cp .env.example .env && npm run mock & ./run-counter.sh)   # mock Bitrefill, or set BITREFILL_API_KEY and BITREFILL_BASE_URL
(cd agent && npm i && cp .env.example .env)
# 6. the agent (share 1) buys inside the policy
cd agent && npx tsx src/cli.ts buy test-phone-refill 10 --phone 919999999999
npx tsx src/cli.ts pay <any other address> 2000000     # refused: not on the allow-list
npx tsx src/cli.ts ledger
```

An MCP server for Claude Desktop, Cursor or Claude Code: `agent/src/mcp.ts` (tools `search_products`, `quote`, `buy`, `ledger`, `policy`).

## How it works (core flow)

1. **Keys.** `ironclad-cosigner keygen` runs the FROST DKG (reddsa, re-randomized FROST over RedPallas, ZIP 312; keys derived as ZIP 2005 specifies) and saves three shares. Nobody ever holds the full spend authorizing key. The group's unified viewing key goes into a view-only zcash-devtool wallet.
2. **Propose.** The agent (`agent/src/cli.ts`, share 1) asks zcash-devtool to build a PCZT from the view-only wallet (`pczt create`, with the order memo) and prove it (`pczt prove`).
3. **Co-sign under policy.** The daemon (`cosigner`, share 2) opens a session with fresh nonce commitments before it sees the transaction, then verifies the proven PCZT on its own: value commitments, nullifiers, randomized keys, output note commitments, the ZIP 374 dummy-key check, witnesses against the anchor, expiry. That verification is frost-zec's (MIT, vendored in `cosigner/`, see `cosigner/LICENSE-frost-zec`). Ironclad adds `policy.rs`: the recipient must be on the allow-list (matched by receiver, so a full unified address covers the single receiver the PCZT reveals), the amount under the per-payment cap, the day's total under the daily budget, the fee under the ceiling, the policy not expired. Every decision (policy hash, payments, fee, allow or refuse, reason) is appended to a hash-chained JSONL ledger before the signature share leaves the process. A refused request gets a refusal with the reason and no share.
4. **Aggregate and send.** The agent aggregates both shares, verifies each signature under its randomized key, and broadcasts with `pczt send`. The owner's share 3 is never online; with the daemon it recovers the funds if the agent is lost, and with the agent it can override the daemon.
5. **Fulfil.** The counter (`counter/`, Node) watches its own address through zkool_graphql, waits one confirmation, reserves the txid before any call, buys from Bitrefill REST v2 (`POST /invoices` with `payment_method: "balance"`, `auto_pay: true`), polls `GET /invoices/{id}` and `GET /orders/{id}` to `delivered`, handles 429, failed orders and out-of-stock, and sends a receipt memo back to the payer (gift codes travel inside it; top-ups land on the phone).

Manual steps: none in the core flow. The owner's approval of an over-policy payment (share 3) is a CLI step by design and is not part of the demonstrated flow.

## Privacy and trust note

1. **What stays private.** The agent's payments are shielded Ironwood transactions: sender, receiver and amount are hidden on chain, the order memo is encrypted. The policy co-signer sees only the transactions it is asked to sign. The counter's receipt memo is shielded too, so a gift code never sits in email, logs or a database in the clear.
2. **What the app reveals, and to whom.** The agent's wallet syncs and broadcasts through zcash-devtool's built-in Tor client, so the light wallet server (testnet.zec.rocks) sees a Tor exit, not the agent's address; it still sees the timing of those connections, and it sees the counter wallet's address directly (zkool_graphql, clearnet today). The daemon makes no network connections of its own. Everything runs on one VPS today. The counter holds a Bitrefill API key and a hot spending key for a small float; it sees every order memo (product, value, phone number) and stores txids, memos and invoice ids in `orders.json`. Bitrefill sees the product, the phone number and the counter's account. The dashboard shows the policy, the ledger and the counter's orders to anyone; the demo phone number is a test value. No AI model provider is in the loop: the agent CLI is deterministic; if an LLM drives it through MCP, that provider sees the user's requests.
3. **Who users must trust.** Us as the operator of the counter and the dashboard; the light wallet server; Bitrefill; the host that runs the co-signer daemon (a compromised daemon host plus a compromised agent would reach the 2-of-3 threshold, which is why share 3 stays offline and why the daemon should run on a different machine from the agent in production; here both run on one VPS and we say so).
4. **What we'd fix next.** Run the daemon on a separate machine or secure element; move the agent's transport from Tor to the Nym mixnet (we built zingolib's `nym-proxy` and pointed zcash-devtool's `--connection socks5://` at it; the mixnet exit never completed a connection to testnet.zec.rocks, which looks like the exit's allow-list, so Nym credits for the dVPN or an allow-list entry is the next step, details in FEEDBACK.md); put the counter's wallet behind Tor as well; check the order memo inside the co-signer (the PCZT carries the memo plaintext; today the memo rules live in the counter); publish the ledger's chain head to the owner so a deleted ledger is noticed.

## Technologies used

- Zcash testnet (NU7, Ironwood pool), unified addresses, PCZT (ZIP 374), ZIP 317 fees, ZIP 321 memos
- FROST: reddsa 0.5.2 (frost-rerandomized 3.0), orchard 0.16 with `unstable-frost`, pczt 0.10, zcash_address 0.14, zcash_primitives 0.31 (via frost-zec, MIT, vendored and extended)
- zcash-devtool (Oct 2026, built from `main`): view-only wallet, PCZT create, prove, send; its built-in Tor client (arti) for the agent's sync and broadcast
- zkool_graphql 6.36 (release binary): the counter's wallet server
- Bitrefill REST v2 (`@bitrefill/cli` 0.3.0 for the catalog; the REST client in `counter/src/bitrefill.ts`; a local mock with the same shapes)
- Node 24, TypeScript 5, vitest, @modelcontextprotocol/sdk
- Rust 1.99, Fauzec testnet faucet, zexplorer.app

## Next 30 days

- Upstream the policy hook to frost-zec as an optional co-signer mode (issue opened on 4 Nov: https://github.com/OpenPGP-Wallet/frost-zec/issues/1).
- zshield-mcp: a ready branch adds a zkool_graphql testnet backend (its maintainer's listed good first issue), with tests; the PR text is in `docs/upstream-zshield-mcp.md`. Next, an adapter that routes its `zcash_pay` through the Ironclad co-signer.
- Memo rules inside the co-signer; a second-machine deployment; the Nym transport for the daemon.
- Pilot: a household top-up policy running for a month on testnet, then mainnet with a tiny budget once FROST keys for Ironwood have a published spec (Khadim's and Zafe's shared backup format thread).

## Feedback

See `FEEDBACK.md`.
