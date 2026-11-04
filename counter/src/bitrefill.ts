// Bitrefill REST v2 client, field names from the organisers' brief and
// https://docs.bitrefill.com. Every 2xx body is { meta, data }; errors are
// flat { message, status }. Invoice statuses: unpaid, payment_detected,
// payment_confirmed, pending, complete, blocked, denied, payment_error.
// Order statuses: created, payment_detected, processing, delivered, failed,
// refunded. "delivered" is the finish line.

export type Package = { value: number | string; package_value?: string; payment_price?: string; payment_currency?: string; price?: number; currency?: string };
export type Product = { id: string; name: string; recipient_type?: string; in_stock?: boolean; packages?: Package[]; currency?: string };
export type Invoice = {
  id: string;
  status: string;
  payment?: { method: string; status: string; price?: number; currency?: string };
  orders?: { id: string; status: string }[];
};
export type Order = { id: string; status: string; redemption_info?: { code?: string; link?: string; pin?: string; instructions?: string } };

export class BitrefillError extends Error {
  constructor(message: string, readonly httpStatus: number, readonly code?: string) {
    super(message);
  }
}

export class Bitrefill {
  constructor(private readonly apiKey: string, private readonly baseUrl = "https://api.bitrefill.com/v2") {}

  private async call<T>(method: string, path: string, body?: unknown, attempt = 1): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json", accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 429 && attempt <= 5) {
      const wait = Number(res.headers.get("retry-after") ?? 0) * 1000 || 1000 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, wait));
      return this.call<T>(method, path, body, attempt + 1);
    }
    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* non-JSON body */
    }
    if (!res.ok) throw new BitrefillError(json?.message ?? text.slice(0, 200), res.status, json?.status);
    return (json?.data ?? json) as T;
  }

  ping() {
    return this.call<unknown>("GET", "/ping");
  }

  balance() {
    return this.call<{ balance: number; currency: string }>("GET", "/accounts/balance");
  }

  product(id: string) {
    return this.call<Product>("GET", `/products/${encodeURIComponent(id)}`);
  }

  /** Creates and (with autoPay) pays an invoice from the account balance. */
  createInvoice(input: { productId: string; value: number; phoneNumber?: string; autoPay: boolean; webhookUrl?: string }) {
    const product: Record<string, unknown> = { product_id: input.productId, quantity: 1, value: input.value };
    if (input.phoneNumber) product.phone_number = input.phoneNumber;
    const body: Record<string, unknown> = { products: [product], payment_method: "balance", auto_pay: input.autoPay };
    if (input.webhookUrl) body.webhook_url = input.webhookUrl;
    return this.call<Invoice>("POST", "/invoices", body);
  }

  payInvoice(id: string) {
    return this.call<Invoice>("POST", `/invoices/${encodeURIComponent(id)}/pay`);
  }

  invoice(id: string) {
    return this.call<Invoice>("GET", `/invoices/${encodeURIComponent(id)}`);
  }

  order(id: string) {
    return this.call<Order>("GET", `/orders/${encodeURIComponent(id)}`);
  }
}

/** The USD price of one package of a product, from the product's own package list. */
export function priceUsd(product: Product, value: number): number | null {
  for (const p of product.packages ?? []) {
    const v = Number(p.value ?? p.package_value);
    if (v === value) {
      const price = p.payment_price !== undefined ? Number(p.payment_price) : p.price;
      return price === undefined || Number.isNaN(price) ? null : price;
    }
  }
  return null;
}

export const FINAL_INVOICE = new Set(["complete", "blocked", "denied", "payment_error"]);
export const FINAL_ORDER = new Set(["delivered", "failed", "refunded"]);
