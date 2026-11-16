// Limits for the public dashboard: anyone on the internet can call it.

import { existsSync, statSync } from "node:fs";
import { join, normalize, resolve, sep } from "node:path";

/** Whether `file` is `dir` or inside it, after resolving `..`. */
export function insideDir(dir: string, file: string): boolean {
  const root = resolve(dir);
  const target = resolve(file);
  return target === root || target.startsWith(root + sep);
}

// The file a site path names inside the built site: / is index.html, and a path with no file of its own
// tries the same name with .html, so /zshield serves zshield.html. Folders and anything outside are null.
export function siteFile(dist: string, path: string): string | null {
  const base = normalize(join(dist, path === "/" ? "index.html" : path));
  for (const file of [base, `${base}.html`]) {
    if (insideDir(dist, file) && existsSync(file) && statSync(file).isFile()) return file;
  }
  return null;
}

// An Indian phone number as top-ups carry it (91 and ten digits) standing on its own: not part of a
// longer number, a hex hash or a word. A JSON escape such as \n before it still counts as a boundary.
const PHONE = /(?:(?<![0-9A-Za-z])|(?<=\\[nrt]))91(\d{8})(\d{2})(?![0-9A-Za-z])/g;

/** Text for the public API with every phone number cut to its first and last two digits. */
export function maskPhones(text: string): string {
  return text.replace(PHONE, (_match, _middle, last: string) => `91********${last}`);
}

/** The request body as text, or an error once it passes `max` bytes. */
export async function readBody(stream: AsyncIterable<unknown>, max: number): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of stream) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buf.length;
    if (size > max) throw new Error(`request body too large (over ${max} bytes)`);
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString();
}

/** At most `limit` uses per UTC day. */
export class DayBudget {
  private day = "";
  private used = 0;

  constructor(private readonly limit: number) {}

  take(now = new Date()): boolean {
    const today = now.toISOString().slice(0, 10);
    if (today !== this.day) {
      this.day = today;
      this.used = 0;
    }
    if (this.used >= this.limit) return false;
    this.used += 1;
    return true;
  }
}

/** Sets `key` in `map`, dropping the oldest entries past `limit`. */
export function remember<K, V>(map: Map<K, V>, key: K, value: V, limit: number) {
  map.delete(key);
  map.set(key, value);
  while (map.size > limit) map.delete(map.keys().next().value as K);
}
