// Small pieces used in more than one section, in Stockroom's language: solid ink or a 1.5px ink outline
// for what you press, hairlines between rows, Bricolage for headings.

import { useState, type ReactNode } from "react";
import { API_BASE } from "./api.ts";

export const links = {
  github: "https://github.com/adilhusain01/ironclad",
  readme: "https://github.com/adilhusain01/ironclad#readme",
  frostIssue: "https://github.com/OpenPGP-Wallet/frost-zec/issues/1",
  frostZec: "https://github.com/OpenPGP-Wallet/frost-zec",
  bitrefill: "https://www.bitrefill.com",
  hackathon: "https://stadium.joinwebzero.com/programs/free-society-hack-2026",
  video: "https://youtu.be/8QMsMO8Dx6E",
};

// Buttons, as Stockroom draws them.
export const button = {
  primary: "press inline-flex h-[52px] items-center justify-center gap-2 rounded-lg bg-ink px-7 text-base font-bold tracking-[0.2px] text-paper hover:bg-ink-hover",
  outline: "press inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold tracking-[0.2px] text-ink shadow-[inset_0_0_0_1.5px_var(--color-ink)] hover:bg-ink/[0.06]",
};

export const heading = {
  hero: "font-heading text-[clamp(2.9rem,8.4vw,6.5rem)] leading-[0.98] font-semibold tracking-[-0.03em]",
  section: "font-heading text-[clamp(2rem,5vw,3.4rem)] leading-[1.04] font-semibold tracking-[-0.02em]",
};

function Svg({ size = 16, className = "", children }: { size?: number; className?: string; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {children}
    </svg>
  );
}

export const CheckIcon = (p: { size?: number; className?: string }) => (
  <Svg {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);
export const CrossIcon = (p: { size?: number; className?: string }) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);
export const ExternalIcon = (p: { size?: number; className?: string }) => (
  <Svg {...p}>
    <path d="M7 17 17 7M8 7h9v9" />
  </Svg>
);

export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : `Copy: ${command}`}
      className="press flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-lg py-3 pr-3 pl-4 text-left font-mono text-[0.85rem] text-ink shadow-[inset_0_0_0_1.5px_var(--color-line)] hover:shadow-[inset_0_0_0_1.5px_var(--color-ink)]"
    >
      <span className="text-ink-faint select-none">$</span>
      <span className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap">{command}</span>
      <span className="relative grid size-5 shrink-0 place-items-center text-ink-soft">
        <CopyGlyph className={`col-start-1 row-start-1 transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${copied ? "scale-25 opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-[0px]"}`} />
        <CheckIcon size={16} className={`col-start-1 row-start-1 text-positive transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${copied ? "scale-100 opacity-100 blur-[0px]" : "scale-25 opacity-0 blur-[4px]"}`} />
      </span>
    </button>
  );
}

function CopyGlyph({ className }: { className: string }) {
  return (
    <Svg className={className}>
      <rect width="14" height="14" x="8" y="8" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </Svg>
  );
}

// A section of the page: a hairline above it, generous room around it.
export function Section({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`scroll-mt-8 border-t border-line py-20 ${className}`}>
      {children}
    </section>
  );
}

export function SectionHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div>
      <h2 className={`max-w-[20ch] ${heading.section}`}>{title}</h2>
      {children && <p className="mt-5 max-w-[58ch] text-[1.05rem] leading-[1.6] text-ink-soft">{children}</p>}
    </div>
  );
}

// A txid, linked to the check on our own server (public explorers can lag behind testnet).
export function TxLink({ txid, label }: { txid: string; label?: string }) {
  return (
    <a
      href={`${API_BASE}/tx/${txid}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-mono text-[0.85rem] text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
    >
      {label ?? `${txid.slice(0, 10)}…${txid.slice(-6)}`}
      <ExternalIcon size={13} />
    </a>
  );
}
