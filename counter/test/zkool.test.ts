import { describe, it, expect } from "vitest";
import { Zkool } from "../src/zkool.js";

// Requirement (from Steeve's review of the same client in zshield-mcp PR 4):
// nothing a payer or Bitrefill controls is ever pasted into the GraphQL text,
// the account id is a positive integer, a non-2xx answer is an error, and a
// request that hangs gives up instead of stalling the counter's loop.

type Sent = { query: string; variables?: Record<string, unknown> };

function fakeFetch(answer: unknown, status = 200) {
  const sent: Sent[] = [];
  const fetch = async (_url: string | URL | Request, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body)));
    return new Response(typeof answer === "string" ? answer : JSON.stringify(answer), { status });
  };
  return { sent, fetch: fetch as typeof globalThis.fetch };
}

const TXID = "ab".repeat(32);

describe("zkool client", () => {
  it("sends the recipient, amount and memo as variables, never in the query text", async () => {
    const { sent, fetch } = fakeFetch({ data: { synchronize: 1, pay: TXID } });
    const zkool = new Zkool("http://zkool", { fetch });
    const address = 'utest1abc", amount: 99 }, { address: "utest1evil';
    const memo = 'IRON-RECEIPT x" }], confirmations: 0 }) }\nmutation { y';
    expect(await zkool.pay(1, address, "0.0001", memo)).toBe(TXID);
    const pay = sent.find((s) => s.query.includes("pay("))!;
    expect(pay.query).not.toContain("utest1");
    expect(pay.query).not.toContain("IRON-RECEIPT");
    expect(pay.query).not.toContain("0.0001");
    expect(pay.variables).toEqual({
      account: 1,
      payment: { recipients: [{ address, amount: "0.0001", memo }], confirmations: 1 },
    });
  });

  it("passes the account as a variable in every query", async () => {
    const { sent, fetch } = fakeFetch({ data: { synchronize: 5, addressByAccount: { ua: "utest1x" }, transactionsByAccount: [] } });
    const zkool = new Zkool("http://zkool", { fetch });
    await zkool.synchronize([2]);
    await zkool.address(2);
    await zkool.transactions(2);
    for (const s of sent) expect(s.query).not.toMatch(/\d/);
    expect(sent.map((s) => s.variables)).toEqual([{ accounts: [2] }, { account: 2 }, { account: 2 }]);
  });

  it("refuses an account id that is not a positive integer, before any request", async () => {
    const { sent, fetch } = fakeFetch({ data: {} });
    const zkool = new Zkool("http://zkool", { fetch });
    for (const bad of [0, -1, 1.5, Number.NaN, 2 ** 40]) {
      await expect(zkool.pay(bad, "utest1x", "0.0001", "m")).rejects.toThrow(/account/);
      await expect(zkool.address(bad)).rejects.toThrow(/account/);
      await expect(zkool.transactions(bad)).rejects.toThrow(/account/);
      await expect(zkool.synchronize([bad])).rejects.toThrow(/account/);
    }
    expect(sent).toEqual([]);
  });

  it("refuses an amount that is not a plain decimal of at most 8 places", async () => {
    const { sent, fetch } = fakeFetch({ data: {} });
    const zkool = new Zkool("http://zkool", { fetch });
    for (const bad of ["1e-4", "-0.1", "0.000000001", "0.1 }", ""]) {
      await expect(zkool.pay(1, "utest1x", bad, "m")).rejects.toThrow(/amount/);
    }
    expect(sent).toEqual([]);
  });

  it("treats a non-2xx answer as an error, even without a JSON body", async () => {
    const { fetch } = fakeFetch("<html>bad gateway</html>", 502);
    await expect(new Zkool("http://zkool", { fetch }).address(1)).rejects.toThrow(/502/);
  });

  it("gives up on a request that hangs", async () => {
    const hang = ((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
      })) as unknown as typeof globalThis.fetch;
    const started = Date.now();
    await expect(new Zkool("http://zkool", { fetch: hang, timeoutMs: 50 }).address(1)).rejects.toThrow(/timed out|abort/i);
    expect(Date.now() - started).toBeLessThan(2_000);
  });
});
