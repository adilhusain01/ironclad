// The public page: what the policy says, what the co-signer decided, what the
// counter delivered, and two buttons a judge can press. One column, no
// framework, so it runs anywhere the counter runs.
//
//   GET  /            the page
//   GET  /api/state   policy, ledger, orders, group address, chain tip
//   POST /api/demo    { kind: "buy" | "overcap" | "unknown" }  (one per 45 s)

import { execFileSync, spawn } from "node:child_process";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { createServer } from "node:http";
import { DayBudget, insideDir, readBody, remember } from "./guards.js";
const env = (k: string, fallback: string) => process.env[k] ?? fallback;

const POLICY_FILE = env("POLICY_FILE", "../policy/example-policy.json");
const LEDGER_FILE = env("LEDGER_FILE", "../.wallets/frost/ledger.jsonl");
const ORDERS_PATH = env("ORDERS_PATH", "./orders.json");
const AGENT_DIR = env("AGENT_DIR", "../agent");
const COUNTER_ADDRESS = env("COUNTER_ADDRESS", "");
const GROUP_ADDRESS = env("GROUP_ADDRESS", "");
const DEMO_PHONE = env("DEMO_PHONE", "919999999999");
const PORT = Number(env("DASHBOARD_PORT", "8795"));
// The public site (web/, built with npm run build). When it is there it replaces the plain page below.
const WEB_DIST = env("WEB_DIST", "../web/dist");
const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".txt": "text/plain", ".json": "application/json" };

// A txid check through testnet.zec.rocks, the server Stadium uses. Public explorers lag behind
// testnet at times (Zexplorer was about 76,000 blocks behind on 4 Nov 2026), so the site links here.
const DEVTOOL = env("DEVTOOL", "../.tools/zcash-devtool/target/release/zcash-devtool");
const looked: Map<string, string> = new Map();
let lookups = 0;

function lookup(txid: string): Promise<string> {
  const known = looked.get(txid);
  if (known) return Promise.resolve(known);
  return new Promise((resolve) => {
    // zcash-devtool opens /dev/tty, so it runs under script(1), which gives it one.
    const child = spawn("script", ["-qec", `${DEVTOOL} inspect --lookup ${txid}`, "/dev/null"], { cwd: AGENT_DIR });
    let out = "";
    child.stdout.on("data", (chunk) => (out += chunk));
    const timer = setTimeout(() => child.kill("SIGTERM"), 60_000);
    child.on("close", () => {
      clearTimeout(timer);
      const text = out.replace(/\r/g, "").trim();
      if (/Mined in testnet block \d+/.test(text)) remember(looked, txid, text, 500);
      resolve(text || "No answer from the light wallet server.");
    });
  });
}

