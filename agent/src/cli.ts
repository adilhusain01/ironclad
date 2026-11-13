#!/usr/bin/env node
// The agent side of Ironclad: holds one FROST share, proposes payments and
// asks the policy co-signer for the second signature. It cannot sign alone.
//
//   ironclad buy <product-id> <value> [--phone <number>] [--zat <amount>]
//   ironclad pay <address> <zat> [--memo <text>]     (any payment, for the refusal demo)
//   ironclad ledger                                   (the co-signer's decisions)
//   ironclad policy                                   (the standing instruction)
//   ironclad status                                   (group address, balance)
//
// Environment (see .env.example): DEVTOOL, COSIGNER_BIN, GROUP_WALLET, FROST_DATA_DIR,
// SESSION_DIR, COUNTER_ADDRESS, POLICY_FILE, LEDGER_FILE, AGENT_SHARE.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { orderMemo } from "./order.js";

const env = (k: string, fallback?: string) => {
  const v = process.env[k] ?? fallback;
  if (v === undefined) {
    console.error(`missing env ${k}`);
    process.exit(2);
  }
  return v;
};

const DEVTOOL = env("DEVTOOL", "../.tools/zcash-devtool/target/release/zcash-devtool");
const COSIGNER = env("COSIGNER_BIN", "../cosigner/target/release/ironclad-cosigner");
const GROUP_WALLET = env("GROUP_WALLET", "../.wallets/group");
const FROST_DATA_DIR = env("FROST_DATA_DIR", "../.wallets/frost");
const SESSION_DIR = env("SESSION_DIR", "../.wallets/frost/session");
const COUNTER_ADDRESS = process.env.COUNTER_ADDRESS ?? "";
const POLICY_FILE = env("POLICY_FILE", "../policy/example-policy.json");
const LEDGER_FILE = env("LEDGER_FILE", "../.wallets/frost/ledger.jsonl");
const AGENT_SHARE = env("AGENT_SHARE", "1");
// "tor" routes the wallet's sync and broadcast through zcash-devtool's built-in Tor client,
// so the light wallet server never sees this machine's address. "direct" for debugging.
const CONNECTION = env("DEVTOOL_CONNECTION", "tor");

function run(cmd: string, args: string[], opts: { cwd?: string; input?: Buffer; quiet?: boolean } = {}): Buffer {
  const r = spawnSync(cmd, args, { cwd: opts.cwd, input: opts.input, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed:\n${r.stderr.toString()}\n${r.stdout.toString().slice(0, 500)}`);
  }
  if (!opts.quiet && r.stderr.length) process.stderr.write(r.stderr);
  return r.stdout;
}

function flagValue(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

/**
 * Builds, proves, co-signs and sends one payment from the group. Returns the
 * txid. Progress goes to `log`: the MCP server passes one that writes to
 * stderr, because its stdout carries the protocol.
 */
export function pay(address: string, zat: number, memo: string, log: (line: string) => void = console.log): string {
  if (!Number.isSafeInteger(zat) || zat <= 0) throw new Error(`amount must be a whole number of zatoshis, got ${zat}`);
  const work = mkdtempSync(join(tmpdir(), "ironclad-"));
  try {
    const created = join(work, "created.pczt");
    const proven = join(work, "proven.pczt");
    const signed = join(work, "signed.pczt");
    log(`syncing the group wallet over ${CONNECTION}`);
    run(DEVTOOL, ["wallet", "-w", GROUP_WALLET, "sync", "-s", "zecrocks", "--connection", CONNECTION], { quiet: true });
    log(`building a payment of ${zat} zat to ${address.slice(0, 14)}… with memo "${memo}"`);
    run(DEVTOOL, ["pczt", "-w", GROUP_WALLET, "create", "--address", address, "--value", String(zat), "--memo", memo, "--output", created], { quiet: true });
    log("proving (this takes a few seconds)");
    const provenBytes = run(DEVTOOL, ["pczt", "-w", GROUP_WALLET, "prove"], { input: readFileSync(created), quiet: true });
    writeFileSync(proven, provenBytes);
    log(`asking the policy co-signer for its share (session ${SESSION_DIR})`);
    const out = run(COSIGNER, ["coordinate", "--as", AGENT_SHARE, "--dir", SESSION_DIR, "--pczt", proven, "--out", signed], { cwd: FROST_DATA_DIR });
    log(out.toString().trimEnd());
    log(`broadcasting over ${CONNECTION}`);
    const sent = run(DEVTOOL, ["pczt", "-w", GROUP_WALLET, "send", "-s", "zecrocks", "--connection", CONNECTION], { input: readFileSync(signed), quiet: true }).toString();
    const txid = sent.match(/[0-9a-f]{64}/)?.[0] ?? sent.trim();
    log(`sent: ${txid}\nhttps://zexplorer.app/testnet/tx/${txid}`);
    return txid;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

function main(argv: string[]) {
  const [cmd, ...rest] = argv;
  switch (cmd) {
    case "buy": {
      const [productId, valueText] = rest;
      if (!productId || !valueText) throw new Error("usage: ironclad buy <product-id> <value> [--phone N] [--zat Z]");
      if (!COUNTER_ADDRESS) throw new Error("COUNTER_ADDRESS is not set");
      const { orderId, memo } = orderMemo(productId, Number(valueText), flagValue(rest, "--phone"));
      const zat = Number(flagValue(rest, "--zat") ?? 1_000_000);
      console.log(`order ${orderId}: ${productId} ${valueText}${flagValue(rest, "--phone") ? " for " + flagValue(rest, "--phone") : ""}`);
      pay(COUNTER_ADDRESS, zat, memo);
      return;
    }
    case "pay": {
      const [address, zatText] = rest;
      if (!address || !zatText) throw new Error("usage: ironclad pay <address> <zat> [--memo text]");
      pay(address, Number(zatText), flagValue(rest, "--memo") ?? "");
      return;
    }
    case "ledger": {
      if (!existsSync(LEDGER_FILE)) return void console.log("no decisions yet");
      for (const line of readFileSync(LEDGER_FILE, "utf8").split("\n").filter(Boolean)) {
        const e = JSON.parse(line);
        const pays = e.payments.map((p: [string, number]) => `${p[1]} zat to ${p[0].slice(0, 14)}…`).join(", ");
        console.log(`${e.at} ${e.decision.toUpperCase().padEnd(6)} ${pays}${e.reason ? " (" + e.reason + ")" : ""}  chain ${e.hash.slice(0, 10)}`);
      }
      return;
    }
    case "policy":
      console.log(readFileSync(POLICY_FILE, "utf8"));
      return;
    case "status": {
      process.stdout.write(run(COSIGNER, ["info"], { cwd: FROST_DATA_DIR }));
      process.stdout.write(run(DEVTOOL, ["wallet", "-w", GROUP_WALLET, "balance"]));
      return;
    }
    default:
      console.log("ironclad buy|pay|ledger|policy|status");
  }
}

if (process.argv[1] && /cli\.(ts|js)$/.test(process.argv[1])) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error(String(e instanceof Error ? e.message : e));
    process.exit(1);
  }
}
