import { describe, it, expect } from "vitest";
import { encodeOrderMemo, parseOrderMemo } from "../src/memo.js";

// Requirement: an order memo is short, self-describing, and round-trips.
// Format: IRON-<order id> <product id> <value> [<recipient>]
describe("order memo", () => {
  it("round-trips a top-up order", () => {
    const memo = encodeOrderMemo({ orderId: "a1b2c3d4", productId: "airtel-india", value: 10, recipient: "919876543210" });
    expect(memo).toBe("IRON-a1b2c3d4 airtel-india 10 919876543210");
    expect(parseOrderMemo(memo)).toEqual({ orderId: "a1b2c3d4", productId: "airtel-india", value: 10, recipient: "919876543210" });
  });
  it("round-trips a gift card order without a recipient", () => {
    const memo = encodeOrderMemo({ orderId: "ffff0000", productId: "test-gift-card-code", value: 5 });
    expect(parseOrderMemo(memo)).toEqual({ orderId: "ffff0000", productId: "test-gift-card-code", value: 5 });
  });
  it("rejects memos that are not orders", () => {
    expect(parseOrderMemo("hello")).toBeNull();
    expect(parseOrderMemo("IRON-x")).toBeNull();
    expect(parseOrderMemo("IRON-abcd1234 airtel-india notanumber")).toBeNull();
  });
  it("never exceeds 512 bytes", () => {
    const memo = encodeOrderMemo({ orderId: "a".repeat(8), productId: "p".repeat(60), value: 99999, recipient: "9".repeat(15) });
    expect(Buffer.byteLength(memo, "utf8")).toBeLessThanOrEqual(512);
  });
});
