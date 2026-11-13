// The order memo the agent sends to the counter, built to the counter's own
// rules (counter/src/memo.ts). A memo the counter cannot read still costs the
// payment and buys nothing, so anything it would reject is refused here,
// before money moves.

import { randomBytes } from "node:crypto";

const PRODUCT = /^[a-z0-9-]{1,80}$/;
const PHONE = /^\d{6,15}$/; // international format, no plus sign
const MAX_VALUE = 1e9;

export function orderMemo(productId: string, value: number, phone?: string): { orderId: string; memo: string } {
  if (!PRODUCT.test(productId)) throw new Error(`product id must be lower-case letters, digits and dashes, got ${JSON.stringify(productId)}`);
  if (!Number.isFinite(value) || value <= 0 || value > MAX_VALUE) throw new Error(`value must be a positive number, got ${value}`);
  if (phone !== undefined && !PHONE.test(phone)) throw new Error(`phone must be digits in international format without "+", got ${JSON.stringify(phone)}`);
  const orderId = randomBytes(4).toString("hex");
  const memo = [`IRON-${orderId}`, productId, String(value), phone].filter(Boolean).join(" ");
  return { orderId, memo };
}
