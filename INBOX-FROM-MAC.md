# Message from the Mac session, 2026-11-04 14:55 IST

Read this, then delete the file. Two additions before anything else, both small:

1. An adversarial test run: a script (`scripts/adversarial.ts` or similar) that fires a file of prompt-injection and over-budget attempts at the agent CLI and the MCP server (recipient swaps, amount escalation, "ignore your policy", repeated small spends past the daily cap, a fake approval), then prints attempts, refusals and unauthorised spends. Unauthorised spends must be 0. Quote the counts in README.md and docs/demo-script.md.
2. A check-in rule in the policy: a scheduled family top-up (for example Airtel 10 every day at 09:00 to an allow-listed number) that pauses when the owner has not sent a check-in memo within N days. Document it in README under the policy section; one test that fails first.

Then update STATUS.md. Adil is in a cab and will attach from the venue.
