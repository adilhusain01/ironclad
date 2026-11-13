import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runOnce } from "../src/main.js";
import { OrderStore } from "../src/orders.js";
import type { Tx } from "../src/zkool.js";

// Requirements:
// 1. The counter spends its Bitrefill balance only on orders the Ironclad group
//    paid for. The counter's address is public, and testnet coins are free from
//    a faucet, so a payment from anyone else would let a stranger buy top-ups
//    for their own phone with the operator's money while the co-signer's policy
//    never sees it.
// 2. Once Bitrefill has the money, a passing network error must not mark the
//    order failed: the code is bought and still has to reach the payer.

const COUNTER = 1;
const GROUP = 2;
const FROM_GROUP = "aa".repeat(32);
const FROM_STRANGER = "bb".repeat(32);

const payment = (txid: string, memo: string): Tx => ({
  txid,
  height: 100,
  time: 0,
  value: "0.01",
  notes: [{ pool: 3, value: "0.01", scope: 0, memo }],
});

function setup(opts: { orderLookupFailsOnce?: boolean } = {}) {
  const counterTxs = [
    payment(FROM_GROUP, "IRON-0000000a test-phone-refill 10 919999999999"),
    payment(FROM_STRANGER, "IRON-0000000b test-phone-refill 10 918888888888"),
  ];
  // The group's watch-only account sees its own spend as a negative value.
  const groupTxs: Tx[] = [{ txid: FROM_GROUP, height: 100, time: 0, value: "-0.0101", notes: [] }];
  const zkool = {
    synchronize: async () => 100,
    transactions: async (account: number) => (account === COUNTER ? counterTxs : account === GROUP ? groupTxs : []),
    address: async () => "utest1counter",
    pay: async () => "cc".repeat(32),
  };
  const calls: string[] = [];
  let lookups = 0;
  const bitrefill = {
    product: async (id: string) => {
      calls.push(`product ${id}`);
      return { id, name: id, in_stock: true, recipient_type: "phone_number", packages: [{ value: 10, price: 100 }] };
    },
    createInvoice: async (input: { phoneNumber?: string }) => {
      calls.push(`invoice ${input.phoneNumber}`);
      return { id: "inv_1", status: "complete", orders: [{ id: "ord_1", status: "processing" }] };
    },
    order: async () => {
      lookups += 1;
      if (opts.orderLookupFailsOnce && lookups === 1) throw new Error("fetch failed");
      return { id: "ord_1", status: "delivered", redemption_info: {} };
    },
  };
  const store = new OrderStore(join(mkdtempSync(join(tmpdir(), "ironclad-main-")), "orders.json"));
  const policy = { allowed_products: ["test-phone-refill"], max_price_per_order: 1000, max_orders_per_day: 20, min_paid_zat: 1_000_000, confirmations: 1 };
  const ctx = { zkool, account: COUNTER, groupAccount: GROUP, bitrefill, store, policy, payerReceipt: async () => null } as unknown as Parameters<typeof runOnce>[0];
  return { ctx, calls, store };
}

describe("counter loop", () => {
  it("refuses an order the group did not pay for, before any Bitrefill call", async () => {
    const { ctx, calls, store } = setup();
    await runOnce(ctx);
    expect(store.get(FROM_STRANGER)?.status).toBe("refused");
    expect(store.get(FROM_STRANGER)?.note).toMatch(/group/);
    expect(calls).not.toContain("invoice 918888888888");
  });

  it("buys an order the group paid for", async () => {
    const { ctx, calls, store } = setup();
    await runOnce(ctx);
    expect(calls).toContain("invoice 919999999999");
    expect(store.get(FROM_GROUP)?.status).toBe("delivered");
  });

  it("keeps a bought order open when looking it up fails once, and delivers it on the next pass", async () => {
    const { ctx, store } = setup({ orderLookupFailsOnce: true });
    await runOnce(ctx).catch(() => {});
    expect(store.get(FROM_GROUP)?.status).toBe("buying");
    await runOnce(ctx);
    expect(store.get(FROM_GROUP)?.status).toBe("delivered");
  });
});
