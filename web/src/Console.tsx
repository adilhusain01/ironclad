// The hero's live panel: the owner's rules on the left, the real agent's terminal in the middle, and
// three keys that run it on the right. Every line in the terminal is streamed from the server.

import { useEffect, useRef, useState } from "react";
import { startRun, TAZ, type DemoKind, type Order, type Run, type State } from "./api.ts";
import { CheckIcon, CrossIcon, TxLink } from "./pieces.tsx";
import { humanReason, outcomeOf, spentTodayZat, tidyLine } from "./run.ts";

const asks: { kind: DemoKind; title: string; line: string; command: string }[] = [
  { kind: "buy", title: "Buy a test top-up", line: "0.01 TAZ to the counter, inside the rules", command: "ironclad buy test-phone-refill 10" },
  { kind: "overcap", title: "Pay 0.25 TAZ", line: "Over the 0.2 TAZ cap per payment", command: "ironclad pay <counter> 0.25 TAZ" },
  { kind: "unknown", title: "Pay a stranger", line: "An address that isn't on your list", command: "ironclad pay <stranger> 0.02 TAZ" },
];

const COOLDOWN_MS = 45_000;

export function Console({ state, error, refresh }: { state: State | null; error: string | null; refresh: () => void }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const now = useNow();
  const run = state?.run ?? null;
  const running = pending || Boolean(run && !run.done);
  const readyIn = run?.endedAt ? Math.max(0, Math.ceil((Date.parse(run.endedAt) + COOLDOWN_MS - now) / 1000)) : 0;

  const ask = async (kind: DemoKind) => {
    setMessage(null);
    setPending(true);
    const result = await startRun(kind);
    if (!result.ok) setMessage(result.message);
    refresh();
    window.setTimeout(() => setPending(false), 1500);
  };

  return (
    <div className="grid overflow-hidden rounded-outer border border-line bg-panel text-left lg:grid-cols-[280px_minmax(0,1fr)_300px]">
      <Rules state={state} />
      <div className="order-first flex min-w-0 flex-col border-line lg:order-none lg:border-x">
        <Terminal run={run} error={error} />
        <Result run={run} orders={state?.orders ?? []} />
      </div>
      <div className="flex flex-col gap-4 border-t border-line p-4 lg:border-t-0">
        <h3 className="text-meta font-medium text-ink">Ask the agent</h3>
        <div className="flex flex-col gap-2.5">
          {asks.map((item) => (
            <button
              key={item.kind}
              type="button"
              disabled={running || readyIn > 0 || !state}
              onClick={() => ask(item.kind)}
              className="press key-lift flex cursor-pointer flex-col gap-0.5 rounded-inner border border-line-strong bg-key px-4 py-3 text-left shadow-key hover:bg-key-hover disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none"
            >
              <span className="text-body font-medium text-ink">{item.title}</span>
              <span className="text-small text-ink-muted">{item.line}</span>
            </button>
          ))}
        </div>
        <p className="text-small text-ink-muted" aria-live="polite">
          {message ?? (running ? "The agent is working. Watch the terminal." : readyIn > 0 ? `The wallet is free again in ${readyIn} s.` : "Each key runs the real agent on Zcash testnet. A run takes under a minute.")}
        </p>
        <Shares />
      </div>
    </div>
  );
}

function Rules({ state }: { state: State | null }) {
  const policy = state?.policy;
  const spent = state ? spentTodayZat(state.ledger, new Date(state.now)) : null;
  const rows: [string, string][] = policy
    ? [
        ["Per payment", `up to ${TAZ(policy.per_payment_cap_zat)}`],
        ["Per day", `up to ${TAZ(policy.daily_budget_zat)}`],
        ["Pays only", policy.allowed_recipients.map((r) => r.label.replace(/ \(.*\)$/, "")).join(", ")],
        ["Fee", `up to ${policy.max_fee_zat.toLocaleString("en-US")} zat`],
        ["Valid until", new Date(policy.expires).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })],
      ]
    : [];
  return (
    <div className="order-last flex flex-col gap-4 border-t border-line p-4 lg:order-none lg:border-t-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-meta font-medium text-ink">Your rules</h3>
        {policy && <span className="text-small text-ink-faint">{policy.name}</span>}
      </div>
      <dl className="flex flex-col rounded-inner bg-tray shadow-tray">
        {rows.length === 0 && <div className="px-3 py-3 text-small text-ink-faint">Loading the rules from the co-signer</div>}
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 border-t border-line px-3 py-2.5 first:border-t-0">
            <dt className="text-small text-ink-muted">{label}</dt>
            <dd className="text-right text-meta text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {policy && spent !== null && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between text-small">
            <span className="text-ink-muted">Let through today</span>
            <span className="text-ink">
              {TAZ(spent)} of {TAZ(policy.daily_budget_zat)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-tiny bg-tray shadow-tray">
            <div className="h-full rounded-tiny bg-allow transition-[width] duration-300 ease-out" style={{ width: `${Math.min(100, (spent / policy.daily_budget_zat) * 100)}%` }} />
          </div>
        </div>
      )}
      <p className="text-small text-ink-muted">The co-signer holds these rules. The agent can't change them.</p>
    </div>
  );
}

