// The demo video and the transactions anyone can check on the testnet explorer.

import { API_BASE } from "./api.ts";
import { links, Section, SectionHeading, TxLink } from "./pieces.tsx";

// Set to the YouTube video's id once it is published; until then the recording plays from the server.
const YOUTUBE_ID = "";

const proofs: { title: string; line: string; txid?: string; extra?: React.ReactNode }[] = [
  {
    title: "A 2-of-3 spend, co-signed under the rules",
    line: "The agent's share and the co-signer's share signed it together. The co-signer logged its decision first.",
    txid: "82457796b6d92643d6cfcade47716789a3c1ee72c9ebc77c27ccca592365e26a",
  },
  {
    title: "A purchase sent over Tor",
    line: "The agent synced and broadcast through Tor, so the wallet server saw an exit node, not the agent.",
    txid: "1cbec807f17289bf99254581c051fce9d62bf4ac182b33ec41820c3c7605f4ab",
  },
  {
    title: "A real order through Bitrefill's API",
    line: "The counter saw this payment, bought Bitrefill's test top-up and sent the receipt back as a shielded memo.",
    txid: "67c238aedf77ac1887a14400768f220a6ca2c2514f7063622493770b43f6408c",
    extra: (
      <span className="flex flex-wrap gap-x-3 gap-y-1">
        <span className="font-mono text-small text-ink-muted">invoice 57eeb022-02b6-4fd8-b60c-b15af9610e64</span>
        <TxLink txid="8c7f4d5380be3b0f808c89b26c67e100d0ff90939b8836017e14e805577067a0" label="receipt memo" />
      </span>
    ),
  },
  {
    title: "Refusals leave nothing on chain",
    line: "An over-cap payment and a payment to a stranger were refused at the key. No signature exists, so there is no transaction to show.",
    extra: (
      <a href="#record" className="text-meta text-accent-ink underline decoration-line-strong underline-offset-3 hover:decoration-accent">
        See them in the co-signer's log
      </a>
    ),
  },
];

export function Proof() {
  return (
    <Section id="proof">
      <SectionHeading title="Check it on the chain.">Every claim on this page has a testnet transaction or a log entry behind it.</SectionHeading>
      <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div id="video" className="scroll-mt-6 overflow-hidden rounded-outer border border-line bg-terminal">
          {YOUTUBE_ID ? (
            <iframe
              className="aspect-video w-full"
              src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}`}
              title="Ironclad demo"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video className="aspect-video w-full" src={`${API_BASE}/demo.mp4`} controls preload="metadata" playsInline aria-label="Ironclad demo recording" />
          )}
        </div>
        <ul className="flex flex-col gap-3">
          {proofs.map((proof) => (
            <li key={proof.title} className="flex flex-col gap-1.5 rounded-outer border border-line bg-panel px-4 py-3.5">
              <span className="text-body font-medium text-ink">{proof.title}</span>
              <span className="text-meta text-ink-muted">{proof.line}</span>
              {proof.txid && <TxLink txid={proof.txid} />}
              {proof.extra}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-6 text-meta text-ink-muted">
        Built on{" "}
        <a href={links.frostZec} className="text-accent-ink underline decoration-line-strong underline-offset-3 hover:decoration-accent">
          frost-zec
        </a>
        . The policy mode is proposed back to it in{" "}
        <a href={links.frostIssue} className="text-accent-ink underline decoration-line-strong underline-offset-3 hover:decoration-accent">
          issue 1
        </a>
        .
      </p>
    </Section>
  );
}
