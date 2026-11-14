// What sits with the second key, drawn from the real thing: the deployed policy file, a payment as the
// co-signer decodes it, two chained lines of its ledger (from the zshield-mcp run on 14 November), and the
// three shares. The decoded payment is the approved one in that ledger: 0.001 TAZ with a 10,000 zat fee.

import { Section, SectionHeading, Tile } from "./pieces.tsx";

export function Rules() {
  return (
    <Section id="rules" label="rules-title">
      <SectionHeading id="rules-title" title="The rules live with the key." line="Not in the prompt, where an agent can be talked out of them." />
      <div className="grid gap-4 lg:grid-cols-5">
        <Tile className="lg:col-span-3" title="Your rules, in one file" line="Who it may pay, how much at once and per day, the most it pays in fees, and when the rules expire.">
          <PolicyFile />
        </Tile>
        <Tile className="lg:col-span-2" title="It reads the payment itself" line="It decodes the proven transaction, so an agent can't describe one payment and send another.">
          <Decoded />
        </Tile>
        <Tile className="lg:col-span-2" title="A log that can't be edited quietly" line="Each decision is chained to the one before, and written before the share leaves.">
          <Ledger />
        </Tile>
        <Tile className="lg:col-span-3" title="Your share stays offline" line="The third share is yours, to recover the funds or overrule the co-signer.">
          <Shares />
        </Tile>
      </div>
    </Section>
  );
}

const key = "text-ink-soft";
const num = "text-signal-deep";
const str = "text-positive";

function PolicyFile() {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-[12px] border border-line-soft bg-paper">
      <div className="border-b border-line-soft px-4 py-2.5 font-mono text-[0.75rem] text-ink-faint">policy/example-policy.json</div>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[0.78rem] leading-[1.75] sm:text-[0.82rem]">
        {"{\n"}
        {"  "}
        <span className={key}>"name"</span>: <span className={str}>"household top-ups"</span>,{"\n"}
        {"  "}
        <span className={key}>"network"</span>: <span className={str}>"test"</span>,{"\n"}
        {"  "}
        <span className={key}>"per_payment_cap_zat"</span>: <span className={num}>20000000</span>,{"\n"}
        {"  "}
        <span className={key}>"daily_budget_zat"</span>: <span className={num}>50000000</span>,{"\n"}
        {"  "}
        <span className={key}>"allowed_recipients"</span>: [{"\n    { "}
        <span className={key}>"label"</span>: <span className={str}>"Ironclad counter"</span>,{"\n      "}
        <span className={key}>"address"</span>: <span className={str}>"utest1…"</span>
        {" }\n  "}],{"\n"}
        {"  "}
        <span className={key}>"max_fee_zat"</span>: <span className={num}>30000</span>,{"\n"}
        {"  "}
        <span className={key}>"expires"</span>: <span className={str}>"2026-12-31T23:59:59Z"</span>
        {"\n}"}
      </pre>
    </div>
  );
}

function Decoded() {
  const rows: [string, string][] = [
    ["payments", "1"],
    ["to", "Ironclad counter"],
    ["amount", "0.001 TAZ"],
    ["fee", "0.0001 TAZ"],
    ["network", "testnet"],
  ];
  return (
    <dl className="w-full rounded-[12px] border border-line-soft bg-paper px-4 py-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-3 border-b border-line-soft py-2 last:border-b-0">
          <dt className="font-mono text-[0.78rem] text-ink-faint">{label}</dt>
          <dd className="font-mono text-[0.82rem]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Ledger() {
  const lines = [
    { allowed: true, at: "09:20:16", what: "0.001 TAZ to counter", hash: "ebf4d378eb3d", prev: "ac7f87b0d22b" },
    { allowed: false, at: "09:20:59", what: "0.21 TAZ to counter", hash: "84c59e93b114", prev: "ebf4d378eb3d" },
  ];
  return (
    <ol className="flex w-full flex-col gap-2">
      {lines.map((line) => (
        <li key={line.hash} className="rounded-[12px] border border-line-soft bg-paper px-4 py-3">
          <p className="flex items-baseline justify-between gap-3">
            <span className={`font-bold ${line.allowed ? "text-positive" : "text-danger"}`}>{line.allowed ? "allow" : "refuse"}</span>
            <span className="font-mono text-[0.75rem] text-ink-faint">{line.at} UTC</span>
          </p>
          <p className="mt-0.5 text-[0.95rem]">{line.what}</p>
          <p className="mt-1.5 flex flex-wrap gap-x-3 font-mono text-[0.72rem] text-ink-faint">
            <span>hash {line.hash}…</span>
            <span className={line.allowed ? undefined : "text-signal-deep"}>prev {line.prev}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}

function Shares() {
  const shares = [
    { who: "Agent", n: 1, where: "on the agent's server" },
    { who: "Co-signer", n: 2, where: "with your rules" },
    { who: "You", n: 3, where: "offline", offline: true },
  ];
  return (
    <ul className="grid w-full gap-3 sm:grid-cols-3">
      {shares.map((share) => (
        <li
          key={share.n}
          className={`flex flex-col gap-6 rounded-[12px] px-4 py-4 ${share.offline ? "border-[1.5px] border-dashed border-ink-faint bg-transparent" : "border border-line-soft bg-paper"}`}
        >
          <span className="font-mono text-[0.75rem] text-ink-faint">share {share.n} of 3</span>
          <span>
            <span className="block font-heading text-[1.35rem] leading-none font-bold">{share.who}</span>
            <span className="mt-1.5 block text-sm text-ink-soft">{share.where}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
