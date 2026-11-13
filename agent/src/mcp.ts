// Ironclad as an MCP server, so any agent host (Cursor or any other MCP
// client) can shop through the policy without ever holding a key.
// Tools: search_products, quote, buy, ledger, policy, status.
//
// MCP client config:
// { "mcpServers": { "ironclad": { "command": "npx", "args": ["tsx", "/abs/path/agent/src/mcp.ts"], "env": { ... } } } }

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";
import { pay } from "./cli.js";
import { orderMemo } from "./order.js";

const POLICY_FILE = process.env.POLICY_FILE ?? "../policy/example-policy.json";
const LEDGER_FILE = process.env.LEDGER_FILE ?? "../.wallets/frost/ledger.jsonl";
const COUNTER_ADDRESS = process.env.COUNTER_ADDRESS ?? "";

const server = new McpServer({ name: "ironclad", version: "0.1.0" });

function bitrefillCli(args: string[]): unknown {
  const out = execFileSync("bitrefill", ["--json", ...args], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  return JSON.parse(out);
}

server.registerTool(
  "search_products",
  { description: "Search Bitrefill's catalog (gift cards, top-ups, eSIMs) for a country.", inputSchema: { query: z.string(), country: z.string().default("IN") } },
  async ({ query, country }) => {
    const r: any = bitrefillCli(["search-products", "--query", query, "--country", country, "--intent", "ironclad agent"]);
    const items = (r.products ?? []).map((p: any) => ({ id: p._id ?? p.id, name: p.name, type: p.type, in_stock: p.in_stock }));
    return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
  },
);

server.registerTool(
  "quote",
  { description: "Packages and USD prices for a Bitrefill product id (what the agent may buy).", inputSchema: { product_id: z.string() } },
  async ({ product_id }) => {
    const r: any = bitrefillCli(["get-product-details", "--product_id", product_id]);
    const d = r.data ?? r;
    const packages = (d.packages ?? []).map((p: any) => ({ value: p.package_value ?? p.value, currency: p.package_currency ?? d.currency, usd: p.payment_price }));
    return { content: [{ type: "text", text: JSON.stringify({ id: d.id ?? product_id, name: d.name, recipient_type: d.recipient_type, in_stock: d.in_stock, packages }, null, 2) }] };
  },
);

server.registerTool(
  "buy",
  {
    description:
      "Buy a Bitrefill product through Ironclad: a shielded testnet payment from the FROST group to the counter, carrying the order memo. The policy co-signer refuses anything outside the standing policy; the agent cannot override it.",
    inputSchema: { product_id: z.string(), value: z.number(), phone: z.string().optional(), zat: z.number().default(1_000_000) },
  },
  async ({ product_id, value, phone, zat }) => {
    if (!COUNTER_ADDRESS) return { content: [{ type: "text", text: "COUNTER_ADDRESS is not configured" }], isError: true };
    try {
      const { orderId, memo } = orderMemo(product_id, value, phone);
      // stdout carries the MCP protocol: progress goes to stderr
      const txid = pay(COUNTER_ADDRESS, zat, memo, (line) => process.stderr.write(line + "\n"));
      return { content: [{ type: "text", text: `order ${orderId} sent: txid ${txid} (https://zexplorer.app/testnet/tx/${txid}). The counter buys ${product_id} ${value} once the payment is confirmed.` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `refused or failed: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
    }
  },
);

server.registerTool("ledger", { description: "The policy co-signer's hash-chained decision ledger.", inputSchema: {} }, async () => ({
  content: [{ type: "text", text: existsSync(LEDGER_FILE) ? readFileSync(LEDGER_FILE, "utf8") : "no decisions yet" }],
}));

server.registerTool("policy", { description: "The standing policy the co-signer enforces.", inputSchema: {} }, async () => ({
  content: [{ type: "text", text: readFileSync(POLICY_FILE, "utf8") }],
}));

const transport = new StdioServerTransport();
await server.connect(transport);
