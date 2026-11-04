// The demo video and the transactions anyone can check through testnet.zec.rocks.

import { API_BASE } from "./api.ts";
import { links, Section, SectionHeading, TxLink } from "./pieces.tsx";

// The demo on YouTube; with no id the recording plays from the server instead.
const YOUTUBE_ID = "W0D4gGicvA4";

const proofs: { title: string; line: string; txid?: string; extra?: React.ReactNode }[] = [
  {
    title: "A 2-of-3 spend, co-signed under the rules",
    line: "The agent's share and the co-signer's share signed it together. The co-signer logged its decision first.",
    txid: "82457796b6d92643d6cfcade47716789a3c1ee72c9ebc77c27ccca592365e26a",
  },
  {
    title: "The purchase in the video",
    line: "Signed inside the rules, sent over Tor, bought through Bitrefill's live API and delivered.",
    txid: "9b46cda814382b444dc963ef5000ed3db6b70c83ed1f62bbd571c89364305974",
    extra: <span className="font-mono text-[0.85rem] break-all text-ink-soft">invoice f547c32c-3f91-40e8-a541-1483653bf049</span>,
  },
  {
    title: "A purchase sent over Tor",
    line: "The agent synced and broadcast through Tor, so the wallet server saw an exit node, not the agent.",
    txid: "1cbec807f17289bf99254581c051fce9d62bf4ac182b33ec41820c3c7605f4ab",
  },
  {
    title: "Refusals leave nothing on chain",
    line: "An over-cap payment and a payment to a stranger were refused at the key. No signature exists, so there is no transaction to show.",
    extra: (
      <a href="#record" className="text-sm font-bold text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
        See them in the co-signer's log
      </a>
    ),
  },
];

export function Proof() {
  return (
    <Section id="proof">
      <SectionHeading title="Check it on the chain">
        Every claim here has a testnet transaction or a log entry behind it. Each link looks the transaction up live through testnet.zec.rocks, the server Stadium uses.
      </SectionHeading>
      <div className="mt-12 grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
        <div id="video" className="scroll-mt-8 self-start overflow-hidden rounded-xl bg-term">
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
        <dl className="flex flex-col">
          {proofs.map((proof) => (
            <div key={proof.title} className="flex flex-col gap-1.5 border-t border-line py-5 last:border-b">
              <dt className="text-[1.05rem] font-bold">{proof.title}</dt>
              <dd className="leading-[1.6] text-ink-soft">{proof.line}</dd>
              {proof.txid && (
                <dd>
                  <TxLink txid={proof.txid} />
                </dd>
              )}
              {proof.extra && <dd>{proof.extra}</dd>}
            </div>
          ))}
        </dl>
      </div>
      <p className="mt-8 text-ink-soft">
        Built on{" "}
        <a href={links.frostZec} className="font-bold text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
          frost-zec
        </a>
        . The policy mode is proposed back to it in{" "}
        <a href={links.frostIssue} className="font-bold text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
          issue 1
        </a>
        .
      </p>
    </Section>
  );
}
