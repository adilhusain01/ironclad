// The bar along the top and the hero, whose demo is the live agent itself.

import { Console } from "./Console.tsx";
import { links, ThemeToggle } from "./pieces.tsx";
import type { useLive } from "./useLive.ts";

export function TopBar() {
  const item = "hidden rounded-inner px-3 py-2 text-meta text-ink-muted transition-colors duration-150 hover:bg-raised hover:text-ink sm:block";
  return (
    <header className="mx-auto flex w-full max-w-[1280px] items-center gap-3 px-4 pt-5 sm:px-6">
      <a href="/" className="flex items-center gap-2.5 rounded-inner" aria-label="Ironclad home">
        <img src="/favicon.svg" alt="" width={28} height={28} />
        <span className="display text-[17px] text-ink">Ironclad</span>
      </a>
      <nav aria-label="Main" className="ml-auto flex items-center gap-1">
        <a href="#how" className={item}>
          How it works
        </a>
        <a href="#record" className={item}>
          Decisions
        </a>
        <a href="#proof" className={item}>
          Proof
        </a>
        <a href={links.github} className="rounded-inner px-3 py-2 text-meta text-ink-muted transition-colors duration-150 hover:bg-raised hover:text-ink">
          GitHub
        </a>
        <ThemeToggle />
      </nav>
    </header>
  );
}

export function Hero({ live }: { live: ReturnType<typeof useLive> }) {
  return (
    <section className="mx-auto flex w-full max-w-[1280px] flex-col items-center gap-12 px-4 pt-14 pb-10 sm:px-6 md:pt-20">
      <div className="flex max-w-[1000px] flex-col items-center gap-6 text-center">
        <h1 className="display text-hero text-ink">
          A Zcash wallet your agent <span className="lg:block">can't overspend.</span>
        </h1>
        <p className="lede max-w-[50ch] text-lede text-ink-muted">
          The key is split three ways. The co-signer only signs payments inside your rules, whatever the agent is told.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a href="#try" className="press key-lift inline-flex h-12 items-center rounded-inner bg-primary px-5 text-body font-medium text-primary-ink shadow-key hover:bg-primary-hover">
            Try it live
          </a>
          <a href="#video" className="press key-lift inline-flex h-12 items-center rounded-inner border border-line-strong bg-key px-5 text-body font-medium text-ink shadow-key hover:bg-key-hover">
            Watch the demo
          </a>
        </div>
        <p className="text-small text-ink-faint">Shielded payments on Zcash testnet. Buys phone top-ups through Bitrefill. Open source.</p>
      </div>
      <div id="try" className="w-full scroll-mt-6">
        <Console state={live.state} error={live.error} refresh={live.refresh} />
      </div>
    </section>
  );
}
