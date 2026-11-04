// The order store: one record per shielded payment the counter acted on.
// A txid is reserved before any Bitrefill call and never bought twice, even
// if the process dies between the reservation and the purchase.

import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import type { OrderMemo } from "./memo.js";

export type OrderStatus =
  | "reserved" // payment confirmed, purchase not started
  | "buying" // Bitrefill invoice created
  | "delivered" // order delivered, code handed back (or airtime landed)
  | "refused" // policy or catalog said no
  | "failed"; // Bitrefill failed the order; needs a human

export type OrderRecord = {
  txid: string;
  memo: OrderMemo;
  paidZat: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  invoiceId?: string;
  orderRef?: string;
  receiptTxid?: string;
  note?: string;
};

type Patch = Partial<Omit<OrderRecord, "txid" | "memo" | "paidZat" | "createdAt">>;

export class OrderStore {
  private orders: Record<string, OrderRecord> = {};

  constructor(private readonly path: string) {
    if (existsSync(path)) this.orders = JSON.parse(readFileSync(path, "utf8"));
  }

  get(txid: string): OrderRecord | undefined {
    return this.orders[txid];
  }

  all(): OrderRecord[] {
    return Object.values(this.orders).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /** Returns false when the txid was already reserved. */
  reserve(txid: string, memo: OrderMemo, paidZat: number): boolean {
    if (this.orders[txid]) return false;
    const now = new Date().toISOString();
    this.orders[txid] = { txid, memo, paidZat, status: "reserved", createdAt: now, updatedAt: now };
    this.flush();
    return true;
  }

  update(txid: string, patch: Patch): OrderRecord {
    const current = this.orders[txid];
    if (!current) throw new Error(`unknown order ${txid}`);
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    this.orders[txid] = next;
    this.flush();
    return next;
  }

  private flush() {
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.orders, null, 2));
    renameSync(tmp, this.path);
  }
}
