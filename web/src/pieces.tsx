// Small pieces used in more than one section. The copy key and theme switch follow HeyTerm's own.

import { useState, type ReactNode } from "react";

export const links = {
  github: "https://github.com/adilhusain01/ironclad",
  readme: "https://github.com/adilhusain01/ironclad#readme",
  frostIssue: "https://github.com/OpenPGP-Wallet/frost-zec/issues/1",
  frostZec: "https://github.com/OpenPGP-Wallet/frost-zec",
  bitrefill: "https://www.bitrefill.com",
  hackathon: "https://stadium.joinwebzero.com/programs/free-society-hack-2026",
};

function Svg({ size = 16, className = "", children }: { size?: number; className?: string; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
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
const MoonIcon = (p: { size?: number }) => (
  <Svg {...p}>
    <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
  </Svg>
);
const SunIcon = (p: { size?: number }) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
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
      className="press key-lift group flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-inner border border-line-strong bg-key py-2.5 pr-3 pl-4 text-left font-mono text-meta text-ink shadow-key hover:bg-key-hover"
    >
      <span className="text-ink-faint select-none">$</span>
      <span className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap">{command}</span>
      <span className="relative grid size-5 shrink-0 place-items-center text-ink-muted">
        <CopyGlyph className={`col-start-1 row-start-1 transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${copied ? "scale-25 opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-[0px]"}`} />
        <CheckIcon size={16} className={`col-start-1 row-start-1 text-allow transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${copied ? "scale-100 opacity-100 blur-[0px]" : "scale-25 opacity-0 blur-[4px]"}`} />
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

// Every colour changes at once on a theme switch, so transitions are paused for the swap.
export function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? "light");
  const next = theme === "dark" ? "light" : "dark";
  const toggle = () => {
    const pause = document.createElement("style");
    pause.textContent = "*,*::before,*::after{transition:none !important}";
    document.head.appendChild(pause);
    document.documentElement.dataset.theme = next;
    void document.documentElement.offsetHeight;
    requestAnimationFrame(() => pause.remove());
    try {
      localStorage.setItem("ironclad.site.theme", next);
    } catch {
      // Not saving only means the next visit starts light.
    }
    setTheme(next);
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to the ${next} theme`}
      title={`Switch to the ${next} theme`}
      className="press grid size-9 cursor-pointer place-items-center rounded-inner text-ink-muted transition-colors duration-150 hover:bg-raised hover:text-ink"
    >
      {theme === "dark" ? <SunIcon size={17} /> : <MoonIcon size={17} />}
    </button>
  );
}

// Every section shares one width, so their left edges line up.
export function Section({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`mx-auto w-full max-w-[1280px] px-4 py-16 sm:px-6 md:py-24 ${className}`}>
      {children}
    </section>
  );
}

export function SectionHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex max-w-[62ch] flex-col gap-4">
      <h2 className="display text-section text-ink">{title}</h2>
      {children && <p className="lede text-lede text-ink-muted">{children}</p>}
    </div>
  );
}

export function TxLink({ txid, label }: { txid: string; label?: string }) {
  return (
    <a
      href={`https://zexplorer.app/testnet/tx/${txid}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-tiny font-mono text-accent-ink underline decoration-line-strong underline-offset-3 hover:decoration-accent"
    >
      {label ?? `${txid.slice(0, 10)}…${txid.slice(-6)}`}
      <ExternalIcon size={13} />
    </a>
  );
}
