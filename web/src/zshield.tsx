// The Ecosystem Prize milestone page: Ironclad as a chain mode in zshield-mcp. Everything on it is the
// record of the live runs on 14 November 2026 (UTC); the two co-signer decisions are quoted as logged, because
// the live API only returns the 20 most recent ones.

import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/jetbrains-mono";
import "./styles.css";
import { Footer } from "./Closing.tsx";
import Dither from "./dither.tsx";
import { button, CheckIcon, CrossIcon, heading, HOME, links, Section, SectionHeading, SiteHeader, SkipLink, Tile, TxLink, X } from "./pieces.tsx";

const zshield = {
  branch: "https://github.com/adilhusain01/zshield-mcp/tree/ironclad-mode",
  readme: "https://github.com/adilhusain01/zshield-mcp/tree/ironclad-mode#ironclad-mode",
  adapter: "https://github.com/adilhusain01/zshield-mcp/blob/ironclad-mode/src/chain/ironclad.ts",
  tests: "https://github.com/adilhusain01/zshield-mcp/blob/ironclad-mode/tests/ironclad.test.ts",
  upstream: "https://github.com/Steeve-Crypto/zshield-mcp",
  inspectPr: "https://github.com/adilhusain01/ironclad/pull/2",
  pr: "https://github.com/Steeve-Crypto/zshield-mcp/pull/10",
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
      "No answer from the co-signer in two minutes means not sent",
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
  { text: "" },
  { text: "$ zcash_pay 0.001 TAZ to the counter, no co-signer running", tone: "faint" },
  { text: '  "code": "CHAIN_ERROR",', tone: "red" },
  { text: '  "error": "the Ironclad co-signer did not answer within 120 s (is its daemon running?). Nothing was sent."', tone: "red" },
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
    <a href={href} className={button.link}>
      {children}
    </a>
  );
}

const termTone = { faint: "text-term-faint", green: "text-term-green", red: "text-term-red", orange: "text-term-orange" };

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-70">
        <Dither
          waveColor={[0.74, 0.77, 0.74]}
          backgroundColor={[0.933, 0.941, 0.925]}
          colorNum={4}
          pixelSize={3}
          waveSpeed={0.02}
          waveFrequency={2.6}
          waveAmplitude={0.32}
          enableMouseInteraction={false}
          intro={false}
        />
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,var(--color-paper)_0%,transparent_50%)] md:bg-[linear-gradient(90deg,var(--color-paper)_12%,transparent_62%)]" />
      <SiteHeader
        source={zshield.branch}
        nav={[
          { href: "#checks", label: "Two checks" },
          { href: "#run", label: "Live runs" },
          { href: "#code", label: "Run it" },
          { href: HOME, label: "Ironclad" },
        ]}
      />
      <div className={`${X} grid min-h-svh items-center gap-14 pt-28 pb-20 lg:grid-cols-[1fr_1.05fr] lg:pt-24`}>
        <div className="min-w-0">
          <h1 className={`max-w-[13ch] ${heading.hero}`}>Spending caps, held by a second key.</h1>
          <p className="mt-7 max-w-[36ch] text-xl leading-snug text-pretty text-ink-soft sm:text-2xl">
            zshield-mcp's <code className="font-mono text-[0.9em]">zcash_pay</code> tool on an Ironclad 2‑of‑3 wallet. zshield holds one share, the owner's co-signer another, and a payment needs both.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
            <a href="#run" className={button.primary}>
              See the live runs
            </a>
            <TextLink href={zshield.readme}>Read the docs</TextLink>
          </div>
        </div>
        <figure className="min-w-0 overflow-hidden rounded-[16px] bg-term" aria-label="What the MCP client got back from three zcash_pay calls">
          <figcaption className="border-b border-term-line px-4 py-3 font-mono text-[0.78rem] text-term-faint">zcash_pay, as the MCP client got it, 14 November 2026 (trimmed)</figcaption>
          <pre className="px-4 py-4 font-mono text-[0.76rem] leading-[1.7] text-term-ink sm:text-[0.8rem]">
            {runLines.map((line, index) => (
              <div key={index} className={`whitespace-pre-wrap [overflow-wrap:anywhere] ${line.tone ? termTone[line.tone] : ""}`}>
                {line.text || " "}
              </div>
            ))}
          </pre>
        </figure>
      </div>
    </section>
  );
}

