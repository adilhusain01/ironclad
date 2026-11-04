// Thin client for zkool_graphql (https://github.com/hhanh00/zkool2), the
// wallet server that watches the counter's address and sends receipts.

export type Note = { pool: number; value: string; scope: number; memo: string | null; address?: string };
export type Tx = { txid: string; height: number | null; time: number | null; value: string; notes: Note[] };

export class Zkool {
  constructor(private readonly url: string) {}

  private async query<T>(query: string): Promise<T> {
    const res = await fetch(`${this.url}/graphql`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
    if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "));
    return body.data as T;
  }

  async currentHeight(): Promise<number> {
    return (await this.query<{ currentHeight: number }>("{ currentHeight }")).currentHeight;
  }

  async synchronize(accounts: number[]): Promise<number> {
    return (await this.query<{ synchronize: number }>(`mutation { synchronize(idAccounts: [${accounts.join(",")}], fast: false) }`)).synchronize;
  }

  async address(account: number): Promise<string> {
    return (await this.query<{ addressByAccount: { ua: string } }>(`{ addressByAccount(idAccount: ${account}) { ua } }`)).addressByAccount.ua;
  }

  async transactions(account: number): Promise<Tx[]> {
    return (await this.query<{ transactionsByAccount: Tx[] }>(
      `{ transactionsByAccount(idAccount: ${account}) { txid height time value notes { pool value scope memo address } } }`,
    )).transactionsByAccount;
  }

  async pay(account: number, address: string, amountZec: string, memo: string): Promise<string> {
    const safe = memo.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    await this.synchronize([account]);
    return (await this.query<{ pay: string }>(
      `mutation { pay(idAccount: ${account}, payment: { recipients: [{ address: "${address}", amount: ${amountZec}, memo: "${safe}" }], confirmations: 1 }) }`,
    )).pay;
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
