// The Ecosystem Prize milestone page: Ironclad as a chain mode in zshield-mcp. Everything on it is the
// record of one live run on 14 November 2026; the two co-signer decisions are quoted as logged, because
// the live API only returns the 20 most recent ones.

import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/jetbrains-mono";
import "./styles.css";
import { Footer } from "./Closing.tsx";
import { button, CheckIcon, CrossIcon, heading, links, Section, SectionHeading, TxLink } from "./pieces.tsx";

const zshield = {
  branch: "https://github.com/adilhusain01/zshield-mcp/tree/ironclad-mode",
  readme: "https://github.com/adilhusain01/zshield-mcp/tree/ironclad-mode#ironclad-mode",
  adapter: "https://github.com/adilhusain01/zshield-mcp/blob/ironclad-mode/src/chain/ironclad.ts",
  tests: "https://github.com/adilhusain01/zshield-mcp/blob/ironclad-mode/tests/ironclad.test.ts",
  upstream: "https://github.com/Steeve-Crypto/zshield-mcp",
  inspectPr: "https://github.com/adilhusain01/ironclad/pull/2",
};

const APPROVED_TXID = "3202e8ce9d3f0e5008716b8f9a84e69f936f955751493ebb3494f5659dab2b87";

const checks: { title: string; share: string; items: string[] }[] = [
  {
    title: "zshield-mcp",
    share: "share 1, in the agent's MCP server",
    items: [
      "A cap on every zcash_pay call",
      "A recipient allow-list",
      "Testnet addresses only",
      "An idempotency key on every live payment",
      "An audit row written before anything is built",
      "The txid recorded before the broadcast",
    ],
  },
  {
    title: "Ironclad co-signer",
    share: "share 2, on a machine the owner runs",
    items: [
      "Verifies the proven transaction itself, from value commitments to expiry",
      "The recipient must be on the owner's allow-list",
      "A per-payment cap and a daily budget",
      "A fee ceiling and an expiry date for the policy",
      "Logs each decision to a hash-chained ledger before its share leaves",
    ],
  },
];

const steps: { title: string; line: string }[] = [
  { title: "zshield checks the call", line: "Cap, allow-list, network and idempotency key, then the audit row. A call that fails here never reaches the wallet." },
  { title: "zcash-devtool builds and proves it", line: "The payment becomes a proven PCZT from the group wallet, which holds a viewing key only." },
  { title: "zshield reads the co-signer's own check", line: "ironclad-cosigner inspect \u2011\u2011json must find exactly one payment of exactly the requested amount, plus a fee." },
  { title: "The co-signer decides", line: "The signing round runs with the owner's daemon. Inside the policy it adds its share. Outside it, the call ends as not sent, with the reason." },
  { title: "zshield records the txid, then sends", line: "pczt extract gives the txid with nothing broadcast. zshield stores it durably, and only then does pczt send broadcast those bytes." },
];

const runLines: { text: string; tone?: "faint" | "green" | "red" | "orange" }[] = [
  { text: "$ zcash_pay 0.001 TAZ to the counter, cap 0.1", tone: "faint" },
  { text: '  "status": "ok",' },
  { text: '  "txid": "3202e8ce9d3f0e5008716b8f9a84e69f936f955751493ebb3494f5659dab2b87",', tone: "green" },
  { text: '  "amount_zats": "100000",' },
  { text: '  "mode": "live"' },
  { text: "" },
  { text: "$ zcash_pay 0.21 TAZ to the counter, cap raised to 0.25", tone: "faint" },
  { text: '  "allowlist_hit": true,' },
  { text: '  "cap_zec": "0.25",' },
  { text: '  "code": "CHAIN_ERROR",', tone: "red" },
  { text: '  "error": "the Ironclad co-signer refused to sign (policy: 21000000 zat to Ironclad counter (Bitrefill fulfilment, testnet) is above the per-payment cap of 20000000 zat). Nothing was sent."', tone: "red" },
];

const setup = `CHAIN_MODE=ironclad \\
IRONCLAD_DEVTOOL=/opt/ironclad/zcash-devtool \\
IRONCLAD_WALLET_DIR=/var/ironclad/group \\
IRONCLAD_COSIGNER=/opt/ironclad/ironclad-cosigner \\
IRONCLAD_FROST_DIR=/var/ironclad/frost \\
IRONCLAD_SESSION_DIR=/var/ironclad/frost/session \\
VIEW_KEY_FINGERPRINT_SALT=$(openssl rand -hex 32) \\
ALLOWLIST_PATH=./allowlists/testnet.json npm start`;

