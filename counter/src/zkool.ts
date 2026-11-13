// Thin client for zkool_graphql (https://github.com/hhanh00/zkool2), the
// wallet server that watches the counter's address and sends receipts.

export type Note = { pool: number; value: string; scope: number; memo: string | null; address?: string };
export type Tx = { txid: string; height: number | null; time: number | null; value: string; notes: Note[] };

export type ZkoolOptions = { fetch?: typeof globalThis.fetch; timeoutMs?: number };

/** zkool_graphql's account ids are i32. */
const MAX_ACCOUNT = 2 ** 31 - 1;
/** A ZEC amount as zkool's BigDecimal takes it: digits, at most 8 decimal places. */
const AMOUNT = /^\d{1,8}(\.\d{1,8})?$/;

function checkAccount(account: number): number {
  if (!Number.isInteger(account) || account < 1 || account > MAX_ACCOUNT) throw new Error(`zkool account id must be a positive integer, got ${account}`);
  return account;
}

/**
 * Every value goes to zkool as a GraphQL variable, never pasted into the query
 * text: recipient and memo come from payers and from Bitrefill, and a quote in
 * either could otherwise add a recipient or change the amount.
 */
export class Zkool {
  private readonly fetch: typeof globalThis.fetch;
  private readonly timeoutMs: number;

  constructor(private readonly url: string, opts: ZkoolOptions = {}) {
    this.fetch = opts.fetch ?? globalThis.fetch;
    this.timeoutMs = opts.timeoutMs ?? 120_000;
  }

  private async query<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const res = await this.fetch(`${this.url}/graphql`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) throw new Error(`zkool_graphql answered ${res.status} ${res.statusText}`.trim());
    const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
    if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "));
    return body.data as T;
  }

  async currentHeight(): Promise<number> {
    return (await this.query<{ currentHeight: number }>("{ currentHeight }", {})).currentHeight;
  }

  async synchronize(accounts: number[]): Promise<number> {
    accounts.forEach(checkAccount);
    return (await this.query<{ synchronize: number }>("mutation($accounts: [Int!]!) { synchronize(idAccounts: $accounts, fast: false) }", { accounts })).synchronize;
  }

  async address(account: number): Promise<string> {
    checkAccount(account);
    return (await this.query<{ addressByAccount: { ua: string } }>("query($account: Int!) { addressByAccount(idAccount: $account) { ua } }", { account })).addressByAccount.ua;
  }

  async transactions(account: number): Promise<Tx[]> {
    checkAccount(account);
    return (await this.query<{ transactionsByAccount: Tx[] }>(
      "query($account: Int!) { transactionsByAccount(idAccount: $account) { txid height time value notes { pool value scope memo address } } }",
      { account },
    )).transactionsByAccount;
  }

  async pay(account: number, address: string, amountZec: string, memo: string): Promise<string> {
    checkAccount(account);
    if (!AMOUNT.test(amountZec)) throw new Error(`zkool amount must be a plain decimal ZEC string, got ${JSON.stringify(amountZec)}`);
    await this.synchronize([account]);
    const payment = { recipients: [{ address, amount: amountZec, memo }], confirmations: 1 };
    return (await this.query<{ pay: string }>("mutation($account: Int!, $payment: Payment!) { pay(idAccount: $account, payment: $payment) }", { account, payment })).pay;
  }
}

/** Incoming (scope 0) notes with their memos, per confirmed transaction. */
export function incomingPayments(txs: Tx[]): { txid: string; height: number; valueZat: number; memos: string[] }[] {
  const out = [];
  for (const tx of txs) {
    if (tx.height === null) continue;
    const incoming = tx.notes.filter((n) => n.scope === 0);
    if (incoming.length === 0) continue;
    const valueZat = incoming.reduce((sum, n) => sum + Math.round(Number(n.value) * 1e8), 0);
    const memos = incoming.map((n) => n.memo ?? "").filter((m) => m.length > 0);
    out.push({ txid: tx.txid, height: tx.height, valueZat, memos });
  }
  return out;
}
