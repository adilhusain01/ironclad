import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { siteFile } from "../src/guards.js";

// Requirement: the site's pages answer at clean addresses. /zshield serves zshield.html, and the
// addresses already shared (/zshield.html, /) keep working. Nothing outside the built site is served,
// and a folder is never served as a file.
describe("site file lookup", () => {
  let dist: string;
  beforeAll(() => {
    dist = mkdtempSync(join(tmpdir(), "ironclad-site-"));
    writeFileSync(join(dist, "index.html"), "home");
    writeFileSync(join(dist, "zshield.html"), "zshield");
    mkdirSync(join(dist, "assets"));
    writeFileSync(join(dist, "assets", "main.js"), "js");
  });

  it("serves the home page at /", () => {
    expect(siteFile(dist, "/")).toBe(join(dist, "index.html"));
  });
  it("serves a page at its clean address", () => {
    expect(siteFile(dist, "/zshield")).toBe(join(dist, "zshield.html"));
  });
  it("keeps the .html address working", () => {
    expect(siteFile(dist, "/zshield.html")).toBe(join(dist, "zshield.html"));
  });
  it("serves assets as they are", () => {
    expect(siteFile(dist, "/assets/main.js")).toBe(join(dist, "assets", "main.js"));
  });
  it("finds nothing for a page that does not exist", () => {
    expect(siteFile(dist, "/nope")).toBeNull();
  });
  it("never serves a folder", () => {
    expect(siteFile(dist, "/assets")).toBeNull();
  });
  it("never leaves the built site", () => {
    expect(siteFile(dist, "/../../etc/passwd")).toBeNull();
    expect(siteFile(join(dist, "assets"), "/../zshield")).toBeNull();
  });
});
