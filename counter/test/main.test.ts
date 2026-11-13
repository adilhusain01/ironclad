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
// 3. The cap is the product's face value in its own currency (10 means 10 USD
//    for test-phone-refill), which does not move with BTC. The account's price
//    in satoshis does, and a cap in satoshis refused a 10 USD top-up once BTC
//    moved (13 Nov 2026).
// 4. An invoice request that gets no answer may still have bought the
//    product: the order says to check the Bitrefill account by hand.

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

function setup(opts: { orderLookupFailsOnce?: boolean; price?: number; invoiceTimesOut?: boolean; memoValue?: number } = {}) {
  const counterTxs = [
    payment(FROM_GROUP, `IRON-0000000a test-phone-refill ${opts.memoValue ?? 10} 919999999999`),
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
      return { id, name: id, in_stock: true, recipient_type: "phone_number", packages: [{ value: 10, price: opts.price ?? 100 }, { value: 20, price: 2 * (opts.price ?? 100) }] };
    },
    createInvoice: async (input: { phoneNumber?: string }) => {
      calls.push(`invoice ${input.phoneNumber}`);
      if (opts.invoiceTimesOut) throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
      return { id: "inv_1", status: "complete", orders: [{ id: "ord_1", status: "processing" }] };
    },
    order: async () => {
      lookups += 1;
      if (opts.orderLookupFailsOnce && lookups === 1) throw new Error("fetch failed");
      return { id: "ord_1", status: "delivered", redemption_info: {} };
    },
  };
  const store = new OrderStore(join(mkdtempSync(join(tmpdir(), "ironclad-main-")), "orders.json"));
  const policy = { max_value: { "test-phone-refill": 10 }, max_orders_per_day: 20, min_paid_zat: 1_000_000, confirmations: 1 };
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

  it("buys within the face-value cap however many satoshis it costs today", async () => {
    const { ctx, store } = setup({ price: 15_145 });
    await runOnce(ctx);
    expect(store.get(FROM_GROUP)?.status).toBe("delivered");
  });

  it("refuses a value above the product's face-value cap, before any invoice", async () => {
    const { ctx, calls, store } = setup({ memoValue: 20 });
    await runOnce(ctx);
    expect(store.get(FROM_GROUP)?.status).toBe("refused");
    expect(store.get(FROM_GROUP)?.note).toMatch(/cap/);
    expect(calls.filter((c) => c.startsWith("invoice"))).toEqual([]);
  });

  it("says to check by hand when the invoice request got no answer", async () => {
    const { ctx, store } = setup({ invoiceTimesOut: true });
    await runOnce(ctx);
    expect(store.get(FROM_GROUP)?.status).toBe("failed");
    expect(store.get(FROM_GROUP)?.note).toMatch(/check the Bitrefill account by hand/);
  });
});

// Requirement: a policy file the counter cannot enforce stops it at start
// (an old file with a satoshi cap would otherwise fail on the first order).
import { parsePolicy } from "../src/main.js";

describe("counter policy file", () => {
  const good = { max_value: { "airtel-india": 500 }, max_orders_per_day: 5, min_paid_zat: 1_000_000, confirmations: 1 };
  it("loads a complete policy", () => {
    expect(parsePolicy(JSON.stringify(good)).max_value["airtel-india"]).toBe(500);
  });
  it("refuses the old satoshi cap and anything incomplete", () => {
    const old = { allowed_products: ["airtel-india"], max_price_per_order: 15000, max_orders_per_day: 5, min_paid_zat: 1, confirmations: 1 };
    expect(() => parsePolicy(JSON.stringify(old))).toThrow(/max_value/);
    expect(() => parsePolicy(JSON.stringify({ ...good, max_value: { "airtel-india": -1 } }))).toThrow(/max_value/);
    expect(() => parsePolicy(JSON.stringify({ ...good, confirmations: 0 }))).toThrow(/confirmations/);
  });
});
