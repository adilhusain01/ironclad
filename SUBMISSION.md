# Stadium submission

Submitted by Adil on Stadium (https://stadium.joinwebzero.com/programs/free-society-hack-2026) on 4 Nov 2026, before the 20:00 IST finalize deadline, for both tracks. Stadium's txid check marked the testnet transaction verified at 20:06 IST. The sections below are the values as saved there, checked against Stadium's public API at about 21:30 IST.

## Description (max 500 characters)

Ironclad gives an AI agent a shielded Zcash wallet it can't overspend. The wallet is a 2-of-3 FROST group: the agent holds one key share, a policy co-signer holds another, and the owner keeps the third offline. The co-signer only signs payments inside the owner's rules (per-payment cap, daily budget, allowed recipients), so a prompt-injected agent can't move money outside them. The agent buys top-ups through Bitrefill's live API (a test top-up in the demo), with shielded memos.

(482 characters)

## Track

Both.

## Themes (Privacy)

1. Private payment rails · 3. Privacy beyond the transaction

## One-line pitch (max 140 characters)

Spend permissions for shielded ZEC: a FROST co-signer that refuses any agent payment outside the owner's policy, buying Bitrefill top-ups.

(138 characters)

## Project type

agent

## Public URL

https://vps.tail865d46.ts.net:8443

## Demo video

URL: https://youtu.be/8QMsMO8Dx6E (2:49, recorded live in a terminal against Zcash testnet and Bitrefill's API, with voiceover and captions). The first recording, 2:29, is still at https://vps.tail865d46.ts.net:8443/demo.mp4.

## Technologies (comma separated)

zcash-devtool, zkool_graphql, frost-zec (reddsa, frost-rerandomized), orchard, pczt, zcash_address, Rust, Node 24, TypeScript, Bitrefill REST v2, @bitrefill/cli, @modelcontextprotocol/sdk, Tailscale Funnel, testnet.zec.rocks, Fauzec

## Testnet transaction id

82457796b6d92643d6cfcade47716789a3c1ee72c9ebc77c27ccca592365e26a

## Viewing key (optional, judges only)

The group wallet's UFVK and birth height 4581180: run `ironclad-cosigner info` in `.wallets/frost` on the VPS, or ask Adil. It reveals the group's whole history (five or six test transactions) and cannot spend.

## Privacy and trust note (max 3000 characters)

1. What stays private: the agent's payments are shielded Ironwood transactions (sender, receiver, amount hidden; order memo encrypted). The policy co-signer sees only the transactions it is asked to sign. The counter's receipt memo (gift code) is shielded too.
2. What the app reveals, to whom: the agent's wallet syncs and broadcasts through zcash-devtool's built-in Tor client, so the light wallet server (testnet.zec.rocks) sees a Tor exit and connection timing, not the agent's address; it sees the counter wallet's address directly (clearnet today). The daemon makes no network connections. Everything runs on one VPS today. The counter holds a Bitrefill API key and a hot key for a small float; it sees every order memo (product, value, phone number) and stores txids, memos and invoice ids. Bitrefill sees the product, the phone number and the counter's account. The public dashboard shows the policy, the ledger and the counter's orders to anyone (demo phone number is a test value). No AI model provider is in the loop for the CLI; if an LLM drives the MCP server, that provider sees the requests.
3. Who users must trust: us as the operator of the counter and the dashboard; the light wallet server; Bitrefill; the host that runs the co-signer daemon (a compromised daemon host plus a compromised agent reach the 2-of-3 threshold, which is why the owner's share stays offline and why the daemon should run on a separate machine from the agent in production; here both run on one VPS).
4. What we'd fix next: daemon on a separate machine or secure element; Nym mixnet in place of Tor for the agent (we built nym-proxy and tried it; the exit never reached testnet.zec.rocks, see FEEDBACK.md); the counter wallet behind Tor too; memo rules checked inside the co-signer rather than only at the counter; publish the ledger's chain head to the owner.

## Next milestone (30 days) and links

Upstream the policy co-signer mode to frost-zec and offer it as the real chain layer behind zshield-mcp's `zcash_pay`; run one household top-up policy for a month on testnet. Links: https://github.com/adilhusain01/ironclad (this repo), the zshield-mcp PR (add the link after pushing the `zkool-backend` branch, see `docs/upstream-zshield-mcp.md`), the frost-zec issue proposing the policy mode (https://github.com/OpenPGP-Wallet/frost-zec/issues/1), zshield-mcp issue #3 (Steeve's "Phase 1 tools and hardening"), frost-zec's ZCG thread (forum 58172). Add the forum post link once posted.

## Feedback for the Zcash teams (optional)

Paste `FEEDBACK.md` sections Faucet, SDK or wallet tool, Docs.

## Bitrefill feedback

What worked: the llms.txt brief's REST field names were exact; `@bitrefill/cli` gave the Indian catalog and prices without an account in one command; `payment_method: "balance"` plus `auto_pay: true` makes a one-call purchase that an agent can reason about.

What didn't: no API key or event credits before the venue, so the counter was built against a mock of REST v2 (same shapes) and the first real purchase waited; test products are hidden until enabled per account, which a new account cannot do itself; `webhook_url` is missing from the OpenAPI the Docs MCP serves; the daily cap of 5 top-ups per account makes a public demo page risky, so the page buys the free test product only. Bitrefill does not accept ZEC, which is the whole reason the counter exists: a native shielded-ZEC method (or an x402 facilitator that takes ZEC) would remove our counter entirely.

## Guardrails (Agentic Commerce checklist)

The agent can spend at most 0.2 TAZ per payment and 0.5 TAZ per UTC day, only to the counter's address; the counter buys at most $6 per order and 20 orders per day, only products on its list, one purchase per txid. Above any of these: the co-signer refuses (no signature exists), or the counter refuses; the owner's third share can approve an exception by hand.

## Which parts are for which track

Privacy: the FROST group, the policy co-signer and ledger, the agent CLI, shielded order and receipt memos, the dashboard. Agentic Commerce: the counter's Bitrefill REST loop, guardrails, the MCP server, the buy command. Shared: trust note and FEEDBACK.md.

## Bitrefill touchpoints (built vs reused)

Reused: `@bitrefill/cli` for catalog and prices; the REST v2 shapes from the brief and docs. Built: the REST client with 429 backoff and final-state polling (`counter/src/bitrefill.ts`), the local mock, the order store with reservation, the MCP server that wraps search, quote and buy under the policy.

## Real purchase invoice id

f547c32c-3f91-40e8-a541-1483653bf049, the purchase in the demo video (test-phone-refill through the full loop; shielded payment 9b46cda814382b444dc963ef5000ed3db6b70c83ed1f62bbd571c89364305974, mined in block 4,582,029). Earlier one: 57eeb022-02b6-4fd8-b60c-b15af9610e64 (shielded payment 67c238aedf77ac1887a14400768f220a6ca2c2514f7063622493770b43f6408c, receipt memo 8c7f4d5380be3b0f808c89b26c67e100d0ff90939b8836017e14e805577067a0). No paid Airtel top-up: no event credits reached the account.

## Links to anything already started

https://github.com/OpenPGP-Wallet/frost-zec/issues/1
https://github.com/Steeve-Crypto/zshield-mcp/pull/4
https://forum.zcashcommunity.com/t/what-are-you-building-on-zcash/55172/49

## Demo day contact

Given on Stadium (not shown publicly).
