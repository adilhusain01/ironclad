// Who sees what, how to run it, the closing line and the footer.

import { button, CopyCommand, heading, links, Section } from "./pieces.tsx";

const parties: { who: string; text: string }[] = [
  { who: "The Zcash chain", text: "Sees that a shielded transaction happened, and its fee. Never who paid whom, or how much." },
  { who: "The wallet server", text: "Sees a Tor exit and timing for the agent, never its address. It still sees the counter's address directly, for now." },
  { who: "The co-signer", text: "Sees only the payments it is asked to sign, and makes no network connections of its own." },
  { who: "The counter, run by us", text: "Sees each order: the product, the amount and the phone number, stored next to the txid." },
  { who: "Bitrefill", text: "Sees the product, the phone number and our account. Nothing about the Zcash side." },
  { who: "One honest limit", text: "Today the agent and the co-signer run on the same server, so whoever takes it holds two shares. In production the co-signer belongs on its own machine." },
];

export function Trust() {
  return (
    <Section id="trust">
      <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div>
          <h2 className={heading.section}>Who sees what</h2>
          <p className="mt-5 max-w-[40ch] text-[1.05rem] leading-[1.6] text-ink-soft">The payments are shielded. The parties around them still see some things, and this is exactly what.</p>
        </div>
        <dl className="grid gap-x-12 sm:grid-cols-2">
          {parties.map((item) => (
            <div key={item.who} className="border-t border-line py-6">
              <dt className="text-[1.05rem] font-bold">{item.who}</dt>
              <dd className="mt-2 leading-[1.65] text-ink-soft">{item.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}

export function GetStarted() {
  const commands: [string, string][] = [
    ["Get the code", "git clone https://github.com/adilhusain01/ironclad && cd ironclad"],
    ["Build and test the co-signer", "cd cosigner && cargo build --release && cargo test --release"],
    ["Ask the agent to buy", "cd agent && npx tsx src/cli.ts buy test-phone-refill 10 --phone 91XXXXXXXXXX"],
  ];
  return (
    <Section id="start">
      <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div>
          <h2 className={heading.section}>Run it yourself</h2>
          <p className="mt-5 max-w-[40ch] text-[1.05rem] leading-[1.6] text-ink-soft">
            Rust and Node 24, on Zcash testnet.{" "}
            <a href={links.readme} className="font-bold text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
              The README
            </a>{" "}
            has every step.
          </p>
        </div>
        <ol className="flex flex-col">
          {commands.map(([title, command], index) => (
            <li key={title} className="grid gap-3 border-t border-line py-5 sm:grid-cols-[2.5rem_minmax(0,1fr)]">
              <span className="font-heading text-[2rem] leading-none font-semibold text-signal" aria-hidden="true">
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-col gap-3">
                <span className="font-bold">{title}</span>
                <CopyCommand command={command} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

export function Closing() {
  return (
    <section className="border-t border-line py-24 text-center">
      <h2 className="mx-auto max-w-[18ch] font-heading text-[clamp(2.2rem,6vw,4rem)] leading-[1.02] font-semibold tracking-[-0.02em]">Let the agent shop. Keep the key.</h2>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <a href="#try" className={button.primary}>
          Try it live
        </a>
        <a href={links.github} className="font-bold text-ink underline decoration-transparent underline-offset-4 hover:decoration-ink">
          Read the source
        </a>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line py-8 text-sm text-ink-faint">
      <span>
        Ironclad. Built at the{" "}
        <a href={links.hackathon} className="underline decoration-line underline-offset-4 hover:text-ink">
          Free Society Hack
        </a>
        , Mumbai, November 2026, on Zcash testnet with frost-zec, zcash-devtool and Bitrefill.
      </span>
      <span className="flex gap-5">
        <a href={links.github} className="hover:text-ink">
          Source
        </a>
        <a href={links.frostIssue} className="hover:text-ink">
          Upstream issue
        </a>
        <span>MIT licence</span>
      </span>
    </footer>
  );
}
