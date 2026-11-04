// What the page tells a visitor after a run, read from the agent's real output lines.
import { describe, expect, it } from "vitest";
import { outcomeOf, spentTodayZat, tidyLine } from "./run.ts";

const sent = [
  "syncing the group wallet over tor",
  'building a payment of 1000000 zat to utest1u2gz0d9q… with memo "IRON-1 test-phone-refill 10 919999999999"',
  "proving (this takes a few seconds)",
  "asking the policy co-signer for its share (session /root/Projects/mine/zcash/.wallets/frost/session)",
  "broadcasting over tor",
  "sent: 3803168077947d4f50cad83ddf4aaf17ce83451dba578fa4c2da4f008e0f4087",
  "https://zexplorer.app/testnet/tx/3803168077947d4f50cad83ddf4aaf17ce83451dba578fa4c2da4f008e0f4087",
];

const refused = [
  "asking the policy co-signer for its share (session /root/x/session)",
  "/root/x/ironclad-cosigner coordinate --as 1 failed:",
  "error: the co-signer refused to sign: policy: 25000000 zat to Ironclad counter (Bitrefill fulfilment, testnet) is above the per-payment cap of 20000000 zat",
  "exit code 1",
];

describe("outcomeOf", () => {
  it("is running while the run has not finished", () => {
    expect(outcomeOf({ done: false, lines: sent.slice(0, 3) })).toEqual({ kind: "running", step: "proving (this takes a few seconds)" });
  });

  it("reports a signed payment with its txid", () => {
    expect(outcomeOf({ done: true, lines: sent })).toEqual({ kind: "sent", txid: "3803168077947d4f50cad83ddf4aaf17ce83451dba578fa4c2da4f008e0f4087" });
  });

  it("reports a refusal at the key with the co-signer's reason", () => {
    expect(outcomeOf({ done: true, lines: refused })).toEqual({
      kind: "refused",
      reason: "25000000 zat to Ironclad counter (Bitrefill fulfilment, testnet) is above the per-payment cap of 20000000 zat",
    });
  });

  it("calls anything else a failure and keeps the last line", () => {
    expect(outcomeOf({ done: true, lines: ["syncing the group wallet over tor", "Error: Resource temporarily unavailable (os error 11)", "exit code 1"] })).toEqual({
      kind: "failed",
      detail: "Error: Resource temporarily unavailable (os error 11)",
    });
  });
});

describe("spentTodayZat", () => {
  const now = new Date("2026-11-04T12:00:00Z");
  const entry = (at: string, decision: "allow" | "refuse", zat: number) => ({ at, decision, payments: [["utest1x", zat]] as [string, number][] });

  it("adds the allowed payments of the current UTC day", () => {
    const ledger = [entry("2026-11-04T11:00:00Z", "allow", 1_000_000), entry("2026-11-04T10:00:00Z", "refuse", 25_000_000), entry("2026-11-04T09:00:00Z", "allow", 1_000_000), entry("2026-11-03T23:00:00Z", "allow", 5_000_000)];
    expect(spentTodayZat(ledger, now)).toBe(2_000_000);
  });

  it("is unknown when the decisions shown do not reach back to the start of the day", () => {
    const ledger = [entry("2026-11-04T11:00:00Z", "allow", 1_000_000), entry("2026-11-04T09:00:00Z", "allow", 1_000_000)];
    expect(spentTodayZat(ledger, now)).toBeNull();
  });
});

describe("tidyLine", () => {
  it("drops the server's folder from paths", () => {
    expect(tidyLine("asking the policy co-signer for its share (session /root/Projects/mine/zcash/.wallets/frost/session)")).toBe("asking the policy co-signer for its share (session .wallets/frost/session)");
  });
});
