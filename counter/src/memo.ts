// Order memos travel inside the shielded payment. Format:
//   IRON-<order id> <product id> <value> [<recipient>]
// The order id is 8 hex characters chosen by the agent; the value is in the
// product's own currency (10 means 10 INR for airtel-india); the recipient is
// a phone number in international format without the plus sign, or absent.

export type OrderMemo = {
  orderId: string;
  productId: string;
  value: number;
  recipient?: string;
};

const ORDER_ID = /^[0-9a-f]{8}$/;
const PRODUCT = /^[a-z0-9-]{1,80}$/;
const RECIPIENT = /^[A-Za-z0-9@._+-]{1,64}$/;

export function encodeOrderMemo(o: OrderMemo): string {
  const parts = [`IRON-${o.orderId}`, o.productId, String(o.value)];
  if (o.recipient) parts.push(o.recipient);
  const memo = parts.join(" ");
  if (Buffer.byteLength(memo, "utf8") > 512) throw new Error("memo over 512 bytes");
  return memo;
}

export function parseOrderMemo(memo: string): OrderMemo | null {
  const parts = memo.trim().split(/\s+/);
  if (parts.length < 3 || parts.length > 4) return null;
  const [head, productId, valueText, recipient] = parts;
  if (!head.startsWith("IRON-")) return null;
  const orderId = head.slice(5);
  if (!ORDER_ID.test(orderId) || !PRODUCT.test(productId)) return null;
  const value = Number(valueText);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (recipient !== undefined && !RECIPIENT.test(recipient)) return null;
  return recipient ? { orderId, productId, value, recipient } : { orderId, productId, value };
}
