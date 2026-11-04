// Who sees what, how to run it, and the footer.

import { CopyCommand, links, Section, SectionHeading } from "./pieces.tsx";

const parties: [string, string, string][] = [
  ["The Zcash chain", "That a shielded transaction happened, and its fee", "Who paid whom, or how much"],
  ["The wallet server", "A Tor exit and timing for the agent. The counter's address, for now", "The agent's address"],
  ["The co-signer", "The payments it is asked to sign", "Anything else in the wallet"],
  ["The counter, run by us", "Each order: the product, the amount and the phone number", "Who funded the wallet"],
  ["Bitrefill", "The product, the phone number and our account", "Anything about the Zcash side"],
];

export function Trust() {
  return (
    <Section id="trust">
      <SectionHeading title="Who sees what.">The payments are shielded. The people around them still see some things, and here is exactly what.</SectionHeading>
      <div className="mt-10 overflow-x-auto rounded-outer border border-line bg-panel">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="px-4 py-3 text-meta font-medium text-ink">
                Who
              </th>
              <th scope="col" className="px-4 py-3 text-meta font-medium text-ink">
                Sees
              </th>
              <th scope="col" className="px-4 py-3 text-meta font-medium text-ink">
                Never sees
              </th>
            </tr>
          </thead>
          <tbody>
            {parties.map(([who, sees, never]) => (
              <tr key={who} className="border-t border-line first:border-t-0">
                <th scope="row" className="px-4 py-3 text-meta font-medium text-ink">
                  {who}
                </th>
                <td className="px-4 py-3 text-meta text-ink-muted">{sees}</td>
                <td className="px-4 py-3 text-meta text-ink-muted">{never}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 max-w-[80ch] text-meta text-ink-muted">
        One honest limit: today the agent and the co-signer run on the same server, so whoever takes over that server holds two shares. In production the co-signer belongs on its own machine.
      </p>
    </Section>
  );
}

export function GetStarted() {
  return (
    <Section id="start">
      <SectionHeading title="Run it yourself.">Rust and Node 24, on Zcash testnet. The README has every step.</SectionHeading>
      <div className="mt-10 grid gap-3 lg:grid-cols-3">
        {[
          ["Get the code", "git clone https://github.com/adilhusain01/ironclad && cd ironclad"],
          ["Build and test the co-signer", "cd cosigner && cargo build --release && cargo test --release"],
          ["Ask the agent to buy", "cd agent && npx tsx src/cli.ts buy test-phone-refill 10 --phone 91XXXXXXXXXX"],
        ].map(([title, command]) => (
          <div key={title} className="flex min-w-0 flex-col gap-2.5 rounded-outer border border-line bg-panel p-4">
            <span className="text-meta font-medium text-ink">{title}</span>
            <CopyCommand command={command!} />
          </div>
        ))}
      </div>
      <a href={links.readme} className="mt-6 inline-block text-meta text-accent-ink underline decoration-line-strong underline-offset-3 hover:decoration-accent">
        Read the full setup in the README
      </a>
    </Section>
  );
}

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-[1280px] px-4 pb-10 sm:px-6">
      <div className="flex flex-col gap-3 border-t border-line pt-6 text-small text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <span>
          Built at the{" "}
          <a href={links.hackathon} className="underline decoration-line-strong underline-offset-3 hover:text-ink">
            Free Society Hack
          </a>
          , Mumbai, November 2026. Zcash testnet only. MIT licence.
        </span>
        <span className="flex gap-4">
          <a href={links.github} className="hover:text-ink">
            Source
          </a>
          <a href={links.frostIssue} className="hover:text-ink">
            Upstream issue
          </a>
          <a href={links.bitrefill} className="hover:text-ink">
            Bitrefill
          </a>
        </span>
      </div>
    </footer>
  );
}