function Checks() {
  return (
    <Section id="checks" label="checks-title">
      <SectionHeading id="checks-title" title="Two checks, two keys." line="Each side checks the payment on its own and holds its own share. The owner keeps the third offline." />
      <div className="grid gap-4 md:grid-cols-2">
        {checks.map((side) => (
          <Tile key={side.title} title={side.title} line={side.share}>
            <ul className="flex w-full flex-col rounded-[12px] border border-line-soft bg-paper px-4 py-1">
              {side.items.map((item) => (
                <li key={item} className="flex gap-3 border-b border-line-soft py-2.5 leading-[1.5] last:border-b-0">
                  <CheckIcon size={16} className="mt-1 shrink-0 text-positive" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Tile>
        ))}
      </div>
    </Section>
  );
}

function Steps() {
  return (
    <Section id="steps" label="steps-title">
      <SectionHeading id="steps-title" title="One payment, step by step." line="A failure before the last step means nothing was sent. A failure during the broadcast is reported as unknown, with the recorded txid." />
      <ol className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((step, index) => (
          <li key={step.title} className="flex min-w-0 flex-col border-t-2 border-ink pt-5">
            <span className="font-heading text-[3rem] leading-none font-extrabold text-signal" aria-hidden="true">
              {index + 1}
            </span>
            <span className="mt-3 font-heading text-[1.3rem] leading-tight font-bold tracking-[-0.01em]">{step.title}</span>
            <span className="mt-2 leading-[1.6] text-ink-soft">{step.line}</span>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Decision({ allowed, title, line, at, hash, prev, children }: { allowed: boolean; title: string; line: string; at?: string; hash?: string; prev?: string; children?: ReactNode }) {
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-[20px] border border-line-soft bg-sheet p-6 sm:p-8">
      <span className={`flex items-center gap-2 font-bold ${allowed ? "text-positive" : "text-danger"}`}>
        {allowed ? <CheckIcon size={18} /> : <CrossIcon size={18} />}
        {allowed ? "Co-signed" : "Refused"}
      </span>
      <h3 className="font-heading text-[1.45rem] leading-[1.15] font-bold tracking-[-0.015em]">{title}</h3>
      <p className="leading-[1.6] text-ink-soft">{line}</p>
      {children}
      {at && hash && (
        <p className="mt-auto flex flex-col gap-0.5 border-t border-line-soft pt-3 font-mono text-[0.75rem] text-ink-faint">
          <span>ledger {at}</span>
          <span>hash {hash.slice(0, 16)}…</span>
          {prev && <span>prev {prev.slice(0, 16)}…</span>}
        </p>
      )}
    </article>
  );
}

function Run() {
  return (
    <Section id="run" label="run-title">
      <SectionHeading id="run-title" title="The live runs." line="zshield-mcp over stdio, as an MCP host starts it, against the co-signer on testnet. The owner's policy caps one payment at 0.2 TAZ." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Decision
          allowed
          title="0.001 TAZ to the counter"
          line="Inside both sets of rules. Mined in testnet block 4,618,918 with a 0.0001 TAZ fee."
          at="2026-11-14T09:20:16Z"
          hash="ebf4d378eb3da7d9665744e96aec7fd24e34e4c4775f6dbc4a837d5d1bb5df76"
        >
          <TxLink txid={APPROVED_TXID} />
        </Decision>
        <Decision
          allowed={false}
          title="0.21 TAZ, refused at the key"
          line="zshield's cap was raised to 0.25 TAZ, so its checks passed. The co-signer's cap is 0.2 TAZ, so it refused, and without its share no signature exists."
          at="2026-11-14T09:20:59Z"
          hash="84c59e93b1147ae498b11e0afc16e2797b30c9a2980c4debcbf654fb2d30651f"
          prev="ebf4d378eb3da7d9665744e96aec7fd24e34e4c4775f6dbc4a837d5d1bb5df76"
        />
        <Decision
          allowed={false}
          title="0.001 TAZ, co-signer offline"
          line="No co-signer watched the session folder. The signing round waited two minutes, then the call ended as not sent. No ledger line, no signature, no transaction."
        />
      </div>
    </Section>
  );
}

function RunIt() {
  return (
    <Section id="code" label="code-title">
      <SectionHeading
        id="code-title"
        title="Run it."
        line={
          <>
            zcash-devtool from October 2026, the group wallet imported from its viewing key, and an ironclad-cosigner with <code className="font-mono text-[0.9em]">inspect --json</code>.
          </>
        }
      />
      <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
        <pre className="min-w-0 self-start overflow-x-auto rounded-[16px] bg-term px-4 py-4 font-mono text-[0.8rem] leading-[1.7] text-term-ink">{setup}</pre>
        <ul className="flex flex-col">
          {[
            { href: zshield.readme, label: "The Ironclad mode docs", line: "Every setting, the staged send and its limits." },
            { href: zshield.adapter, label: "The adapter", line: "src/chain/ironclad.ts in zshield-mcp." },
            { href: zshield.tests, label: "The tests", line: "21 tests; thirteen deliberate breaks of the adapter each fail one." },
            { href: zshield.pr, label: "The pull request", line: "Steeve-Crypto/zshield-mcp pull request 10." },
            { href: zshield.inspectPr, label: "inspect --json", line: "The co-signer output zshield reads, Ironclad pull request 2." },
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
    <section id="trust" aria-labelledby="trust-title" className="relative isolate overflow-hidden bg-ink py-24 text-paper sm:py-32">
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-60">
        <Dither
          waveColor={[0.2, 0.235, 0.255]}
          backgroundColor={[0.086, 0.106, 0.118]}
          colorNum={3}
          brightness={-0.12}
          contrast={1.25}
          pixelSize={3}
          waveSpeed={0.015}
          waveFrequency={2.2}
          waveAmplitude={0.3}
          enableMouseInteraction={false}
          intro={false}
        />
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--color-ink)_25%,transparent_90%)]" />
      <div className={X}>
        <h2 id="trust-title" className={`max-w-[14ch] ${heading.section}`}>
          What to trust, and what not.
        </h2>
        <ul className="mt-14 grid max-w-[72rem] gap-x-12 sm:grid-cols-2">
          {trust.map((item) => (
            <li key={item} className="border-t border-term-line py-5 leading-[1.6] text-paper-3/85">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-10 text-paper-3">
          The live demo and the co-signer's latest decisions are on the{" "}
          <a href={HOME} className="font-bold text-paper underline decoration-paper/30 decoration-2 underline-offset-[6px] hover:decoration-paper">
            main page
          </a>
          . Source:{" "}
          <a href={links.github} className="font-bold text-paper underline decoration-paper/30 decoration-2 underline-offset-[6px] hover:decoration-paper">
            Ironclad
          </a>{" "}
          and{" "}
          <a href={zshield.branch} className="font-bold text-paper underline decoration-paper/30 decoration-2 underline-offset-[6px] hover:decoration-paper">
            zshield-mcp
          </a>
          .
        </p>
      </div>
    </section>
  );
}

function Page() {
  return (
    <>
      <SkipLink />
      <main id="main">
        <Hero />
        <Checks />
        <Steps />
        <Run />
        <RunIt />
        <Trust />
      </main>
      <Footer />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
