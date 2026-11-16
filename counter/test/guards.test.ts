import { describe, it, expect } from "vitest";
import { Readable } from "node:stream";
import { DayBudget, insideDir, maskPhones, readBody, remember } from "../src/guards.js";

// Requirements for the public dashboard, which anyone on the internet can call:
// a request body has a size limit, a file path never leaves the site folder
// (not even into a sibling folder whose name starts the same), the demo runs a
// bounded number of times a day, and caches keep a bounded number of entries.
// A phone number (an Indian one, 91 and ten digits, as top-ups carry them) never
// leaves in full: everything public shows only its first two and last two digits,
// while txids, run ids and amounts are left alone.

describe("dashboard guards", () => {
  it("masks phone numbers in what the public API sends", () => {
    const state = JSON.stringify({
      orders: [{ memo: { recipient: "919876543210" }, note: "topped up 919876543210" }],
      demoLog: [{ out: "IRON-11112222 test-phone-refill 10 918765432109\nrefill for 918765432109" }],
    });
    const masked = maskPhones(state);
    expect(masked).not.toMatch(/9876543210|8765432109/);
    expect(masked).toContain('"recipient":"91********10"');
    expect(masked).toContain("test-phone-refill 10 91********09\\nrefill for 91********09");
    const untouched = JSON.stringify({ txid: "91" + "0".repeat(62), runId: 1763251200000, zat: 912345678901234, hash: "a919876543210b" });
    expect(maskPhones(untouched)).toBe(untouched);
  });

  it("keeps file paths inside the site folder", () => {
    expect(insideDir("/srv/web/dist", "/srv/web/dist/assets/a.js")).toBe(true);
    expect(insideDir("/srv/web/dist", "/srv/web/dist")).toBe(true);
    expect(insideDir("/srv/web/dist", "/srv/web/dist2/secret.json")).toBe(false);
    expect(insideDir("/srv/web/dist", "/srv/web/dist/../.env")).toBe(false);
  });

  it("reads a small body and refuses one over the limit", async () => {
    expect(await readBody(Readable.from([Buffer.from('{"kind":"buy"}')]), 1024)).toBe('{"kind":"buy"}');
    const big = Readable.from([Buffer.alloc(800), Buffer.alloc(800)]);
    await expect(readBody(big, 1024)).rejects.toThrow(/too large/);
  });

  it("allows a set number of runs per UTC day and starts again the next day", () => {
    const budget = new DayBudget(2);
    const day1 = new Date("2026-11-13T10:00:00Z");
    expect(budget.take(day1)).toBe(true);
    expect(budget.take(day1)).toBe(true);
    expect(budget.take(day1)).toBe(false);
    expect(budget.take(new Date("2026-11-14T00:00:01Z"))).toBe(true);
  });

  it("keeps at most the given number of entries, dropping the oldest", () => {
    const cache = new Map<string, string>();
    for (let i = 0; i < 5; i++) remember(cache, `k${i}`, "v", 3);
    expect([...cache.keys()]).toEqual(["k2", "k3", "k4"]);
  });
});
