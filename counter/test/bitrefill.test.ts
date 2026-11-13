// What counts as a finished Bitrefill order. On 5 Nov 2026 a real order came back "permanent_failure"
// (invoice "all_error"), and the counter kept polling it forever; a finished order must end the wait.
import { describe, it, expect } from "vitest";
import { FINAL_ORDER } from "../src/bitrefill.js";

describe("FINAL_ORDER", () => {
  it("treats delivered, failed and refunded orders as finished", () => {
    for (const status of ["delivered", "failed", "refunded"]) expect(FINAL_ORDER.has(status)).toBe(true);
  });
  it("treats a permanent failure from Bitrefill as finished", () => {
    expect(FINAL_ORDER.has("permanent_failure")).toBe(true);
  });
  it("keeps waiting on an order that is still on its way", () => {
    for (const status of ["created", "payment_detected", "processing"]) expect(FINAL_ORDER.has(status)).toBe(false);
  });
});

// Requirement: a Bitrefill request that hangs gives up, so one stuck call
// never stalls the counter's loop (the same rule as the zkool client).
import { Bitrefill } from "../src/bitrefill.js";

describe("Bitrefill client", () => {
  it("gives up on a request that hangs", async () => {
    const hang = ((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
      })) as unknown as typeof globalThis.fetch;
    const started = Date.now();
    await expect(new Bitrefill("key", "http://bitrefill", { fetch: hang, timeoutMs: 50 }).ping()).rejects.toThrow(/timed out|abort/i);
    expect(Date.now() - started).toBeLessThan(2_000);
  });
});
