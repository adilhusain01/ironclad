// Reading the agent's own output: what happened in a run, and how much the rules have let through today.

import { TAZ, type LedgerEntry } from "./api.ts";

export type Outcome =
  | { kind: "running"; step: string }
  | { kind: "sent"; txid: string }
  | { kind: "refused"; reason: string }
  | { kind: "failed"; detail: string };

export function outcomeOf(run: { done: boolean; lines: string[] }): Outcome {
  const lines = run.lines.map((line) => line.trim()).filter(Boolean);
  if (!run.done) return { kind: "running", step: lines.at(-1) ?? "starting" };
  for (const line of lines) {
    const sent = /^sent: ([0-9a-f]{64})$/.exec(line);
    if (sent) return { kind: "sent", txid: sent[1]! };
    const refused = /the co-signer refused to sign: (?:policy: )?(.+)$/.exec(line);
    if (refused) return { kind: "refused", reason: refused[1]! };
  }
  const meaningful = lines.filter((line) => !/^exit code \d+$/.test(line));
  return { kind: "failed", detail: meaningful.at(-1) ?? "The run ended without output." };
}

// The co-signer's daily budget counts allowed payments since 00:00 UTC. The page only sees the latest
// decisions, so it gives a total only when those reach back past the start of the day.
export function spentTodayZat(ledger: Pick<LedgerEntry, "at" | "decision" | "payments">[], now: Date): number | null {
  const dayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const oldest = ledger.at(-1);
  if (!oldest || Date.parse(oldest.at) >= dayStart) return null;
  return ledger
    .filter((entry) => entry.decision === "allow" && Date.parse(entry.at) >= dayStart)
    .reduce((sum, entry) => sum + entry.payments.reduce((total, [, zat]) => total + zat, 0), 0);
}

export function tidyLine(line: string): string {
  return line.replaceAll("/root/Projects/mine/zcash/", "");
}

// The co-signer's reasons are exact; the page says them in TAZ, which is what the rules above show.
export function humanReason(reason: string): string {
  return reason
    .replace(/(\d+) zat to (.+?) is above the per-payment cap of (\d+) zat/, (_, a, to, cap) => `${TAZ(Number(a))} to ${to.replace(/ \(.*\)$/, "")} is over the ${TAZ(Number(cap))} cap per payment`)
    .replace(/recipient (utest1\w+?)…?(\w*) is not on the allow-list/, "the address isn't on the list of allowed recipients")
    .replace(/recipient (\S+) is not on the allow-list/, "the address isn't on the list of allowed recipients");
}


// A run, told as plain steps for the stage: the raw terminal stays available, but this is what a
// viewer follows. Each step lights up as its line appears in the agent's real output.
export type StepState = "todo" | "active" | "done" | "refused";
export type Step = { key: "sync" | "build" | "prove" | "ask" | "sign" | "send" | "deliver"; state: StepState };

const MARKERS: [Step["key"], RegExp][] = [
  ["sync", /^syncing/],
  ["build", /^building a payment/],
  ["prove", /^proving/],
  ["ask", /^asking the policy co-signer/],
  ["sign", /spend\(s\) signed|^broadcasting|^sent: /],
  ["send", /^sent: /],
];

export function stepsOf(run: { done: boolean; kind: string; lines: string[] }, orders: { txid: string; status: string }[]): Step[] {
  const keys: Step["key"][] = ["sync", "build", "prove", "ask", "sign", "send", ...(run.kind === "buy" ? (["deliver"] as const) : [])];
  const lines = run.lines.map((line) => line.trim());
  let reached = -1;
  MARKERS.forEach(([, marker], index) => {
    if (lines.some((line) => marker.test(line))) reached = Math.max(reached, index);
  });
  const outcome = outcomeOf(run);
  if (run.done && outcome.kind === "refused") {
    return keys.slice(0, 5).map((key) => ({ key, state: key === "sign" ? "refused" : "done" }));
  }
  if (run.done && outcome.kind === "failed") {
    return keys.slice(0, Math.max(reached, 0) + 1).map((key, index) => ({ key, state: index === Math.max(reached, 0) ? "refused" : "done" }));
  }
  if (run.done && outcome.kind === "sent") {
    const order = orders.find((item) => item.txid === outcome.txid);
    return keys.map((key) => ({
      key,
      state: key !== "deliver" ? "done" : order?.status === "delivered" ? "done" : order?.status === "failed" ? "refused" : "active",
    }));
  }
  return keys.map((key, index) => ({ key, state: index < reached ? "done" : index === reached ? "active" : "todo" }));
}
