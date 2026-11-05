// The live demo: three keys that run the real agent, the owner's rules, and what the agent is doing,
// told as plain steps that light up from its real output. The raw terminal is one click away. The
// panel can go full screen for a stage.

import { useEffect, useRef, useState } from "react";
import { startRun, TAZ, type DemoKind, type Order, type Run, type State } from "./api.ts";
import { CheckIcon, CrossIcon, TxLink } from "./pieces.tsx";
import { humanReason, outcomeOf, spentTodayZat, stepsOf, tidyLine, type Step } from "./run.ts";

// In the order a demo goes: the two attacks first, then a purchase inside the rules.
const asks: { kind: DemoKind; title: string; line: string; command: string }[] = [
  { kind: "unknown", title: "Pay a stranger", line: "A prompt injection: send money to an address that isn't on your list", command: "ironclad pay <stranger> 0.02 TAZ" },
  { kind: "overcap", title: "Pay 0.25 TAZ", line: "The right address, over the 0.2 TAZ cap per payment", command: "ironclad pay <counter> 0.25 TAZ" },
  { kind: "buy", title: "Buy a test top-up", line: "0.01 TAZ to the counter, inside the rules, through Bitrefill", command: "ironclad buy test-phone-refill 10" },
];

const COOLDOWN_MS = 5_000;

export function Console({ state, error, refresh }: { state: State | null; error: string | null; refresh: () => void }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<DemoKind | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const full = useFullscreen(panel);
  const now = useNow();
  const run = state?.run ?? null;
  const running = Boolean(pending) || Boolean(run && !run.done);
  const readyIn = run?.endedAt ? Math.max(0, Math.ceil((Date.parse(run.endedAt) + COOLDOWN_MS - now) / 1000)) : 0;
  const active = pending ?? (run && !run.done ? run.kind : null);

  const ask = async (kind: DemoKind) => {
    setMessage(null);
    setPending(kind);
    const result = await startRun(kind);
    if (!result.ok) setMessage(result.message);
    refresh();
    window.setTimeout(() => setPending(null), 1500);
  };

  return (
    <div ref={panel} className="demo-panel overflow-auto rounded-xl border border-line bg-paper-2/70 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h3 className="font-heading text-[1.5rem] leading-tight font-semibold tracking-[-0.01em]">Live demo</h3>
          <p className="text-sm text-ink-soft">Each key runs the real agent and co-signer on Zcash testnet.</p>
        </div>
        <button type="button" onClick={full.toggle} className="press inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg px-4 text-sm font-bold text-ink shadow-[inset_0_0_0_1.5px_var(--color-ink)] hover:bg-ink/[0.06]">
          <FullscreenIcon exit={full.on} />
          {full.on ? "Exit full screen" : "Full screen"}
        </button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6 border-b border-line p-5 lg:border-r lg:border-b-0">
          <div className="flex flex-col gap-2">
            {asks.map((item, index) => (
              <button
                key={item.kind}
                type="button"
                disabled={running || readyIn > 0 || !state}
                onClick={() => ask(item.kind)}
                className={`press flex cursor-pointer items-start gap-3 rounded-lg px-4 py-3.5 text-left disabled:cursor-not-allowed ${
                  active === item.kind ? "bg-ink text-paper" : "shadow-[inset_0_0_0_1.5px_var(--color-line)] hover:shadow-[inset_0_0_0_1.5px_var(--color-ink)] disabled:opacity-50"
                }`}
              >
                <span className={`font-heading text-[1.6rem] leading-none font-semibold ${active === item.kind ? "text-signal" : "text-ink-faint"}`}>{index + 1}</span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[1.05rem] font-bold">{item.title}</span>
                  <span className={`text-sm leading-snug ${active === item.kind ? "text-paper-3" : "text-ink-soft"}`}>{item.line}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="text-sm text-ink-soft" aria-live="polite">
            {message ?? (running ? "The agent is working." : readyIn > 0 ? `Ready again in ${readyIn} s.` : "Press a key. A run takes 15 to 30 seconds.")}
          </p>
          <Rules state={state} />
        </div>

        <div className="flex min-w-0 flex-col gap-5 p-5">
          <Story run={run} orders={state?.orders ?? []} error={error} />
          <Raw run={run} />
        </div>
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
      ]
    : [];
  return (
    <div className="flex flex-col">
      <span className="pb-2 text-sm text-ink-soft">Your rules, held by the co-signer</span>
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-3 border-t border-line py-2.5">
          <span className="text-sm text-ink-soft">{label}</span>
          <span className="text-right font-mono text-[0.85rem]">{value}</span>
        </div>
      ))}
      {policy && spent !== null && (
        <div className="flex items-baseline justify-between gap-3 border-t border-line py-2.5">
          <span className="text-sm text-ink-soft">Let through today</span>
          <span className="font-mono text-[0.85rem]">{TAZ(spent)}</span>
        </div>
      )}
      {!policy && <span className="border-t border-line py-2.5 text-sm text-ink-faint">Loading the rules</span>}
    </div>
  );
}

