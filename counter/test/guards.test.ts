import { describe, it, expect } from "vitest";
import { Readable } from "node:stream";
import { DayBudget, insideDir, readBody, remember } from "../src/guards.js";

// Requirements for the public dashboard, which anyone on the internet can call:
// a request body has a size limit, a file path never leaves the site folder
// (not even into a sibling folder whose name starts the same), the demo runs a
// bounded number of times a day, and caches keep a bounded number of entries.

describe("dashboard guards", () => {
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
