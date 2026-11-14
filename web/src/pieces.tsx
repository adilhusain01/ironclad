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

// The page's content width and side margins, the same on every section.
export const X = "mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-12";

// Where "home" is. A preview build under a sub-folder points it at index.html, because the server
// serves files, not folders.
export const HOME: string = import.meta.env.VITE_HOME ?? "./";

// Buttons. The primary one is a key: it casts a shadow and sinks when pressed.
export const button = {
  primary: "key inline-flex h-[52px] items-center justify-center gap-2 rounded-[10px] bg-ink px-7 text-base font-bold tracking-[0.2px] text-paper hover:bg-ink-hover",
  outline: "press inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold tracking-[0.2px] text-ink shadow-[inset_0_0_0_1.5px_var(--color-ink)] hover:bg-ink/[0.06]",
  link: "font-bold text-ink underline decoration-ink/25 decoration-2 underline-offset-[6px] transition-[text-decoration-color] duration-150 hover:decoration-ink",
};

export const heading = {
  hero: "font-heading text-[clamp(3rem,8.4vw,5.9rem)] leading-[0.92] font-extrabold tracking-[-0.04em]",
  section: "font-heading text-[clamp(2.4rem,6vw,4rem)] leading-[1] font-extrabold tracking-[-0.03em] text-balance",
  tile: "font-heading text-[1.6rem] leading-[1.1] font-bold tracking-[-0.015em] sm:text-[1.85rem]",
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

// A section of the page: a hairline above it, generous room around it, content at the page's width.
export function Section({ id, children, className = "", label }: { id?: string; children: ReactNode; className?: string; label?: string }) {
  return (
    <section id={id} aria-labelledby={label} className={`scroll-mt-6 border-t border-line py-24 sm:py-32 ${className}`}>
      <div className={X}>{children}</div>
    </section>
  );
}

// Every section opens the same way: a heading and one line under it.
export function SectionHeading({ id, title, line }: { id?: string; title: string; line?: ReactNode }) {
  return (
    <div className="mb-12 max-w-[46rem] sm:mb-16">
      <h2 id={id} className={heading.section}>
        {title}
      </h2>
      {line && <p className="mt-5 text-lg leading-[1.55] text-pretty text-ink-soft sm:text-xl">{line}</p>}
    </div>
  );
}

// A bento tile: a sheet with a title and one line on top, and a drawn piece of the product under it.
export function Tile({ title, line, className = "", children }: { title: string; line: string; className?: string; children: ReactNode }) {
  return (
    <article className={`flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-line-soft bg-sheet ${className}`}>
      <div className="p-6 sm:p-8">
        <h3 className={heading.tile}>{title}</h3>
        <p className="mt-2 max-w-[44ch] text-[1.05rem] leading-[1.55] text-ink-soft">{line}</p>
      </div>
      <div className="flex flex-1 items-end px-6 pb-6 sm:px-8 sm:pb-8">{children}</div>
    </article>
  );
}

// The bar along the top of every page: the mark, a few links, and the source.
export function SiteHeader({ nav, source = links.github }: { nav: { href: string; label: string }[]; source?: string }) {
  return (
    <header className={`${X} absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-4 py-5`}>
      <a href={HOME} className="flex items-center gap-2.5 rounded-md" aria-label="Ironclad home">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={28} height={28} />
        <span className="font-heading text-[1.55rem] font-bold tracking-[-0.02em]">Ironclad</span>
      </a>
      <nav aria-label="Main" className="flex items-center gap-1">
        {nav.map((item) => (
          <a key={item.href} href={item.href} className="hidden rounded-md px-3 py-2 text-[0.95rem] font-medium text-ink-soft transition-colors duration-150 hover:text-ink md:block">
            {item.label}
          </a>
        ))}
        <a href={source} className="key ml-2 inline-flex h-10 items-center rounded-[10px] bg-ink px-4 text-sm font-bold text-paper hover:bg-ink-hover">
          Source
        </a>
      </nav>
    </header>
  );
}

export function SkipLink() {
  return (
    <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-20 focus:rounded-lg focus:bg-paper focus:px-3 focus:py-2">
      Skip to the content
    </a>
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