const trust: string[] = [
  "This demo runs the co-signer on the same server as zshield, so that one machine holds two of the three shares, which is the threshold. In real use the co-signer runs on a machine the owner controls, apart from the agent's.",
  "zcash-devtool takes the memo on its command line, so other users of the same machine can read it in the process list while the payment is built. zshield should run under its own user on a machine you don't share.",
  "zshield compares the amount. The co-signer reports the single receiver it is paying, so the recipient is judged by the co-signer's allow-list.",
  "The wallet syncs and broadcasts over Tor, so the light wallet server, testnet.zec.rocks, sees a Tor exit and the timing of each connection.",
  "Testnet only. zshield refuses mainnet in this mode, and the coins here are worthless TAZ.",
];

function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="font-bold text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
      {children}
    </a>
  );
}

function Bar() {
  return (
    <header className="flex items-center justify-between gap-4 py-5">
      <a href="./" className="flex items-center gap-2.5 rounded-md" aria-label="Ironclad home">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={26} height={26} />
        <span className="font-heading text-[1.5rem] font-semibold tracking-[-0.01em]">Ironclad</span>
      </a>
      <a href={zshield.branch} className={button.outline}>
        Source
      </a>
    </header>
  );
}

function Hero() {
  return (
    <section className="pt-10 pb-20 sm:pt-16">
      <h1 className={`max-w-[15ch] ${heading.hero}`}>An agent's spending cap, enforced by a second key.</h1>
      <p className="mt-8 max-w-[60ch] text-[1.15rem] leading-[1.6] text-ink-soft">
        zshield-mcp gives any MCP client a <code className="font-mono text-[0.95em]">zcash_pay</code> tool with a spending cap, a recipient allow-list and an audit log. With <code className="font-mono text-[0.95em]">CHAIN_MODE=ironclad</code>, the wallet behind that tool is an Ironclad 2-of-3 FROST group. zshield holds one key share and the owner's co-signer holds another, so a payment goes out only when zshield's checks and the owner's policy both allow it.
      </p>
      <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
        <a href="#run" className={button.primary}>
          See the live run
        </a>
        <TextLink href={zshield.readme}>Read the docs</TextLink>
      </div>
    </section>
  );
}

