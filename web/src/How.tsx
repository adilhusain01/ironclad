// How one payment goes through: a diagram across the page, and five numbered steps under it that are
// its controls. Picking a step lights its part of the route and sends a beam along it once.

import { useState } from "react";
import type { Point } from "./geometry.ts";
import { BeamLine, Connector, type BeamRun } from "./kit.tsx";
import { Section, SectionHeading } from "./pieces.tsx";

const steps = [
  { title: "The agent asks", line: "It builds a shielded payment, the order in its encrypted memo." },
  { title: "The co-signer checks", line: "It reads the payment itself and holds it to your rules." },
  { title: "Only then it signs", line: "Inside the rules it adds its share. Outside them, nothing can be signed." },
  { title: "The agent sends it", line: "Two shares make a valid signature. It goes out over Tor." },
  { title: "The counter delivers", line: "It buys the top-up from Bitrefill and sends a shielded receipt." },
];

type Box = { x: number; y: number; w: number; h: number; title: string; line: string; dashed?: boolean };
const boxes: Record<"agent" | "you" | "cosigner" | "chain" | "counter" | "bitrefill", Box> = {
  agent: { x: 10, y: 20, w: 230, h: 92, title: "Agent", line: "share 1" },
  you: { x: 10, y: 220, w: 230, h: 92, title: "You", line: "share 3, offline", dashed: true },
  cosigner: { x: 455, y: 20, w: 250, h: 92, title: "Co-signer", line: "share 2, holds your rules" },
  chain: { x: 455, y: 220, w: 250, h: 92, title: "Zcash testnet", line: "shielded payments" },
  counter: { x: 920, y: 220, w: 230, h: 92, title: "Counter", line: "watches for orders" },
  bitrefill: { x: 920, y: 20, w: 230, h: 92, title: "Bitrefill", line: "sells the top-up" },
};

// Which boxes each step lights.
const lit: Record<number, (keyof typeof boxes)[]> = {
  0: ["agent"],
  1: ["agent", "cosigner"],
  2: ["cosigner", "agent"],
  3: ["agent", "chain"],
  4: ["chain", "counter", "bitrefill"],
};

export function HowItWorks() {
  const [active, setActive] = useState(1);
  const [play, setPlay] = useState(1);
  const pick = (index: number) => {
    setActive(index);
    setPlay((count) => count + 1);
  };
  const beam = (step: number, delay = 0): BeamRun | undefined => (active === step ? { play, delayMilliseconds: delay, reverse: false } : undefined);
  const on = (name: keyof typeof boxes) => lit[active]?.includes(name) ?? false;
  const ask: [Point, Point] = [[240, 52], [455, 52]];
  const reply: [Point, Point] = [[455, 82], [240, 82]];
  return (
    <Section id="how" label="how-title">
      <SectionHeading id="how-title" title="Two of three keys sign." line="The agent holds one share, so it can ask for a payment but never finish one alone." />
      <div className="hidden rounded-[20px] border border-line-soft bg-sheet p-6 md:block lg:p-10">
        <svg viewBox="0 0 1160 330" className="h-auto w-full" role="img" aria-label="The agent and the co-signer each hold one key share. Together they sign a shielded payment to the counter, which buys from Bitrefill. Your share stays offline.">
          <BeamLine id="beam-ask" from={ask[0]} to={ask[1]} lit={active === 1} run={beam(1)} />
          <BeamLine id="beam-reply" from={reply[0]} to={reply[1]} lit={active === 2} run={beam(2)} />
          <Connector points={[[125, 112], [125, 166], [580, 166], [580, 220]]} lit={active === 3} />
          <BeamLine id="beam-deliver" from={[705, 266]} to={[920, 266]} lit={active === 4} run={beam(4)} />
          <BeamLine id="beam-buy" from={[1035, 220]} to={[1035, 112]} lit={active === 4} run={beam(4, 450)} />
          {Object.entries(boxes).map(([name, box]) => {
            const isOn = on(name as keyof typeof boxes);
            return (
              <g key={name}>
                <rect
                  x={box.x}
                  y={box.y}
                  width={box.w}
                  height={box.h}
                  rx={10}
                  strokeWidth={isOn ? 1.8 : 1.4}
                  strokeDasharray={box.dashed ? "5 4" : undefined}
                  className={`transition-[stroke,fill] duration-200 ${isOn ? "fill-sheet stroke-ink" : "fill-paper stroke-line"}`}
                />
                <text x={box.x + 22} y={box.y + 42} className="fill-ink font-heading" fontSize={24} fontWeight={700}>
                  {box.title}
                </text>
                <text x={box.x + 22} y={box.y + 70} className="fill-ink-soft" fontSize={16}>
                  {box.line}
                </text>
              </g>
            );
          })}
          <text x={347} y={42} textAnchor="middle" className="fill-ink-soft font-mono" fontSize={14}>
            payment
          </text>
          <text x={347} y={104} textAnchor="middle" className="fill-ink-soft font-mono" fontSize={14}>
            share or refusal
          </text>
          <text x={352} y={156} textAnchor="middle" className="fill-ink-soft font-mono" fontSize={14}>
            signed, sent over Tor
          </text>
        </svg>
      </div>
      <ol className="mt-10 grid gap-x-8 gap-y-2 md:grid-cols-5">
        {steps.map((step, index) => (
          <li key={step.title}>
            <button
              type="button"
              onClick={() => pick(index)}
              aria-pressed={active === index}
              className={`press flex w-full cursor-pointer flex-col items-start border-t-2 pt-5 pb-3 text-left ${active === index ? "border-ink" : "border-line hover:border-ink-faint"}`}
            >
              <span className={`font-heading text-[3rem] leading-none font-extrabold ${active === index ? "text-signal" : "text-ink-faint"}`} aria-hidden="true">
                {index + 1}
              </span>
              <span className="mt-3 font-heading text-[1.3rem] leading-tight font-bold tracking-[-0.01em]">{step.title}</span>
              <span className="mt-2 leading-[1.6] text-ink-soft">{step.line}</span>
            </button>
          </li>
        ))}
      </ol>
    </Section>
  );
}
