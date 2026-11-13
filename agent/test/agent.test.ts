import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { orderMemo } from "../src/order.js";
import { parseOrderMemo } from "../../counter/src/memo.js";

// Requirements:
// 1. An order memo the agent sends is one the counter can read. A memo the
//    counter cannot parse still costs the payment and buys nothing, so a bad
//    product id, value or phone number is refused before any money moves.
// 2. The MCP server speaks JSON-RPC on stdout and nothing else: a progress
//    line there breaks the client's stream.

describe("order memo", () => {
  it("builds a memo the counter parses back to the same order", () => {
    const { orderId, memo } = orderMemo("airtel-india", 10, "919999999999");
    expect(orderId).toMatch(/^[0-9a-f]{8}$/);
    expect(parseOrderMemo(memo)).toEqual({ orderId, productId: "airtel-india", value: 10, recipient: "919999999999" });
  });

  it("gives every order its own id", () => {
    const ids = new Set(Array.from({ length: 50 }, () => orderMemo("airtel-india", 10).orderId));
    expect(ids.size).toBe(50);
  });

  it("refuses what the counter could not read, before any payment", () => {
    expect(() => orderMemo("airtel india", 10)).toThrow(/product/);
    expect(() => orderMemo("airtel-india", Number.NaN)).toThrow(/value/);
    expect(() => orderMemo("airtel-india", -5)).toThrow(/value/);
    expect(() => orderMemo("airtel-india", 1e21)).toThrow(/value/);
    expect(() => orderMemo("airtel-india", 10, "91 9999 999999")).toThrow(/phone/);
  });
});

describe("MCP server", () => {
  it("writes only JSON-RPC to stdout, even while a payment runs and fails", async () => {
    const child = spawn("npx", ["tsx", "src/mcp.ts"], {
      cwd: new URL("..", import.meta.url).pathname,
      env: { ...process.env, DEVTOOL: "/usr/bin/false", COUNTER_ADDRESS: "utest1counter" },
    });
    let out = "";
    child.stdout.on("data", (c) => (out += c));
    const send = (msg: object) => child.stdin.write(JSON.stringify({ jsonrpc: "2.0", ...msg }) + "\n");
    send({ id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "0" } } });
    send({ method: "notifications/initialized" });
    send({ id: 2, method: "tools/call", params: { name: "buy", arguments: { product_id: "airtel-india", value: 10 } } });
    const deadline = Date.now() + 20_000;
    while (!/"id":2/.test(out) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
    child.kill();
    const lines = out.split("\n").filter(Boolean);
    expect(lines.some((l) => l.includes('"id":2'))).toBe(true);
    for (const line of lines) expect(() => JSON.parse(line), line).not.toThrow();
  }, 30_000);
});
