// How one payment goes through: five steps that are also the controls of the diagram beside them.
// Picking a step lights its part of the route and sends a beam along it once.

import { useState } from "react";
import type { Point } from "./geometry.ts";
import { BeamLine, Connector, type BeamRun } from "./kit.tsx";
import { Section, SectionHeading } from "./pieces.tsx";

const steps = [
  { title: "The agent asks", line: "It builds a shielded payment with the order written in the encrypted memo." },
  { title: "The co-signer checks", line: "It reads the payment itself and compares it with your rules." },
  { title: "Only then it signs", line: "Inside the rules it adds its share. Outside them it refuses, and nothing can be signed." },
  { title: "The agent sends it", line: "Two shares make a valid signature. The payment goes out over Tor." },
  { title: "The counter delivers", line: "It sees the payment, buys the top-up from Bitrefill and sends back a shielded receipt." },
];

type Box = { x: number; y: number; w: number; h: number; title: string; line: string; dashed?: boolean };
const boxes: Record<"agent" | "you" | "cosigner" | "chain" | "counter" | "bitrefill", Box> = {
  agent: { x: 10, y: 20, w: 210, h: 88, title: "Agent", line: "share 1" },
  you: { x: 10, y: 222, w: 210, h: 88, title: "You", line: "share 3, offline", dashed: true },
  cosigner: { x: 420, y: 20, w: 230, h: 88, title: "Co-signer", line: "share 2, holds your rules" },
  chain: { x: 420, y: 222, w: 230, h: 88, title: "Zcash testnet", line: "shielded payments" },
  counter: { x: 820, y: 222, w: 210, h: 88, title: "Counter", line: "watches for orders" },
  bitrefill: { x: 820, y: 20, w: 210, h: 88, title: "Bitrefill", line: "sells the top-up" },
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
  const beam = (step: number, delay = 0, reverse = false): BeamRun | undefined => (active === step ? { play, delayMilliseconds: delay, reverse } : undefined);
  const on = (name: keyof typeof boxes) => lit[active]?.includes(name) ?? false;
  const ask: [Point, Point] = [[220, 50], [420, 50]];
  const reply: [Point, Point] = [[420, 80], [220, 80]];
  return (
    <Section id="how">
      <SectionHeading title="How a payment gets signed.">Two of three shares make a signature. The agent only ever has one.</SectionHeading>
      <div className="mt-10 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <ol className="flex flex-col gap-2">
          {steps.map((step, index) => (
            <li key={step.title}>
              <button
                type="button"
                onClick={() => pick(index)}
                aria-pressed={active === index}
                className={`press flex w-full cursor-pointer gap-3 rounded-inner border px-4 py-3 text-left transition-colors duration-150 ${active === index ? "border-line-strong bg-key shadow-key" : "border-transparent hover:bg-raised"}`}
              >
                <span className={`font-mono text-meta ${active === index ? "text-accent-ink" : "text-ink-faint"}`}>{index + 1}</span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-body font-medium text-ink">{step.title}</span>
                  <span className="text-meta text-ink-muted">{step.line}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div className="hidden items-center overflow-hidden rounded-outer border border-line bg-panel p-6 md:flex">
          <svg viewBox="0 0 1040 330" className="h-auto w-full" role="img" aria-label="The agent and the co-signer each hold one key share. Together they sign a shielded payment to the counter, which buys from Bitrefill. Your share stays offline.">
            <BeamLine id="beam-ask" from={ask[0]} to={ask[1]} lit={active === 1} run={beam(1)} />
            <BeamLine id="beam-reply" from={reply[0]} to={reply[1]} lit={active === 2} run={beam(2)} />
            <Connector points={[[115, 108], [115, 165], [535, 165], [535, 222]]} lit={active === 3} />
            <BeamLine id="beam-deliver" from={[650, 266]} to={[820, 266]} lit={active === 4} run={beam(4)} />
            <BeamLine id="beam-buy" from={[925, 222]} to={[925, 108]} lit={active === 4} run={beam(4, 450)} />
            {Object.entries(boxes).map(([name, box]) => (
              <g key={name}>
                <rect
                  x={box.x}
                  y={box.y}
                  width={box.w}
                  height={box.h}
                  rx={10}
                  strokeWidth={on(name as keyof typeof boxes) ? 1.6 : 1.2}
                  strokeDasharray={box.dashed ? "5 4" : undefined}
                  className={`transition-[stroke,fill] duration-200 ${on(name as keyof typeof boxes) ? "fill-key stroke-accent" : "fill-tray stroke-line-strong"}`}
                />
                <text x={box.x + 20} y={box.y + 38} className="fill-ink" fontSize={21} fontWeight={600}>
                  {box.title}
                </text>
                <text x={box.x + 20} y={box.y + 64} className="fill-ink-muted" fontSize={16}>
                  {box.line}
                </text>
              </g>
            ))}
            <text x={320} y={40} textAnchor="middle" className="fill-ink-muted font-mono" fontSize={14}>
              payment
            </text>
            <text x={320} y={102} textAnchor="middle" className="fill-ink-muted font-mono" fontSize={14}>
              share or refusal
            </text>
            <text x={325} y={155} textAnchor="middle" className="fill-ink-muted font-mono" fontSize={14}>
              signed, sent over Tor
            </text>
          </svg>
        </div>
      </div>
    </Section>
  );
}