const LABELS: Record<Step["key"], string> = {
  sync: "Sync the wallet over Tor",
  build: "Build a shielded payment",
  prove: "Prove it",
  ask: "Ask the co-signer for its share",
  sign: "The co-signer checks your rules",
  send: "Broadcast over Tor",
  deliver: "Bitrefill delivers the top-up",
};

// What the agent is doing, in plain steps, with the outcome as the one big thing to read.
function Story({ run, orders, error }: { run: Run | null; orders: Order[]; error: string | null }) {
  if (!run) {
    return (
      <div className="flex min-h-[320px] flex-col justify-center gap-2">
        <span className="font-heading text-[1.75rem] leading-tight font-semibold tracking-[-0.01em]">{error ?? "Press a key to start."}</span>
        <span className="text-ink-soft">The agent's steps appear here as they happen.</span>
      </div>
    );
  }
  const title = asks.find((item) => item.kind === run.kind)?.title ?? run.kind;
  const steps = stepsOf(run, orders);
  const outcome = outcomeOf(run);
  const order = outcome.kind === "sent" ? orders.find((item) => item.txid === outcome.txid) : undefined;
  const memo = run.lines.map((l) => /building a payment of (\d+) zat to (\S+?)…? with/.exec(l)).find(Boolean);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="font-heading text-[1.75rem] leading-tight font-semibold tracking-[-0.01em]">{title}</span>
        <span className="text-sm text-ink-faint">{run.done ? `finished ${ago(run.endedAt ?? run.startedAt)}` : "running"}</span>
      </div>
      <ol className="flex flex-col">
        {steps.map((step) => (
          <li key={step.key} className="flex items-start gap-3 border-t border-line py-2.5 first:border-t-0">
            <StepMark state={step.state} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className={step.state === "todo" ? "text-ink-faint" : step.state === "refused" ? "font-bold text-danger" : step.state === "active" ? "font-bold" : ""}>
                {step.key === "sign" && step.state === "done" ? "The co-signer checked your rules and signed" : step.key === "sign" && step.state === "refused" ? "The co-signer refused to sign" : LABELS[step.key]}
              </span>
              {step.key === "build" && step.state !== "todo" && memo && <span className="text-sm text-ink-soft">{TAZ(Number(memo[1]))} to {run.kind === "unknown" ? "a stranger's address" : "the counter"}</span>}
              {step.key === "sign" && step.state === "refused" && outcome.kind === "refused" && <span className="text-sm text-ink-soft">{humanReason(outcome.reason)}</span>}
              {step.key === "send" && step.state === "done" && outcome.kind === "sent" && <TxLink txid={outcome.txid} label="check it on chain" />}
              {step.key === "deliver" && step.state === "done" && order && (
                <span className="flex flex-wrap items-center gap-x-3 text-sm text-ink-soft">
                  Invoice {order.invoiceId?.slice(0, 8)}
                  {order.receiptTxid && <TxLink txid={order.receiptTxid} label="shielded receipt" />}
                </span>
              )}
              {step.key === "deliver" && step.state === "active" && <span className="text-sm text-ink-soft">Waiting for the block, usually about a minute</span>}
            </div>
          </li>
        ))}
      </ol>
      <Verdict run={run} order={order} />
    </div>
  );
}

