// The counter: watches the counter wallet for shielded payments carrying an
// order memo, confirms them, reserves each txid once, buys the product from
// Bitrefill with the account balance, polls to "delivered", and sends gift
// codes back to the payer as an encrypted memo. Top-ups land on the phone.
//
// Trust note (short): this process holds a Bitrefill API key and the counter
// wallet (a hot wallet with a small float for receipts). It sees every order
// memo. It stores txids, order memos and invoice ids in orders.json.

import { readFileSync } from "node:fs";
import { Bitrefill, BitrefillError, FINAL_ORDER, packagePrice } from "./bitrefill.js";
import { parseOrderMemo, type OrderMemo } from "./memo.js";
import { OrderStore } from "./orders.js";
import { Zkool, incomingPayments } from "./zkool.js";

type CounterPolicy = {
  allowed_products: string[];
  max_price_per_order: number; // in the API's price unit (satoshis on a BTC account)
  max_orders_per_day: number;
  min_paid_zat: number;
  confirmations: number;
};

const env = (k: string, fallback?: string) => {
  const v = process.env[k] ?? fallback;
  if (v === undefined) throw new Error(`missing env ${k}`);
  return v;
};

const log = (...a: unknown[]) => console.log(new Date().toISOString(), ...a);
const seen = new Set<string>();

export async function runOnce(ctx: {
  zkool: Zkool;
  account: number;
  bitrefill: Bitrefill;
  store: OrderStore;
  policy: CounterPolicy;
  payerReceipt: (txid: string, memo: string) => Promise<string | null>;
}) {
  const { zkool, account, bitrefill, store, policy } = ctx;
  const tip = await zkool.synchronize([account]);
  const txs = await zkool.transactions(account);
  for (const p of incomingPayments(txs)) {
    if (tip - p.height + 1 < policy.confirmations) continue;
    if (store.get(p.txid)) continue;
    const memo = p.memos.map(parseOrderMemo).find((m): m is OrderMemo => m !== null);
    if (!memo) {
      if (!seen.has(p.txid)) {
        seen.add(p.txid);
        log("payment without an order memo, nothing to do", p.txid, p.memos[0]?.slice(0, 40) ?? "");
      }
      continue;
    }
    if (!store.reserve(p.txid, memo, p.valueZat)) continue;
    log("reserved", p.txid, memo);
    const verdict = checkOrder(memo, p.valueZat, store, policy);
    if (verdict) {
      store.update(p.txid, { status: "refused", note: verdict });
      log("refused", p.txid, verdict);
      continue;
    }
    await fulfil(p.txid, memo, ctx);
  }
  // keep polling anything still buying
  for (const o of store.all().filter((o) => o.status === "buying" && o.orderRef)) {
    await settle(o.txid, o.orderRef!, ctx);
  }
}

export function checkOrder(memo: OrderMemo, paidZat: number, store: OrderStore, policy: CounterPolicy): string | null {
  if (!policy.allowed_products.includes(memo.productId)) return `product ${memo.productId} is not on the counter's list`;
  if (paidZat < policy.min_paid_zat) return `paid ${paidZat} zat, below the minimum ${policy.min_paid_zat}`;
  const today = new Date().toISOString().slice(0, 10);
  const todays = store.all().filter((o) => o.createdAt.startsWith(today) && o.status !== "refused").length;
  if (todays > policy.max_orders_per_day) return `daily cap of ${policy.max_orders_per_day} orders reached`;
  return null;
}

async function fulfil(txid: string, memo: OrderMemo, ctx: Parameters<typeof runOnce>[0]) {
  const { bitrefill, store, policy } = ctx;
  try {
    const product = await bitrefill.product(memo.productId);
    if (product.in_stock === false) return void store.update(txid, { status: "refused", note: "out of stock" });
    const price = packagePrice(product, memo.value);
    if (price === null) return void store.update(txid, { status: "refused", note: `value ${memo.value} is not a package of ${memo.productId}` });
    if (price > policy.max_price_per_order) return void store.update(txid, { status: "refused", note: `price ${price} is over the counter's cap of ${policy.max_price_per_order}` });
    if (product.recipient_type === "phone_number" && !memo.recipient) return void store.update(txid, { status: "refused", note: "top-up without a phone number" });
    const invoice = await bitrefill.createInvoice({ productId: memo.productId, value: memo.value, phoneNumber: memo.recipient, autoPay: true });
    const orderRef = invoice.orders?.[0]?.id;
    store.update(txid, { status: "buying", invoiceId: invoice.id, orderRef });
    log("bought", txid, "invoice", invoice.id, "order", orderRef, `price ${price}`);
    if (orderRef) await settle(txid, orderRef, ctx);
  } catch (e) {
    const msg = e instanceof BitrefillError ? `${e.httpStatus} ${e.message}` : String(e);
    store.update(txid, { status: "failed", note: msg });
    log("failed", txid, msg);
  }
}

async function settle(txid: string, orderRef: string, ctx: Parameters<typeof runOnce>[0]) {
  const { bitrefill, store, payerReceipt } = ctx;
  const order = await bitrefill.order(orderRef);
  if (!FINAL_ORDER.has(order.status)) return;
  if (order.status !== "delivered") return void store.update(txid, { status: "failed", note: `order ${order.status}` });
  const code = order.redemption_info?.code ?? order.redemption_info?.link;
  const rec = store.get(txid)!;
  let receiptTxid: string | null = null;
  if (code) {
    // The code goes back inside a shielded memo: never logged, never emailed.
    receiptTxid = await payerReceipt(txid, `IRON-RECEIPT ${rec.memo.orderId} ${rec.memo.productId} code:${code}`);
  } else {
    receiptTxid = await payerReceipt(txid, `IRON-RECEIPT ${rec.memo.orderId} ${rec.memo.productId} delivered`);
  }
  store.update(txid, { status: "delivered", receiptTxid: receiptTxid ?? undefined });
  log("delivered", txid, "receipt", receiptTxid ?? "none");
}

async function main() {
  const zkool = new Zkool(env("ZKOOL_URL", "http://127.0.0.1:8010"));
  const account = Number(env("COUNTER_ACCOUNT", "1"));
  const bitrefill = new Bitrefill(env("BITREFILL_API_KEY"), env("BITREFILL_BASE_URL", "https://api.bitrefill.com/v2"));
  const store = new OrderStore(env("ORDERS_PATH", "./orders.json"));
  const policy = JSON.parse(readFileSync(env("COUNTER_POLICY", "./counter-policy.json"), "utf8")) as CounterPolicy;
  const payers = new Map<string, string>(); // txid -> return address, learned from the memo's reply-to if present
  const replyTo = env("DEFAULT_RECEIPT_ADDRESS", "");
  const payerReceipt = async (_txid: string, memo: string) => {
    const to = payers.get(_txid) ?? replyTo;
    if (!to) return null;
    return zkool.pay(account, to, "0.0001", memo);
  };
  log("counter watching account", account, "at", await zkool.address(account));
  for (;;) {
    try {
      await runOnce({ zkool, account, bitrefill, store, policy, payerReceipt });
    } catch (e) {
      log("loop error", String(e));
    }
    await new Promise((r) => setTimeout(r, Number(env("POLL_MS", "15000"))));
  }
}

if (process.argv[1]?.endsWith("main.ts") || process.argv[1]?.endsWith("main.js")) main();
