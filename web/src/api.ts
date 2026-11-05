// The live API on the VPS: the co-signer's policy and ledger, the counter's orders, and the demo runs.
// The site is static; everything it shows about the system comes from here.

// The API lives beside the page (the dashboard serves both), at :8443/ and at /ironclad/ on port 443.
// VITE_API_BASE points a build elsewhere, for a copy hosted apart from the server.
export const API_BASE = (import.meta.env.VITE_API_BASE ?? new URL(".", window.location.href).href).replace(/\/$/, "");

export type Payment = [address: string, zat: number];

export interface LedgerEntry {
  at: string;
  decision: "allow" | "refuse";
  payments: Payment[];
  fee_zat?: number;
  reason?: string;
  hash?: string;
  policy_hash?: string;
}

export interface Order {
  txid: string;
  memo: { orderId: string; productId: string; value: number; recipient?: string };
  paidZat: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  invoiceId?: string;
  receiptTxid?: string;
  error?: string;
}

export interface Policy {
  name: string;
  per_payment_cap_zat: number;
  daily_budget_zat: number;
  max_fee_zat: number;
  expires: string;
  allowed_recipients: { label: string; address: string }[];
}

export interface Run {
  id: number;
  kind: DemoKind;
  startedAt: string;
  endedAt?: string;
  lines: string[];
  done: boolean;
}

export interface State {
  policy: Policy;
  ledger: LedgerEntry[];
  orders: Order[];
  counterAddress: string;
  groupAddress: string;
  run: Run | null;
  now: string;
}

export type DemoKind = "buy" | "overcap" | "unknown";

export async function fetchState(signal?: AbortSignal): Promise<State> {
  const response = await fetch(`${API_BASE}/api/state`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`The live server answered ${response.status}.`);
  return response.json();
}

// Starts a run on the server and returns at once; the run's lines arrive through fetchState.
export async function startRun(kind: DemoKind): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/demo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, async: true }),
    });
    if (response.status === 202) return { ok: true };
    if (response.status === 429) return { ok: false, message: "Another run is going. Each run takes the wallet for about a minute, so try again shortly." };
    return { ok: false, message: `The live server answered ${response.status}.` };
  } catch {
    return { ok: false, message: "The live server can't be reached right now." };
  }
}

export const TAZ = (zat: number) => `${(zat / 1e8).toLocaleString("en-US", { maximumFractionDigits: 8 })} TAZ`;
export const shortId = (value: string, head = 8, tail = 6) => (value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value);
// A txid check on our own server, through testnet.zec.rocks; public explorers can lag behind testnet.
export const explorerTx = (txid: string) => `${API_BASE}/tx/${txid}`;
