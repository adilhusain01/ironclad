# Stadium submission draft (Adil submits; nothing here is sent automatically)

Submit at https://stadium.joinwebzero.com/programs/free-society-hack-2026 with the Luma email. Save a draft early, submit the event feedback form, then click **Finalize and submit** by Wed 4 Nov 20:00 IST for the evening judging session. Editable until 00:00.

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

## Demo video length

(fill in; 2 to 3 minutes)

## Technologies (comma separated)

zcash-devtool, zkool_graphql, frost-zec (reddsa, frost-rerandomized), orchard, pczt, zcash_address, Rust, Node 24, TypeScript, Bitrefill REST v2, @bitrefill/cli, @modelcontextprotocol/sdk, Tailscale Funnel, testnet.zec.rocks, Fauzec

## Testnet transaction id

82457796b6d92643d6cfcade47716789a3c1ee72c9ebc77c27ccca592365e26a

## Viewing key (optional, judges only)

The group wallet's UFVK and birth height 4581180: run `ironclad-cosigner info` in `.wallets/frost` on the VPS, or ask Adil. It reveals the group's whole history (five or six test transactions) and cannot spend.

## Privacy and trust note (max 3000 characters)

1. What stays private: the agent's payments are shielded Ironwood transactions (sender, receiver, amount hidden; order memo encrypted). The policy co-signer sees only the transactions it is asked to sign. The counter's receipt memo (gift code) is shielded too.
2. What the app reveals, to whom: the light wallet server (testnet.zec.rocks) sees the IP and sync timing of the group wallet, the counter wallet and the daemon's host (all on one VPS today). The counter holds a Bitrefill API key and a hot key for a small float; it sees every order memo (product, value, phone number) and stores txids, memos and invoice ids. Bitrefill sees the product, the phone number and the counter's account. The public dashboard shows the policy, the ledger and the counter's orders to anyone (demo phone number is a test value). No AI model provider is in the loop for the CLI; if an LLM drives the MCP server, that provider sees the requests.
3. Who users must trust: us as the operator of the counter and the dashboard; the light wallet server; Bitrefill; the host that runs the co-signer daemon (a compromised daemon host plus a compromised agent reach the 2-of-3 threshold, which is why the owner's share stays offline and why the daemon should run on a separate machine from the agent in production; here both run on one VPS).
4. What we'd fix next: daemon on a separate machine or secure element; Nym transport for the daemon and the agent (zcash-devtool accepts a socks5 connection); memo rules checked inside the co-signer rather than only at the counter; publish the ledger's chain head to the owner.

## Next milestone (30 days) and links

Upstream the policy co-signer mode to frost-zec and offer it as the real chain layer behind zshield-mcp's `zcash_pay`; run one household top-up policy for a month on testnet. Links: https://github.com/adilhusain01/ironclad (this repo), the draft upstream text in `docs/upstream-frost-zec.md`, zshield-mcp issue #3 (Steeve's "Phase 1 tools and hardening"), frost-zec's ZCG thread (forum 58172). Add the forum post link once posted.

## Feedback for the Zcash teams (optional)

Paste `FEEDBACK.md` sections Faucet, SDK or wallet tool, Docs.

## Bitrefill feedback

What worked: the llms.txt brief's REST field names were exact; `@bitrefill/cli` gave the Indian catalog and prices without an account in one command; `payment_method: "balance"` plus `auto_pay: true` makes a one-call purchase that an agent can reason about.

What didn't: no API key or event credits before the venue, so the counter was built against a mock of REST v2 (same shapes) and the first real purchase waited; test products are hidden until enabled per account, which a new account cannot do itself; `webhook_url` is missing from the OpenAPI the Docs MCP serves; the daily cap of 5 top-ups per account makes a public demo page risky, so the page buys the free test product only. Bitrefill does not accept ZEC, which is the whole reason the counter exists: a native shielded-ZEC method (or an x402 facilitator that takes ZEC) would remove our counter entirely.

## Guardrails (Agentic Commerce checklist)

The agent can spend at most 0.2 TAZ per payment and 0.5 TAZ per UTC day, only to the counter's address; the counter buys at most $6 per order and 20 orders per day, only products on its list, one purchase per txid. Above any of these: the co-signer refuses (no signature exists), or the counter refuses; the owner's third share can approve an exception by hand.

## Bitrefill touchpoints (built vs reused)

Reused: `@bitrefill/cli` for catalog and prices; the REST v2 shapes from the brief and docs. Built: the REST client with 429 backoff and final-state polling (`counter/src/bitrefill.ts`), the local mock, the order store with reservation, the MCP server that wraps search, quote and buy under the policy.

## Demo day contact

Adil's Telegram or WhatsApp (fill in).