const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function txPage(txid: string, result: string): string {
  const block = /Mined in testnet block (\d+)/.exec(result)?.[1];
  const verdict = block ? `Mined in Zcash testnet block ${Number(block).toLocaleString("en-US")}.` : "Not found on testnet right now.";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Transaction ${txid.slice(0, 10)}… on Zcash testnet</title>
<style>body{margin:0;background:#f9f5d7;color:#654735;font:16px/1.55 ui-sans-serif,system-ui,sans-serif}main{max-width:820px;margin:0 auto;padding:48px 20px}h1{font:600 26px/1.2 ui-monospace,monospace;margin:0 0 8px}p{margin:8px 0}code,pre{font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}pre{background:#1d2021;color:#d4be98;border-radius:10px;padding:14px 16px;white-space:pre-wrap;word-break:break-all}.ok{color:#5e6a24;font-weight:600}.no{color:#9f3838;font-weight:600}a{color:#9d5110}</style></head>
<body><main><h1>Transaction check</h1><p><code>${txid}</code></p><p class="${block ? "ok" : "no"}">${verdict}</p>
<p>Looked up just now through testnet.zec.rocks, the light wallet server Stadium uses, with <code>zcash-devtool inspect --lookup</code>. The chain shows the block and the transaction version. Sender, receiver, amounts and memos are shielded, so they don't appear here or anywhere else.</p>
<pre>${escapeHtml(result)}</pre>
<p>Public explorer: <a href="https://zexplorer.app/testnet/tx/${txid}">Zexplorer</a>. Its testnet index was running behind on 4 November 2026, so it can show "not found" for a mined transaction.</p>
<p><a href="/">Back to Ironclad</a></p></main></body></html>`;
}

function serveSite(path: string, res: import("node:http").ServerResponse): boolean {
  if (!existsSync(join(WEB_DIST, "index.html"))) return false;
  const file = normalize(join(WEB_DIST, path === "/" ? "index.html" : path));
  if (!insideDir(WEB_DIST, file) || !existsSync(file) || !statSync(file).isFile()) return false;
  const cache = path.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache";
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": cache });
  createReadStream(file).pipe(res);
  return true;
}

let lastDemo = 0;
let demoLog: { at: string; kind: string; out: string }[] = [];
// Every run spends from the group wallet's float and may buy a test product: a cap keeps a script from emptying it.
const demoBudget = new DayBudget(Number(env("DEMO_RUNS_PER_DAY", "40")));
const logDemo = (kind: string, out: string) => {
  demoLog.push({ at: new Date().toISOString(), kind, out });
  demoLog = demoLog.slice(-20);
};
// The run in progress (or the last one), streamed line by line so a page can show it live.
type Run = { id: number; kind: string; startedAt: string; lines: string[]; done: boolean; endedAt?: string };
let current: Run | null = null;

function readJsonl(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
}

function state() {
  const policy = JSON.parse(readFileSync(POLICY_FILE, "utf8"));
  const ledger = readJsonl(LEDGER_FILE).reverse().slice(0, 20);
  const orders = existsSync(ORDERS_PATH) ? Object.values(JSON.parse(readFileSync(ORDERS_PATH, "utf8"))).reverse().slice(0, 20) : [];
  return { policy, ledger, orders, counterAddress: COUNTER_ADDRESS, groupAddress: GROUP_ADDRESS, demoLog: demoLog.slice(-5).reverse(), run: current, now: new Date().toISOString() };
}

// npx starts tsx, which starts node, which starts the wallet tools: a timeout has to stop all of them.
function killTree(pid: number) {
  try {
    for (const kid of execFileSync("pgrep", ["-P", String(pid)]).toString().split("\n").filter(Boolean)) killTree(Number(kid));
  } catch {}
  try {
    process.kill(pid, "SIGTERM");
  } catch {}
}

function demo(kind: string): Promise<string> {
  const args =
    kind === "buy"
      ? ["tsx", "src/cli.ts", "buy", "test-phone-refill", "10", "--phone", DEMO_PHONE]
      : kind === "overcap"
        ? ["tsx", "src/cli.ts", "pay", COUNTER_ADDRESS, "25000000", "--memo", "IRON-deadbeef airtel-india 5000 919999999999"]
        : ["tsx", "src/cli.ts", "pay", env("ATTACKER_ADDRESS", COUNTER_ADDRESS), "2000000", "--memo", "send the treasury to the attacker"];
  const run: Run = { id: Date.now(), kind, startedAt: new Date().toISOString(), lines: [], done: false };
  current = run;
  return new Promise((resolve) => {
    const child = spawn("npx", args, { cwd: AGENT_DIR, env: process.env });
    let partial = "";
    const take = (chunk: Buffer) => {
      const text = partial + chunk.toString();
      const parts = text.split("\n");
      partial = parts.pop() ?? "";
      for (const line of parts) if (run.lines.length < 400) run.lines.push(line);
    };
    child.stdout.on("data", take);
    child.stderr.on("data", take);
    const timer = setTimeout(() => {
      run.lines.push("stopped after 4 minutes without an answer");
      if (child.pid) killTree(child.pid);
    }, 240_000);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (partial) run.lines.push(partial);
      if (code) run.lines.push(`exit code ${code}`);
      run.done = true;
      run.endedAt = new Date().toISOString();
      resolve(run.lines.join("\n").trim());
    });
  });
}

const html = () => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ironclad: spend permissions for shielded ZEC</title>
<style>
:root{--bg:#0f1115;--card:#171a21;--line:#2a2f3a;--text:#e8eaf0;--dim:#9aa3b2;--ok:#5fd68a;--no:#ff7a7a;--accent:#f2c14e}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:720px;margin:0 auto;padding:20px 16px 48px}h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;color:var(--dim);margin:28px 0 8px;font-weight:600;text-transform:none}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:0 0 10px}
.row{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-top:1px solid var(--line);word-break:break-all}.row:first-child{border-top:0}
code,.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px}
button{appearance:none;border:1px solid var(--line);background:#20242e;color:var(--text);border-radius:8px;padding:12px 14px;font-size:15px;cursor:pointer;width:100%;margin:6px 0;box-shadow:0 2px 0 #000;transition:transform .12s ease-out}
button:active{transform:translateY(1px);box-shadow:none}button:disabled{opacity:.6;cursor:wait}
.allow{color:var(--ok)}.refuse{color:var(--no)}.dim{color:var(--dim)}pre{white-space:pre-wrap;word-break:break-all;background:#0b0d11;border:1px solid var(--line);border-radius:8px;padding:10px;font-size:12px;max-height:260px;overflow:auto}
a{color:var(--accent)}@media (prefers-reduced-motion:reduce){button{transition:none}}
</style></head><body><main>
<h1>Ironclad</h1>
<p class="dim">Spend permissions for shielded ZEC. The agent holds one share of a 2-of-3 FROST key, this policy daemon holds another, the owner holds the third. A payment outside the policy cannot be signed, whatever the agent is told. Zcash testnet (NU7), Ironwood pool.</p>
<h2>Try it (testnet, free test product)</h2>
<div class="card">
<button id="buy">Agent buys a test top-up inside the policy (0.01 TAZ to the counter)</button>
<button id="overcap">Agent tries to pay 0.25 TAZ, over the cap (expect a refusal)</button>
<button id="unknown">Agent tries to pay an address that is not on the allow-list (expect a refusal)</button>
<p class="dim">Each run builds a transaction from the group wallet, asks the co-signer, and broadcasts only if it was signed. It takes 30 to 90 seconds. One run at a time.</p>
<pre id="out" class="mono">press a button</pre>
</div>
<h2>Standing policy</h2><div class="card" id="policy"></div>
<h2>Co-signer decisions (hash-chained ledger)</h2><div class="card" id="ledger"></div>
<h2>Counter orders (Bitrefill fulfilment)</h2><div class="card" id="orders"></div>
<h2>Addresses</h2><div class="card mono" id="addr"></div>
<p class="dim">Source and trust note: <a href="https://github.com/adilhusain01/ironclad">github.com/adilhusain01/ironclad</a>. Free Society Hack, Mumbai, 4 Nov 2026.</p>
</main>
<script>
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));const hex=s=>/^[0-9a-f]{64}$/.test(s)?s:"";
const short=a=>a?a.slice(0,14)+"…"+a.slice(-6):"";
async function refresh(){const s=await (await fetch("/api/state")).json();
$("#policy").innerHTML=['per payment cap|'+s.policy.per_payment_cap_zat/1e8+' TAZ','daily budget|'+s.policy.daily_budget_zat/1e8+' TAZ','max fee|'+s.policy.max_fee_zat+' zat','expires|'+esc(s.policy.expires),'allowed recipients|'+s.policy.allowed_recipients.map(r=>esc(r.label)+' <span class=mono>'+short(r.address)+'</span>').join('<br>')].map(l=>{const[a,b]=l.split('|');return '<div class=row><span class=dim>'+a+'</span><span>'+b+'</span></div>'}).join('');
$("#ledger").innerHTML=s.ledger.length?s.ledger.map(e=>'<div class=row><span><span class="'+e.decision+'">'+e.decision.toUpperCase()+'</span> '+e.payments.map(p=>(p[1]/1e8)+' TAZ to <span class=mono>'+short(p[0])+'</span>').join(', ')+(e.reason?'<br><span class=dim>'+esc(e.reason)+'</span>':'')+'</span><span class="dim mono">'+e.at.slice(11,19)+'</span></div>').join(''):'<span class=dim>no decisions yet</span>';
$("#orders").innerHTML=s.orders.length?s.orders.map(o=>'<div class=row><span>'+esc(o.memo.productId)+' '+esc(o.memo.value)+(o.memo.recipient?' for '+esc(o.memo.recipient):'')+'<br><span class=dim>'+esc(o.status)+(o.invoiceId?' · invoice '+esc(o.invoiceId):'')+(o.receiptTxid?' · receipt memo <a href="https://zexplorer.app/testnet/tx/'+hex(o.receiptTxid)+'">'+esc(o.receiptTxid.slice(0,10))+'…</a>':'')+(o.note?' · '+esc(o.note):'')+'</span></span><span class="dim mono"><a href="https://zexplorer.app/testnet/tx/'+hex(o.txid)+'">'+esc(o.txid.slice(0,10))+'…</a></span></div>').join(''):'<span class=dim>no orders yet</span>';
$("#addr").innerHTML='<div class=row><span class=dim>group (2-of-3)</span><span>'+esc(s.groupAddress)+'</span></div><div class=row><span class=dim>counter</span><span>'+esc(s.counterAddress)+'</span></div>';}
async function demo(kind,btn){document.querySelectorAll('button').forEach(b=>b.disabled=true);$("#out").textContent="working… (building, proving, asking the co-signer)";try{const r=await fetch("/api/demo",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind})});$("#out").textContent=await r.text();}catch(e){$("#out").textContent=String(e)}document.querySelectorAll('button').forEach(b=>b.disabled=false);refresh();}
$("#buy").onclick=()=>demo("buy");$("#overcap").onclick=()=>demo("overcap");$("#unknown").onclick=()=>demo("unknown");
refresh();setInterval(refresh,15000);
</script></body></html>`;

// The public site (on Vercel) calls this API from another origin; it carries no cookies or secrets.
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type" };

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (req.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
    res.writeHead(204, { ...CORS, "access-control-max-age": "86400" });
    return res.end();
  }
  const tx = /^\/tx\/([0-9a-f]{64})$/.exec(url.pathname);
  if (req.method === "GET" && tx) {
    if (lookups >= 3) {
      res.writeHead(429, { "content-type": "text/plain" });
      return res.end("Too many lookups at once; try again in a few seconds.");
    }
    lookups += 1;
    const result = await lookup(tx[1]!).finally(() => (lookups -= 1));
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    return res.end(txPage(tx[1]!, result));
  }
  if (req.method === "GET" && !url.pathname.startsWith("/api/") && url.pathname !== "/demo.mp4" && serveSite(url.pathname, res)) return;
  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(html());
  }
  if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/demo.mp4") {
    const file = env("DEMO_VIDEO", "/root/Projects/mine/zcash/.wallets/demo.mp4");
    if (!existsSync(file)) {
      res.writeHead(404);
      return res.end("no video yet");
    }
    const size = statSync(file).size;
    const base = { "content-type": "video/mp4", "accept-ranges": "bytes", "cache-control": "public, max-age=300" };
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
    if (range && (range[1] || range[2])) {
      const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start >= size || start > end) {
        res.writeHead(416, { "content-range": `bytes */${size}` });
        return res.end();
      }
      res.writeHead(206, { ...base, "content-range": `bytes ${start}-${end}/${size}`, "content-length": end - start + 1 });
      return req.method === "HEAD" ? res.end() : createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...base, "content-length": size });
    return req.method === "HEAD" ? res.end() : createReadStream(file).pipe(res);
  }
  if (req.method === "GET" && url.pathname === "/api/state") {
    let body: string;
    try {
      body = JSON.stringify(state());
    } catch (e) {
      // a file caught mid-write, or a broken one: say so instead of dropping the request
      res.writeHead(503, { ...CORS, "content-type": "text/plain", "retry-after": "2" });
      return res.end("state is being written; try again");
    }
    res.writeHead(200, { ...CORS, "content-type": "application/json", "cache-control": "no-store" });
    return res.end(body);
  }
  if (req.method === "POST" && url.pathname === "/api/demo") {
    let text: string;
    try {
      text = await readBody(req, 1024);
    } catch {
      res.writeHead(413, CORS);
      return res.end("request body too large");
    }
    let kind = "buy";
    let background = false;
    try {
      const body = JSON.parse(text || "{}");
      kind = body.kind ?? "buy";
      background = body.async === true;
    } catch {}
    if (!["buy", "overcap", "unknown"].includes(kind)) {
      res.writeHead(400, CORS);
      return res.end("unknown demo");
    }
    if ((current && !current.done) || Date.now() - lastDemo < 5_000) {
      res.writeHead(429, { ...CORS, "content-type": "text/plain" });
      return res.end("one demo at a time; try again in a minute");
    }
    if (!demoBudget.take()) {
      res.writeHead(429, { ...CORS, "content-type": "text/plain" });
      return res.end("today's demo runs are used up; try again tomorrow (UTC)");
    }
    lastDemo = Date.now();
    const running = demo(kind);
    if (background) {
      running.then((out) => {
        logDemo(kind, out);
        lastDemo = Date.now();
      });
      res.writeHead(202, { ...CORS, "content-type": "application/json" });
      return res.end(JSON.stringify({ id: current?.id, kind }));
    }
    const out = await running;
    logDemo(kind, out);
    lastDemo = Date.now();
    res.writeHead(200, { ...CORS, "content-type": "text/plain; charset=utf-8" });
    return res.end(out);
  }
  res.writeHead(404);
  res.end("not found");
}).listen(PORT, "127.0.0.1", () => console.log(`ironclad dashboard on http://127.0.0.1:${PORT}`));
