import { describe, it, expect } from "vitest";
import { OrderStore } from "../src/orders.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Requirement: one purchase per txid, reserved before any Bitrefill call,
// and a crash between reserve and buy never buys twice.
describe("order store", () => {
  const dir = mkdtempSync(join(tmpdir(), "ironclad-orders-"));
  it("reserves a txid once", () => {
    const s = new OrderStore(join(dir, "orders.json"));
    expect(s.reserve("tx1", { orderId: "o1", productId: "airtel-india", value: 10, recipient: "911" }, 100000000)).toBe(true);
    expect(s.reserve("tx1", { orderId: "o1", productId: "airtel-india", value: 10, recipient: "911" }, 100000000)).toBe(false);
  });
  it("survives a reload with the reservation intact", () => {
    const path = join(dir, "orders2.json");
    const a = new OrderStore(path);
    a.reserve("tx2", { orderId: "o2", productId: "airtel-india", value: 10 }, 5);
    const b = new OrderStore(path);
    expect(b.get("tx2")?.status).toBe("reserved");
    expect(b.reserve("tx2", { orderId: "o2", productId: "airtel-india", value: 10 }, 5)).toBe(false);
  });
  it("moves through the states and keeps the invoice id", () => {
    const s = new OrderStore(join(dir, "orders3.json"));
    s.reserve("tx3", { orderId: "o3", productId: "airtel-india", value: 10 }, 5);
    s.update("tx3", { status: "buying", invoiceId: "inv_1" });
    s.update("tx3", { status: "delivered", orderRef: "ord_1" });
    expect(s.get("tx3")).toMatchObject({ status: "delivered", invoiceId: "inv_1", orderRef: "ord_1" });
  });
});
