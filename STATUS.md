# Ironclad status

Updated 2026-11-04 14:05 IST (VPS session).

## Done
- The agent's sync and broadcast go through zcash-devtool's built-in Tor (`DEVTOOL_CONNECTION=tor`); purchase over Tor mined: `1cbec807f17289bf99254581c051fce9d62bf4ac182b33ec41820c3c7605f4ab`. Nym: nym-proxy built and tried, the exit never reached testnet.zec.rocks (FEEDBACK.md); ask Max whether a credit or an allow-list entry fixes it.
- Builder Pack sub-pages read in full; README and SUBMISSION say which parts belong to which track; Drongo Labs' Swaraj noted as related work (talk to ZKryptosaurus at the venue).
- Refusals proven on testnet: an unknown recipient and an over-cap payment are refused at the key (ledger entries `refuse`, no broadcast).
- Public dashboard live at https://vps.tail865d46.ts.net:8443 (Tailscale Funnel on 8443) with three judge buttons.
- MCP server for Claude Desktop or Cursor (`agent/src/mcp.ts`), README with the trust note, SUBMISSION.md, FEEDBACK.md, draft upstream issue for frost-zec.
- FROST is the product: DKG (frost-zec), view-only group wallet in zcash-devtool, PCZT create and prove, policy co-signer daemon signs inside policy, 2-of-3 spend mined on testnet.
- Counter detects order memos, reserves per txid, buys from the (mock) Bitrefill REST API.
- Repo created, builds of zcash-devtool and frost-zec started on the VPS.
- zkool_graphql running on testnet with two accounts (counter, dev), both funded by the Fauzec faucet.
- First shielded testnet payment with an order memo sent and seen.

## In progress
- Tooling builds.

## Blocked or needs Adil
- Push the ready zshield-mcp branch (Steeve's good first issue, a zkool_graphql backend with tests): commands in `docs/upstream-zshield-mcp.md`. This is the strongest Continuing evidence; link the PR in the next-milestone field.
- Switch the counter to the real Bitrefill once you have the key: put `BITREFILL_API_KEY=...` and `BITREFILL_BASE_URL=https://api.bitrefill.com/v2` in `counter/.env`, kill the counter (`kill $(cat counter/counter.pid)`), run `scripts/start-all.sh`; then one real purchase: `cd agent && npx tsx src/cli.ts buy airtel-india 10 --phone 91<your number>`; record the invoice id from `counter/orders.json` in README.md and SUBMISSION.md.
- All three judge buttons on the public page were verified through the API (buy delivered; over-cap and unknown recipient refused). The group wallet needs about ten confirmations between spends from the same note; four extra float notes are being added so several demos can run back to back.
- Post the frost-zec issue (`docs/upstream-frost-zec.md`) and a line in the forum thread "What are you building on Zcash?" (55172): public actions, Adil's call.
- Record the demo video (script in `docs/demo-script.md`).
- Make the repo public before finalizing on Stadium.
- Bitrefill API key and event credits (ask Max N, Ankush Mehta or Aamir Shaikh at the venue).
- TAZ beyond the faucet (any Zcash mentor).

## Testnet evidence
- Payment sent through the new zshield-mcp zkool backend (the ready upstream branch): `d0aad567233f0b349eac0a16fc7cbf4bb6bd70496ed2c291e2c896316824f9ca`.
- FROST 2-of-3 shielded spend from the group wallet, co-signed by the policy daemon (policy allowed, ledger entry written), broadcast with zcash-devtool: txid `82457796b6d92643d6cfcade47716789a3c1ee72c9ebc77c27ccca592365e26a`, https://zexplorer.app/testnet/tx/82457796b6d92643d6cfcade47716789a3c1ee72c9ebc77c27ccca592365e26a (2026-11-04 12:19 IST). Group address `utest17rlcf2nujuu0yyczsq4vaeur7c6v7tqez3hqru22z3xq6d3ng6dysseqy8dr4d6q2k8re3rzuvewy5jvvcm8a2t0cgszkna3wcmr5hs7`, funded by `51c3d6397ecb8d1d45d346450748d110ea09dc0d2e73028f67f29339dd3f9101`.
- Test order to the counter (mock Bitrefill bought it): `836e585f555e082cbf5d153ae530c65e17c542ae9c6cf6535613cf58c091c098`.
- First shielded testnet payment (dev wallet to the counter, memo `IRON-first001 test-phone-refill 10 919999999999`): txid `b9e0fb62485e5acaceaa0ed6d74193133c06fb78d8867cba7ca7b23611880727`, https://zexplorer.app/testnet/tx/b9e0fb62485e5acaceaa0ed6d74193133c06fb78d8867cba7ca7b23611880727 (sent 2026-11-04 12:16 IST via zkool_graphql).
- Faucet claims: 34f7afbbf9eec0f00b4b4048ff93e2d4fdb166667b5ec7642eace699c3df1c74 (counter), c629d36b517586871a22541fc66a402f8eb4e37bbaebf4310b9347c45162639a (dev).