function Verdict({ run, order }: { run: Run; order?: Order }) {
  const outcome = outcomeOf(run);
  if (outcome.kind === "running") return null;
  const tone =
    outcome.kind === "refused" || outcome.kind === "failed" || order?.status === "failed"
      ? { box: "bg-danger/10 text-danger", icon: <CrossIcon size={22} /> }
      : { box: "bg-positive/10 text-positive", icon: <CheckIcon size={22} /> };
  const text =
    outcome.kind === "refused"
      ? "Refused at the key. No signature exists, so there is nothing to broadcast."
      : outcome.kind === "failed"
        ? `The run stopped: ${tidyLine(outcome.detail)}`
        : order?.status === "delivered"
          ? "Signed inside your rules, sent shielded, and delivered by Bitrefill."
          : order?.status === "failed"
            ? "Signed and sent, but Bitrefill couldn't fill the order."
            : "Signed by two of three shares and sent. The counter buys once the block lands.";
  return (
    <div className={`flex items-center gap-3 rounded-lg px-4 py-3.5 font-bold ${tone.box}`}>
      {tone.icon}
      <span>{text}</span>
    </div>
  );
}

function StepMark({ state }: { state: Step["state"] }) {
  if (state === "done") return <span className="mt-0.5 shrink-0 text-positive"><CheckIcon size={18} /></span>;
  if (state === "refused") return <span className="mt-0.5 shrink-0 text-danger"><CrossIcon size={18} /></span>;
  if (state === "active")
    return (
      <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 shrink-0 animate-spin text-signal motion-reduce:animate-none">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity={0.25} strokeWidth={2.5} />
        <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
      </svg>
    );
  return <span className="mt-1.5 ml-1 size-2.5 shrink-0 rounded-full border-[1.5px] border-line" aria-hidden="true" />;
}

// The agent's real output, for anyone who wants to read it.
function Raw({ run }: { run: Run | null }) {
  const body = useRef<HTMLDivElement>(null);
  const lines = run?.lines.map(tidyLine).filter((line) => line.trim() && !/ failed:$/.test(line)) ?? [];
  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight });
  }, [lines.length]);
  if (!run) return null;
  const command = asks.find((item) => item.kind === run.kind)?.command;
  return (
    <details className="group rounded-lg bg-term text-term-ink">
      <summary className="cursor-pointer list-none px-4 py-3 font-mono text-[0.8rem] text-term-faint select-none hover:text-term-ink">
        <span className="group-open:hidden">Show the agent's raw output</span>
        <span className="hidden group-open:inline">Hide the agent's raw output</span>
      </summary>
      <div ref={body} className="max-h-[300px] overflow-auto border-t border-term-line px-4 py-3 font-mono text-[0.78rem] leading-relaxed" role="log" aria-label="The agent's output">
        {command && (
          <p className="text-paper">
            <span className="text-term-orange">$ </span>
            {command}
          </p>
        )}
        {lines.map((line, index) => (
          <p key={index} className={`break-words whitespace-pre-wrap ${/refused|error|Error/.test(line) ? "text-term-red" : /^sent: /.test(line) ? "text-term-green" : /^\s*(\[device|spend|change|fee|PAY|WARNING|https:\/\/)/.test(line) ? "text-term-faint" : ""}`}>
            {line}
          </p>
        ))}
      </div>
    </details>
  );
}

function FullscreenIcon({ exit }: { exit: boolean }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {exit ? <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" /> : <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />}
    </svg>
  );
}

// Full screen for the panel itself, so a stage shows only the demo; Esc or the button leaves it.
function useFullscreen(target: React.RefObject<HTMLElement | null>) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const update = () => setOn(document.fullscreenElement === target.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, [target]);
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void target.current?.requestFullscreen?.();
  };
  return { on, toggle };
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
