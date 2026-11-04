// A local stand-in for Bitrefill REST v2 with the same shapes, so the loop
// can be built and tested before the event credits arrive. It delivers after
// a few seconds, like the real test products, and knows a few India products.
// Run: npm run mock   (listens on 127.0.0.1:8790)

import { createServer } from "node:http";

const products: Record<string, any> = {
  "airtel-india": {
    id: "airtel-india",
    name: "Airtel India",
    recipient_type: "phone_number",
    in_stock: true,
    currency: "INR",
    packages: [
      { value: 10, payment_price: "0.11", payment_currency: "USD" },
      { value: 120, payment_price: "1.31", payment_currency: "USD" },
      { value: 500, payment_price: "5.48", payment_currency: "USD" },
    ],
  },
  "test-phone-refill": { id: "test-phone-refill", name: "Test phone refill", recipient_type: "phone_number", in_stock: true, currency: "INR", packages: [{ value: 10, payment_price: "0.00", payment_currency: "USD" }] },
  "test-gift-card-code": { id: "test-gift-card-code", name: "Test gift card", recipient_type: "none", in_stock: true, currency: "USD", packages: [{ value: 5, payment_price: "0.00", payment_currency: "USD" }] },
  "swiggy-money-india": { id: "swiggy-money-india", name: "Swiggy Money India", recipient_type: "none", in_stock: true, currency: "INR", packages: [{ value: 100, payment_price: "1.10", payment_currency: "USD" }, { value: 500, payment_price: "5.48", payment_currency: "USD" }] },
};

const invoices = new Map<string, any>();
const orders = new Map<string, any>();
let balance = 100;
let n = 0;

function json(res: any, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const auth = req.headers.authorization ?? "";
  if (!auth.startsWith("Bearer ")) return json(res, 401, { message: "Unauthorized", status: "invalid_token" });
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
  const p = url.pathname;

  if (req.method === "GET" && p === "/v2/ping") return json(res, 200, { meta: {}, data: { pong: true } });
  if (req.method === "GET" && p === "/v2/accounts/balance") return json(res, 200, { meta: {}, data: { balance, currency: "USD" } });
  if (req.method === "GET" && p.startsWith("/v2/products/")) {
    const prod = products[decodeURIComponent(p.slice("/v2/products/".length))];
    return prod ? json(res, 200, { meta: {}, data: prod }) : json(res, 404, { message: "Product not found", status: "not_found" });
  }
  if (req.method === "POST" && p === "/v2/invoices") {
    const item = body.products?.[0];
    const prod = item && products[item.product_id];
    if (!prod) return json(res, 400, { message: "invalid product", status: "invalid" });
    const pkg = prod.packages.find((x: any) => x.value === Number(item.value));
    if (!pkg) return json(res, 400, { message: "invalid value", status: "invalid" });
    if (prod.recipient_type === "phone_number" && !item.phone_number) return json(res, 400, { message: "phone_number required", status: "invalid" });
    const price = Number(pkg.payment_price);
    if (body.auto_pay && balance < price) return json(res, 400, { message: "insufficient balance", status: "insufficient_balance" });
    n += 1;
    const invoiceId = `inv_mock_${n}`;
    const orderId = `ord_mock_${n}`;
    const paid = !!body.auto_pay;
    if (paid) balance -= price;
    const order: any = { id: orderId, status: paid ? "processing" : "created", product: item.product_id, value: item.value };
    const invoice = { id: invoiceId, status: paid ? "pending" : "unpaid", payment: { method: "balance", status: paid ? "paid" : "unpaid", price, currency: "USD" }, orders: [{ id: orderId, status: order.status }] };
    invoices.set(invoiceId, invoice);
    orders.set(orderId, order);
    if (paid) {
      setTimeout(() => {
        order.status = item.product_id.endsWith("-fail") ? "failed" : "delivered";
        if (order.status === "delivered" && prod.recipient_type !== "phone_number") order.redemption_info = { code: `MOCK-${orderId.toUpperCase()}-CODE`, instructions: "Redeem at the brand's site." };
        invoice.status = "complete";
        invoice.orders[0].status = order.status;
      }, 4000);
    }
    return json(res, 200, { meta: {}, data: invoice });
  }
  const inv = p.match(/^\/v2\/invoices\/([^/]+)$/);
  if (req.method === "GET" && inv) {
    const invoice = invoices.get(decodeURIComponent(inv[1]));
    return invoice ? json(res, 200, { meta: {}, data: invoice }) : json(res, 404, { message: "not found", status: "not_found" });
  }
  const ord = p.match(/^\/v2\/orders\/([^/]+)$/);
  if (req.method === "GET" && ord) {
    const order = orders.get(decodeURIComponent(ord[1]));
    return order ? json(res, 200, { meta: {}, data: order }) : json(res, 404, { message: "not found", status: "not_found" });
  }
  json(res, 404, { message: `no route ${req.method} ${p}`, status: "not_found" });
});

const port = Number(process.env.MOCK_BITREFILL_PORT ?? 8790);
server.listen(port, "127.0.0.1", () => console.log(`mock bitrefill on http://127.0.0.1:${port}/v2 (balance $${balance})`));