function Terminal({ run, error }: { run: Run | null; error: string | null }) {
  const body = useRef<HTMLDivElement>(null);
  // The wrapper's "<command> failed:" line repeats what the next line says better.
  const lines = run?.lines.map(tidyLine).filter((line) => line.trim() && !/ failed:$/.test(line)) ?? [];
  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight });
  }, [lines.length]);
  const command = asks.find((item) => item.kind === run?.kind)?.command;
  const status = !run ? "Idle" : run.done ? "Finished" : "Running";
  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <span className="font-mono text-meta text-ink">agent</span>
        <span className={`rounded-tiny px-2 py-0.5 text-small ${status === "Running" ? "bg-raised text-running" : "text-ink-faint"}`}>
          {status}
          {run?.startedAt && status !== "Running" && ` ${ago(run.startedAt)}`}
        </span>
      </div>
      <div ref={body} className="h-[300px] overflow-auto bg-terminal px-4 py-3 font-mono text-small leading-relaxed text-terminal-ink sm:h-[340px]" role="log" aria-live="polite" aria-label="The agent's output">
        {error && !run && <p className="text-terminal-red">{error}</p>}
        {!run && !error && <p className="text-terminal-ink/70">Press a key on the right. The agent runs for real and its output appears here.</p>}
        {command && (
          <p className="text-terminal-bright">
            <span className="text-terminal-orange">$ </span>
            {command}
          </p>
        )}
        {lines.map((line, index) => (
          <p key={index} className={`break-words whitespace-pre-wrap ${lineTone(line)}`}>
            {line}
          </p>
        ))}
        {run && !run.done && <span className="caret inline-block h-4 w-2 translate-y-0.5 bg-terminal-ink" aria-hidden="true" />}
      </div>
    </div>
  );
}

function lineTone(line: string): string {
  if (/refused|error|failed|Error/.test(line)) return "text-terminal-red";
  if (/^sent: /.test(line)) return "text-terminal-green";
  if (/^https:\/\//.test(line)) return "text-terminal-ink/80";
  if (/^\s*(\[device|spend|change|fee|PAY|WARNING)/.test(line)) return "text-terminal-ink/70";
  return "";
}

// What the run ended in, said in plain words, and for a purchase what the counter did with it.
function Result({ run, orders }: { run: Run | null; orders: Order[] }) {
  if (!run) return null;
  const outcome = outcomeOf(run);
  if (outcome.kind === "running") return <Banner tone="running" title="Running" detail={outcome.step} />;
  if (outcome.kind === "refused") return <Banner tone="refuse" title="Refused at the key. No transaction exists." detail={humanReason(outcome.reason)} />;
  if (outcome.kind === "failed") return <Banner tone="refuse" title="The run stopped" detail={outcome.detail} />;
  const order = orders.find((item) => item.txid === outcome.txid);
  return (
    <Banner tone="allow" title="Signed by two of three shares and sent">
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <TxLink txid={outcome.txid} />
        {run.kind === "buy" && <span className="text-ink-muted">{orderLine(order)}</span>}
        {order?.receiptTxid && <TxLink txid={order.receiptTxid} label="receipt memo" />}
      </span>
    </Banner>
  );
}

function orderLine(order: Order | undefined): string {
  if (!order) return "The counter buys once the payment is mined, usually within two minutes.";
  if (order.status === "delivered") return `Bitrefill delivered it. Invoice ${order.invoiceId?.slice(0, 8)}`;
  if (order.status === "failed" || order.error) return `The counter couldn't buy it: ${order.error ?? order.status}`;
  return `The counter is buying it from Bitrefill (${order.status})`;
}

function Banner({ tone, title, detail, children }: { tone: "allow" | "refuse" | "running"; title: string; detail?: string; children?: React.ReactNode }) {
  const color = tone === "allow" ? "text-allow" : tone === "refuse" ? "text-refuse" : "text-running";
  return (
    <div className="flex gap-3 border-t border-line px-4 py-3">
      <span className={`mt-0.5 shrink-0 ${color}`}>{tone === "allow" ? <CheckIcon size={18} /> : tone === "refuse" ? <CrossIcon size={18} /> : <Spinner />}</span>
      <div className="flex min-w-0 flex-col gap-1 text-meta">
        <span className={`font-medium ${color}`}>{title}</span>
        {detail && <span className="break-words text-ink-muted">{tidyLine(detail)}</span>}
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden="true" className="animate-spin motion-reduce:animate-none">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity={0.25} strokeWidth={2.5} />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}

function Shares() {
  const shares: [string, string, boolean][] = [
    ["Agent", "Share 1. Proposes payments.", true],
    ["Co-signer", "Share 2. Signs only inside your rules.", true],
    ["You", "Share 3. Kept offline for recovery.", false],
  ];
  return (
    <div className="mt-auto flex flex-col gap-2 border-t border-line pt-4">
      <h3 className="text-meta font-medium text-ink">Key shares, two needed to sign</h3>
      <ul className="flex flex-col gap-2">
        {shares.map(([name, line, online]) => (
          <li key={name} className="flex items-start gap-2.5">
            <span className={`mt-1.5 size-2 shrink-0 rounded-mark ${online ? "bg-allow" : "border border-ink-faint"}`} aria-hidden="true" />
            <span className="text-small">
              <span className="font-medium text-ink">{name}</span> <span className="text-ink-muted">{line}</span>
              <span className="sr-only">{online ? " Online." : " Offline."}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

export function ago(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
}
