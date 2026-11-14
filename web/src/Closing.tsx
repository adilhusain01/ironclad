// Who sees what (the page's one dark band), how to run it, and the footer.

import Dither from "./dither.tsx";
import { button, CopyCommand, heading, links, X } from "./pieces.tsx";

const parties: { who: string; text: string }[] = [
  { who: "The Zcash chain", text: "That a shielded transaction happened, and its fee. Never who paid whom, or how much." },
  { who: "The wallet server", text: "A Tor exit and timing for the agent. It still sees the counter's address directly, for now." },
  { who: "The co-signer", text: "Only the payments it is asked to sign. It makes no network connections of its own." },
  { who: "The counter, run by us", text: "Each order: product, amount and phone number, stored next to the txid." },
  { who: "Bitrefill", text: "The product, the phone number and our account. Nothing about the Zcash side." },
  { who: "One honest limit", text: "Here the agent and co-signer share a server, so taking it gets two shares. In real use the co-signer runs on its own machine." },
];

export function Trust() {
  return (
    <section id="trust" aria-labelledby="trust-title" className="relative isolate overflow-hidden bg-ink py-24 text-paper sm:py-32">
      {/* The same field as the hero, in a lighter tone of the ink. */}
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
          Shielded, and honest about the rest.
        </h2>
        <p className="mt-5 max-w-[46rem] text-lg leading-[1.55] text-paper-3 sm:text-xl">The payments are private. Here is exactly what each party around them sees.</p>
        <dl className="mt-14 grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
          {parties.map((item) => (
            <div key={item.who} className="border-t border-term-line py-6">
              <dt className={`font-bold ${item.who === "One honest limit" ? "text-term-orange" : "text-paper"}`}>{item.who}</dt>
              <dd className="mt-2 leading-[1.6] text-paper-3/85">{item.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function GetStarted() {
  const commands: [string, string][] = [
    ["Get the code", "git clone https://github.com/adilhusain01/ironclad && cd ironclad"],
    ["Build and test the co-signer", "cd cosigner && cargo build --release && cargo test --release"],
    ["Ask the agent to buy", "cd agent && npx tsx src/cli.ts buy test-phone-refill 10 --phone 91XXXXXXXXXX"],
  ];
  return (
    <section id="start" aria-labelledby="start-title" className="scroll-mt-6 py-24 sm:py-32">
      <div className={`${X} grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center`}>
        <div>
          <h2 id="start-title" className="max-w-[11ch] font-heading text-[clamp(2.6rem,6.5vw,4.6rem)] leading-[0.95] font-extrabold tracking-[-0.04em]">
            Let the agent shop. Keep the key.
          </h2>
          <p className="mt-6 text-lg text-ink-soft sm:text-xl">Rust and Node 24, on Zcash testnet. MIT licensed.</p>
          <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
            <a href={links.readme} className={button.primary}>
              Read the README
            </a>
            <a href="#try" className={button.link}>
              Try it live
            </a>
          </div>
        </div>
        <ol className="flex min-w-0 flex-col gap-3">
          {commands.map(([title, command], index) => (
            <li key={title} className="flex min-w-0 flex-col gap-3 rounded-[16px] border border-line-soft bg-sheet p-5">
              <span className="flex items-baseline gap-3">
                <span className="font-heading text-[1.4rem] leading-none font-extrabold text-signal" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="font-bold">{title}</span>
              </span>
              <CopyCommand command={command} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className={`${X} flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-8 text-sm text-ink-soft`}>
        <span className="max-w-[70ch]">
          Built at the{" "}
          <a href={links.hackathon} className="underline decoration-line underline-offset-4 hover:text-ink">
            Free Society Hack
          </a>
          , Mumbai, November 2026, with frost-zec, zcash-devtool and Bitrefill.
        </span>
        <span className="flex gap-5">
          <a href={links.github} className="hover:text-ink">
            Source
          </a>
          <a href="zshield.html" className="hover:text-ink">
            zshield-mcp
          </a>
          <a href={links.frostIssue} className="hover:text-ink">
            Upstream issue
          </a>
        </span>
      </div>
    </footer>
  );
}
