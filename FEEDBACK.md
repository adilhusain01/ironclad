# Feedback (what broke, confused or slowed us down)

Written from notes kept from the first error on 4 November 2026. Area, what we tried, what happened, what we expected, link or error.

## Faucet

- Fauzec's API worked first time for two `utest1` addresses (1 TAZ each, txid returned at once, mined within a minute). Nothing to fix; the OpenAPI document at `/.well-known/openapi.json` made it a one-liner.

## Node or indexer (lightwalletd)

- **Zexplorer** (the explorer the brief links): on the evening of 4 Nov its testnet node showed "NODE SYNCING #4,506,125" while testnet was past block 4,582,000, so every transaction from the last few days, ours included, showed "Transaction not found". testnet.zcashexplorer.app answered 403 to scripted requests. A second working explorer, or a sync status next to "not found", would stop judges reading a lag as a fake txid.

- `testnet.zec.rocks:443` answered every call. zcash-devtool's `sync` and zkool_graphql's `synchronize` both took under a second once the wallet birthday was recent.

## SDK or wallet tool

- **zkool_graphql 6.36 (release binary):** a note spent in a pending transaction makes the next `pay` fail with `No feasible note selection found` until the wallet is synchronized again and the change is seen, even though `balanceByAccount` still shows the old balance. Expected: either the balance to drop at once or the error to say "funds pending". Workaround: `synchronize` before each `pay` and retry after a block.
- **zkool_graphql:** `unconfirmedByAccount` keeps listing a transaction after it is mined (the brief warns about this; it still cost a few minutes). A `mempool: true/false` flag on the entry would help.
- **zkool_graphql:** the release asset is Linux x86_64 only, 142 MB, unstripped; a macOS build means a 30-minute compile. A stripped macOS arm64 asset would save most teams an hour.
- **zcash-devtool (main, 0b3436b):** a view-only wallet shows `Balance: 0.3 TAZ` with `Ironwood Spendable: 0` and `pczt create` says `Insufficient balance (have 0 ...)` until the funding note has about ten confirmations. Expected: the balance output to say how many confirmations are missing. Each cycle (spend, wait for change to confirm) costs five to eight minutes on testnet, which shaped our demo pacing.
- **zcash-devtool `pczt create`:** the recipient in the resulting PCZT is the raw Orchard/Ironwood receiver, so a co-signer that re-encodes it gets a different unified address string from the one the payer typed. Any allow-list must match by receiver (we did). Worth a line in the PCZT docs.
- **frost-zec (prototype, MIT):** excellent base; the co-signer verifies the PCZT on its own. The daemon mode we added needed one fix: a second session must not clear the exchange directory until the coordinator has collected the reply (we hit the race on the first run). Its `cosign` reads the human's approval from stdin, so a policy hook had to go in beside it rather than around it.
- **zcash-devtool opens `/dev/tty`:** run from a service with no controlling terminal (nohup, setsid, a web server's child process), even `wallet balance` fails with `Error: Resource temporarily unavailable (os error 11)`. Expected: no terminal needed for non-interactive commands, or a clear message. Workaround: run it under `screen` or `script -qec "<cmd>" /dev/null`.
- **zcash-devtool `inspect --lookup <txid>`** is a good public check of a shielded txid through the light wallet server: it prints the block, version and branch and nothing private. We used it on camera and behind the site's txid links when the explorer lagged.
- **Rust toolchains:** zcash-devtool pins its own toolchain through `rust-toolchain.toml` and downloaded it on first build; two Rust toolchains and about 25 minutes of compiling on a 6-core VPS before the first PCZT. The brief's "start the build first" advice is right.

## Nym

- We built zingolib's `nym-proxy` (the `nym` feature, 11 minutes) and it joined the mixnet and announced a SOCKS5 port and an exit node within seconds. zcash-devtool's `--connection socks5://127.0.0.1:<port>` then failed with `transport error` after 10 seconds, and a plain `curl --socks5-hostname` to `https://testnet.zec.rocks:443` never completed. Our reading: the exit's allow-list does not include the testnet light wallet server (mainnet `zec.rocks` is what the Zingo integration targets). Expected: either the connection to work or the proxy to report the refusal. zcash-devtool's built-in Tor (`--connection tor`) synced the same wallet in 13 seconds, so we shipped Tor and left Nym as the next step. The Nym Zcash SDK page says the dVPN needs NYM credentials; a testnet allow-list entry for `testnet.zec.rocks` would let hackathon teams try the mixnet without credits.

## Bitrefill

- `search-products` needs `--intent`, which the CLI error says but the docs do not (the brief covers it).
- Without an API key we built against a local mock with the brief's field names. The `webhook_url` field is in the webhooks guide but not in the OpenAPI the Docs MCP serves, as the brief says; we poll instead.
- The REST test products (`test-phone-refill`, `test-gift-card-code`) need to be enabled per account; on a brand-new account we could not confirm that, so the first real purchase waited for the venue.

## Docs

- The organisers' llms.txt briefs were the single most useful document of the day: the exact field names, the dead endpoints to avoid, and the `pay` gotchas were all correct.
- What was missing: one page that says which Rust library versions (orchard, pczt, zcash_address, zcash_primitives) match NU7 testnet today. frost-zec's `Cargo.toml` (the 2026-10-21 releases) was our source.

## Other

- A sandbox on the Mac refused to clone and compile external repositories, so the build moved to the VPS. Not a Zcash issue, but it cost the first hour.
