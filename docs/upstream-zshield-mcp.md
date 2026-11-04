# zshield-mcp PR (opened 2026-11-04: https://github.com/Steeve-Crypto/zshield-mcp/pull/4, from the fork adilhusain01/zshield-mcp)

Steeve's good first issue in the Builder Pack: "replace zshield-mcp's stubbed chain layer with a real testnet backend". The branch `zkool-backend` in `/root/Projects/mine/zcash/.tools/zshield-mcp` on the VPS adds a `CHAIN_MODE=zkool` backend: real testnet payments through a running zkool_graphql server (release binary, no Rust build), testnet checks on both the recipient and the wallet's own address, tests with an injected GraphQL runner, and a README section. All existing tests pass with it.

To send it:

```bash
cd /root/Projects/mine/zcash/.tools/zshield-mcp
gh repo fork Steeve-Crypto/zshield-mcp --remote=true --remote-name fork
git push -u fork zkool-backend
gh pr create --repo Steeve-Crypto/zshield-mcp --head adilhusain01:zkool-backend --title "Add a zkool_graphql backend (CHAIN_MODE=zkool): real testnet payments without a Rust build" --body-file /root/Projects/mine/zcash/docs/upstream-zshield-mcp-pr.md
```

PR body (`docs/upstream-zshield-mcp-pr.md`):

Hi Steeve, from the Free Society Hack in Mumbai. The Builder Pack lists a real testnet backend as your good first issue, so here is one that needs no Rust build: `CHAIN_MODE=zkool` sends through a running zkool_graphql server (hhanh00/zkool2 ships a release binary). It checks the recipient and the wallet's own address are testnet before every payment, synchronizes the account, calls `pay` with the memo and returns the txid. Tests use an injected GraphQL runner; the README has the three commands to run it. The existing zingo-cli backend is untouched.

Context: we used zshield-mcp's policy shape as the app-layer twin of a key-layer policy we built today (Ironclad, a FROST co-signer that refuses payments outside a standing policy: github.com/adilhusain01/ironclad). Happy to follow up with an adapter that routes `zcash_pay` through that co-signer if that is interesting.
