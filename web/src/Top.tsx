// The hero, over a slow dithered field in the paper's own grey, with the co-signer demo beside the words;
// then the live demo, where each key runs the real agent.

import { Console } from "./Console.tsx";
import Dither from "./dither.tsx";
import { HeroDemo } from "./HeroDemo.tsx";
import { button, heading, links, Section, SectionHeading, SiteHeader, X } from "./pieces.tsx";
import type { useLive } from "./useLive.ts";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* React Bits Dither: a darker shade of the concrete paper, drifting under everything. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-70">
        <Dither
          waveColor={[0.74, 0.77, 0.74]}
          backgroundColor={[0.933, 0.941, 0.925]}
          colorNum={4}
          pixelSize={3}
          waveSpeed={0.02}
          waveFrequency={2.6}
          waveAmplitude={0.32}
          enableMouseInteraction={false}
          intro={false}
        />
      </div>
      {/* Plain paper behind the words, so they read on any frame of the field. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,var(--color-paper)_0%,transparent_50%)] md:bg-[linear-gradient(90deg,var(--color-paper)_12%,transparent_62%)]" />

      <SiteHeader
        nav={[
          { href: "#try", label: "Live demo" },
          { href: "#how", label: "How it works" },
          { href: "#record", label: "Decisions" },
          { href: "#proof", label: "Proof" },
        ]}
      />

      <div className={`${X} grid min-h-svh items-center gap-14 pt-28 pb-20 md:grid-cols-[1.15fr_1fr] md:pt-24`}>
        <div className="min-w-0">
          <h1 className={`max-w-[13ch] ${heading.hero}`}>Spending limits, built into the key.</h1>
          <p className="mt-7 max-w-[34ch] text-xl leading-snug text-pretty text-ink-soft sm:text-2xl">
            An AI agent pays from a shielded Zcash wallet. A co-signer holds your rules and a second key, and signs nothing outside them.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
            <a href="#try" className={button.primary}>
              Try it live
            </a>
            <a href={links.video} className={button.link}>
              Watch the demo
            </a>
          </div>
        </div>
        <HeroDemo />
      </div>
    </section>
  );
}

export function TryIt({ live }: { live: ReturnType<typeof useLive> }) {
  return (
    <Section id="try" label="try-title">
      <SectionHeading id="try-title" title="Press a key. The agent runs for real." line="The real agent and co-signer, on Zcash testnet. A run takes 15 to 30 seconds." />
      <Console state={live.state} error={live.error} refresh={live.refresh} />
    </Section>
  );
}