function Checks() {
  return (
    <Section id="checks">
      <SectionHeading title="Two checks, two keys">
        Each side checks the payment on its own and holds its own share. The owner keeps the third share offline, to recover the funds or overrule the co-signer.
      </SectionHeading>
      <div className="mt-12 grid gap-x-16 gap-y-10 md:grid-cols-2">
        {checks.map((side) => (
          <div key={side.title} className="min-w-0">
            <h3 className="font-heading text-[1.6rem] font-semibold tracking-[-0.01em]">{side.title}</h3>
            <p className="mt-1 font-mono text-[0.85rem] text-ink-faint">{side.share}</p>
            <ul className="mt-5 flex flex-col">
              {side.items.map((item) => (
                <li key={item} className="flex gap-3 border-t border-line py-3 leading-[1.5] text-ink-soft last:border-b">
                  <CheckIcon size={16} className="mt-1 shrink-0 text-positive" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Steps() {
  return (
    <Section id="steps">
      <SectionHeading title="One payment, step by step">
        A failure before the last step means nothing was sent. A failure during the broadcast is reported as unknown, with the recorded txid, until the wallet sees that txid mined.
      </SectionHeading>
      <ol className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((step, index) => (
          <li key={step.title} className="flex min-w-0 flex-col gap-2 border-t border-ink pt-4">
            <span className="font-mono text-[0.85rem] text-signal-deep">{String(index + 1).padStart(2, "0")}</span>
            <span className="font-bold">{step.title}</span>
            <span className="leading-[1.55] text-ink-soft">{step.line}</span>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Decision({ allowed, title, line, at, hash, prev, children }: { allowed: boolean; title: string; line: string; at: string; hash: string; prev?: string; children?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 border-t border-line py-6 last:border-b">
      <div className="flex items-center gap-2.5">
        <span className={`grid size-6 shrink-0 place-items-center rounded-sm ${allowed ? "bg-positive text-paper" : "bg-danger text-paper"}`}>
          {allowed ? <CheckIcon size={14} /> : <CrossIcon size={14} />}
        </span>
        <span className="text-[1.05rem] font-bold">{title}</span>
      </div>
      <p className="leading-[1.6] text-ink-soft">{line}</p>
      {children}
      <p className="flex flex-wrap gap-x-3 font-mono text-[0.8rem] text-ink-faint">
        <span>co-signer ledger {at}</span>
        <span>hash {hash.slice(0, 16)}…</span>
        {prev && <span>prev {prev.slice(0, 16)}…</span>}
      </p>
    </div>
  );
}

function Run() {
  const tone = { faint: "text-term-faint", green: "text-term-green", red: "text-term-red", orange: "text-term-orange" };
  return (
    <Section id="run">
      <SectionHeading title="The run on 14 November 2026">
        zshield-mcp ran as an MCP server over stdio, the way an MCP host starts it, against the Ironclad co-signer on testnet. The owner's policy caps one payment at 0.2 TAZ.
      </SectionHeading>
      <div className="mt-12 grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="flex min-w-0 flex-col">
          <Decision
            allowed
            title="0.001 TAZ to the counter, co-signed"
            line="Inside both sets of rules. Mined in testnet block 4,618,918 with a 0.0001 TAZ fee."
            at="2026-11-14T09:20:16Z"
            hash="ebf4d378eb3da7d9665744e96aec7fd24e34e4c4775f6dbc4a837d5d1bb5df76"
          >
            <TxLink txid={APPROVED_TXID} />
          </Decision>
          <Decision
            allowed={false}
            title="0.21 TAZ to the same counter, refused at the key"
            line="zshield's cap was raised to 0.25 TAZ, so zshield's checks passed. The co-signer refused: 21000000 zat is above its per-payment cap of 20000000 zat. Without its share no signature exists, so there is no transaction."
            at="2026-11-14T09:20:59Z"
            hash="84c59e93b1147ae498b11e0afc16e2797b30c9a2980c4debcbf654fb2d30651f"
            prev="ebf4d378eb3da7d9665744e96aec7fd24e34e4c4775f6dbc4a837d5d1bb5df76"
          />
        </div>
        <div className="min-w-0 self-start overflow-hidden rounded-xl bg-term">
          <div className="border-b border-term-line px-4 py-3 font-mono text-[0.8rem] text-term-faint">zcash_pay, as the MCP client got it (trimmed)</div>
          <pre className="px-4 py-4 font-mono text-[0.8rem] leading-[1.7] text-term-ink">
            {runLines.map((line, index) => (
              <div key={index} className={`whitespace-pre-wrap [overflow-wrap:anywhere] ${line.tone ? tone[line.tone] : ""}`}>
                {line.text || " "}
              </div>
            ))}
          </pre>
        </div>
      </div>
    </Section>
  );
}

function RunIt() {
  return (
    <Section id="code">
      <SectionHeading title="Run it">
        It needs zcash-devtool from October 2026 or later, the group wallet imported from its viewing key, and an ironclad-cosigner build with <code className="font-mono text-[0.95em]">inspect --json</code>. The owner's co-signer runs as a daemon watching the session folder.
      </SectionHeading>
      <div className="mt-10 grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
        <pre className="min-w-0 self-start overflow-x-auto rounded-xl bg-term px-4 py-4 font-mono text-[0.8rem] leading-[1.7] text-term-ink">{setup}</pre>
        <ul className="flex flex-col">
          {[
            { href: zshield.readme, label: "The Ironclad mode docs", line: "Every setting, the staged send and its limits." },
            { href: zshield.adapter, label: "The adapter", line: "src/chain/ironclad.ts in zshield-mcp, branch ironclad-mode." },
            { href: zshield.tests, label: "The tests", line: "19 tests; ten deliberate breaks of the adapter each fail one." },
            { href: zshield.inspectPr, label: "inspect --json", line: "The co-signer output zshield reads, Ironclad pull request 2." },
            { href: zshield.upstream, label: "zshield-mcp upstream", line: "By Steeve, who set this milestone." },
          ].map((item) => (
            <li key={item.href} className="flex flex-col gap-1 border-t border-line py-4 last:border-b">
              <TextLink href={item.href}>{item.label}</TextLink>
              <span className="text-ink-soft">{item.line}</span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function Trust() {
  return (
    <Section id="trust">
      <SectionHeading title="What to trust, and what not" />
      <ul className="mt-10 flex max-w-[72ch] flex-col">
        {trust.map((item) => (
          <li key={item} className="border-t border-line py-4 leading-[1.6] text-ink-soft last:border-b">
            {item}
          </li>
        ))}
      </ul>
      <p className="mt-8 text-ink-soft">
        The rest of Ironclad, its live demo and the co-signer's latest decisions are on the <TextLink href="./">main page</TextLink>. Source: <TextLink href={links.github}>Ironclad</TextLink> and{" "}
        <TextLink href={zshield.branch}>zshield-mcp</TextLink>.
      </p>
    </Section>
  );
}

function Page() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:rounded-lg focus:bg-paper focus:px-3 focus:py-2">
        Skip to the content
      </a>
      <Bar />
      <main id="main">
        <Hero />
        <Checks />
        <Steps />
        <Run />
        <RunIt />
        <Trust />
      </main>
      <Footer />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
