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
