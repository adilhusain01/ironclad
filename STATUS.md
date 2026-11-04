# Ironclad status

Updated 2026-11-04, about 21:30 IST (Claude Code on the Mac; the build moved back from the VPS session that evening).

## Submitted

- Stadium: submitted for both tracks before the 20:00 IST finalize deadline; edits open until 00:00. Stadium's check marked the testnet txid `82457796…5e26a` verified at 20:06 IST. Final values: SUBMISSION.md.
- Demo video: https://youtu.be/8QMsMO8Dx6E (2:49), recorded live in a Ghostty terminal against the VPS and the live Bitrefill API, with ElevenLabs voiceover and captions. It replaces a first upload (https://youtu.be/W0D4gGicvA4) whose attacks scene opened on an idle screen for 2.3 seconds; unlist that one. The take script is `docs/video-run.sh`; the edit lives in the private repo `adilhusain01/demo-video-kit`.
- Public site: https://vps.tail865d46.ts.net:8443 serves `web/` (Stockroom's design language): the live agent terminal with three keys, the co-signer's ledger, the counter's orders, the proofs and the trust table. Every txid links to `/tx/<txid>`, a live check through testnet.zec.rocks, because Zexplorer's testnet index was about 76,000 blocks behind.
- Upstream: frost-zec issue https://github.com/OpenPGP-Wallet/frost-zec/issues/1 (policy mode for the co-signer).

## Running on the VPS

| Service | How it runs |
|---|---|
| Co-signer daemon (share 2) | one `ironclad-cosigner cosign-daemon` in `.wallets/frost`; never start a second one on the same session folder |
| Counter (Bitrefill fulfilment) | `tsx src/main.ts` in `counter/`, real Bitrefill API |
| Counter wallet | `zkool_graphql` on 127.0.0.1:8010 |
| Dashboard and site | screen `ironclad-dashboard` (zcash-devtool needs a terminal), port 8795 behind Tailscale Funnel on 8443 |

`scripts/start-all.sh` starts whatever is missing, found by process rather than pid file, and is safe to run twice. Nothing starts them after a reboot yet (a cron `@reboot` line is proposed, not added).

## Testnet evidence

- 2-of-3 FROST spend co-signed by the policy daemon: `82457796b6d92643d6cfcade47716789a3c1ee72c9ebc77c27ccca592365e26a`, block 4,581,204.
- The purchase in the video: `9b46cda814382b444dc963ef5000ed3db6b70c83ed1f62bbd571c89364305974`, block 4,582,029, Bitrefill invoice `f547c32c-3f91-40e8-a541-1483653bf049`, delivered, receipt memo sent.
- Earlier real-API purchase: payment `67c238aedf77ac1887a14400768f220a6ca2c2514f7063622493770b43f6408c`, invoice `57eeb022-02b6-4fd8-b60c-b15af9610e64`.
- A purchase over Tor: `1cbec807f17289bf99254581c051fce9d62bf4ac182b33ec41820c3c7605f4ab`.
- Refusals (unknown recipient, over the cap) are in the co-signer's hash-chained ledger and on the site; they leave no transaction by design.
- Balances at about 19:30 IST: group wallet 1.17925 TAZ, counter 1.0894 TAZ, dev wallet 0.479 TAZ.

## Limits to know

- Bitrefill allows 5 phone top-ups a day per account; 4 were used on 4 Nov. A further "Buy" on the site the same day gets signed but the counter's order fails.
- The co-signer's daily budget is 0.5 TAZ (about 50 purchases).
- The agent and the co-signer run on the same server, so that server holds two shares (stated in the trust note).
- No paid Airtel top-up was made: no event credits reached the account.

## Not done

- The zshield-mcp PR (branch ready in `.tools/zshield-mcp`, text in `docs/upstream-zshield-mcp.md`) and the forum reply (`docs/forum-post.md`): both are Adil's to post.
- Two additions planned from the Mac at 14:55 were never built: an adversarial test run with counts of refused and unauthorised spends, and a check-in rule that pauses a scheduled top-up when the owner goes quiet.
- Vercel deploy of `web/` (optional now that the VPS address serves it).
