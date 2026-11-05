// The bar along the top and the hero, whose demo is the live agent itself.

import { Console } from "./Console.tsx";
import { button, heading, links } from "./pieces.tsx";
import type { useLive } from "./useLive.ts";

export function TopBar() {
  const item = "hidden rounded-md px-3 py-2 text-[0.95rem] text-ink-soft transition-colors duration-150 hover:text-ink sm:block";
  return (
    <header className="flex items-center justify-between gap-4 py-5">
      <a href="/" className="flex items-center gap-2.5 rounded-md" aria-label="Ironclad home">
        <img src="/favicon.svg" alt="" width={26} height={26} />
        <span className="font-heading text-[1.5rem] font-semibold tracking-[-0.01em]">Ironclad</span>
      </a>
      <nav aria-label="Main" className="flex items-center gap-1">
        <a href="#how" className={item}>
          How it works
        </a>
        <a href="#record" className={item}>
          Decisions
        </a>
        <a href="#proof" className={item}>
          Proof
        </a>
        <a href={links.github} className={`${button.outline} ml-2`}>
          Source
        </a>
      </nav>
    </header>
  );
}

export function Hero({ live }: { live: ReturnType<typeof useLive> }) {
  return (
    <section className="pt-10 pb-20 sm:pt-16">
      <h1 className={`max-w-[14ch] ${heading.hero}`}>Spending limits for AI agents, built into the key.</h1>
      <div className="mt-8 grid items-end gap-x-14 gap-y-8 lg:grid-cols-[minmax(0,1fr)_auto]">
        <p className="max-w-[56ch] text-[1.15rem] leading-[1.6] text-ink-soft">
          Ironclad guards a private Zcash wallet that an AI agent spends from. The key is split three ways: the agent holds one share, a co-signer holds the second with your rules, and you keep the third offline. Outside your rules, a payment can't be signed, whatever the agent is told.
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <a href="#try" className={button.primary}>
            Try it live
          </a>
          <a href={links.video} className="font-bold text-ink underline decoration-transparent underline-offset-4 hover:decoration-ink">
            Watch the demo
          </a>
        </div>
      </div>
      <div id="try" className="mt-14 scroll-mt-6">
        <Console state={live.state} error={live.error} refresh={live.refresh} />
      </div>
    </section>
  );
}
