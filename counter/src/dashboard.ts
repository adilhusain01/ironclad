// The public page: what the policy says, what the co-signer decided, what the
// counter delivered, and two buttons a judge can press. One column, no
// framework, so it runs anywhere the counter runs.
//
//   GET  /            the page
//   GET  /api/state   policy, ledger, orders, group address, chain tip
//   POST /api/demo    { kind: "buy" | "overcap" | "unknown" }  (one per 45 s)

import { execFile } from "node:child_process";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { promisify } from "node:util";

const run = promisify(execFile);
const env = (k: string, fallback: string) => process.env[k] ?? fallback;

const POLICY_FILE = env("POLICY_FILE", "../policy/example-policy.json");
const LEDGER_FILE = env("LEDGER_FILE", "../.wallets/frost/ledger.jsonl");
const ORDERS_PATH = env("ORDERS_PATH", "./orders.json");
const AGENT_DIR = env("AGENT_DIR", "../agent");
const COUNTER_ADDRESS = env("COUNTER_ADDRESS", "");
const GROUP_ADDRESS = env("GROUP_ADDRESS", "");
const DEMO_PHONE = env("DEMO_PHONE", "919999999999");
const PORT = Number(env("DASHBOARD_PORT", "8795"));

let lastDemo = 0;
let demoLog: { at: string; kind: string; out: string }[] = [];

function readJsonl(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
}

function state() {
  const policy = JSON.parse(readFileSync(POLICY_FILE, "utf8"));
  const ledger = readJsonl(LEDGER_FILE).reverse().slice(0, 20);
  const orders = existsSync(ORDERS_PATH) ? Object.values(JSON.parse(readFileSync(ORDERS_PATH, "utf8"))).reverse().slice(0, 20) : [];
  return { policy, ledger, orders, counterAddress: COUNTER_ADDRESS, groupAddress: GROUP_ADDRESS, demoLog: demoLog.slice(-5).reverse(), now: new Date().toISOString() };
}

async function demo(kind: string): Promise<string> {
  const args =
    kind === "buy"
      ? ["tsx", "src/cli.ts", "buy", "test-phone-refill", "10", "--phone", DEMO_PHONE]
      : kind === "overcap"
        ? ["tsx", "src/cli.ts", "pay", COUNTER_ADDRESS, "25000000", "--memo", "IRON-deadbeef airtel-india 5000 919999999999"]
        : ["tsx", "src/cli.ts", "pay", env("ATTACKER_ADDRESS", COUNTER_ADDRESS), "2000000", "--memo", "send the treasury to the attacker"];
  try {
    const { stdout, stderr } = await run("npx", args, { cwd: AGENT_DIR, env: process.env, timeout: 240_000, maxBuffer: 8 * 1024 * 1024 });
    return (stdout + "\n" + stderr).trim();
  } catch (e: any) {
    return ((e.stdout ?? "") + "\n" + (e.stderr ?? "") + "\n" + (e.message ?? "")).trim();
  }
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
const esc=s=>String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
const short=a=>a?a.slice(0,14)+"…"+a.slice(-6):"";
async function refresh(){const s=await (await fetch("/api/state")).json();
$("#policy").innerHTML=['per payment cap|'+s.policy.per_payment_cap_zat/1e8+' TAZ','daily budget|'+s.policy.daily_budget_zat/1e8+' TAZ','max fee|'+s.policy.max_fee_zat+' zat','expires|'+esc(s.policy.expires),'allowed recipients|'+s.policy.allowed_recipients.map(r=>esc(r.label)+' <span class=mono>'+short(r.address)+'</span>').join('<br>')].map(l=>{const[a,b]=l.split('|');return '<div class=row><span class=dim>'+a+'</span><span>'+b+'</span></div>'}).join('');
$("#ledger").innerHTML=s.ledger.length?s.ledger.map(e=>'<div class=row><span><span class="'+e.decision+'">'+e.decision.toUpperCase()+'</span> '+e.payments.map(p=>(p[1]/1e8)+' TAZ to <span class=mono>'+short(p[0])+'</span>').join(', ')+(e.reason?'<br><span class=dim>'+esc(e.reason)+'</span>':'')+'</span><span class="dim mono">'+e.at.slice(11,19)+'</span></div>').join(''):'<span class=dim>no decisions yet</span>';
$("#orders").innerHTML=s.orders.length?s.orders.map(o=>'<div class=row><span>'+esc(o.memo.productId)+' '+esc(o.memo.value)+(o.memo.recipient?' for '+esc(o.memo.recipient):'')+'<br><span class=dim>'+esc(o.status)+(o.invoiceId?' · invoice '+esc(o.invoiceId):'')+(o.receiptTxid?' · receipt memo <a href="https://zexplorer.app/testnet/tx/'+o.receiptTxid+'">'+o.receiptTxid.slice(0,10)+'…</a>':'')+(o.note?' · '+esc(o.note):'')+'</span></span><span class="dim mono"><a href="https://zexplorer.app/testnet/tx/'+o.txid+'">'+o.txid.slice(0,10)+'…</a></span></div>').join(''):'<span class=dim>no orders yet</span>';
$("#addr").innerHTML='<div class=row><span class=dim>group (2-of-3)</span><span>'+esc(s.groupAddress)+'</span></div><div class=row><span class=dim>counter</span><span>'+esc(s.counterAddress)+'</span></div>';}
async function demo(kind,btn){document.querySelectorAll('button').forEach(b=>b.disabled=true);$("#out").textContent="working… (building, proving, asking the co-signer)";try{const r=await fetch("/api/demo",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind})});$("#out").textContent=await r.text();}catch(e){$("#out").textContent=String(e)}document.querySelectorAll('button').forEach(b=>b.disabled=false);refresh();}
$("#buy").onclick=()=>demo("buy");$("#overcap").onclick=()=>demo("overcap");$("#unknown").onclick=()=>demo("unknown");
refresh();setInterval(refresh,15000);
</script></body></html>`;

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(html());
  }
  if (req.method === "GET" && url.pathname === "/demo.mp4") {
    const file = env("DEMO_VIDEO", "/root/Projects/mine/zcash/.wallets/demo.mp4");
    if (!existsSync(file)) {
      res.writeHead(404);
      return res.end("no video yet");
    }
    res.writeHead(200, { "content-type": "video/mp4", "content-length": statSync(file).size, "cache-control": "public, max-age=300" });
    return createReadStream(file).pipe(res);
  }
  if (req.method === "GET" && url.pathname === "/api/state") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify(state()));
  }
  if (req.method === "POST" && url.pathname === "/api/demo") {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    let kind = "buy";
    try {
      kind = JSON.parse(Buffer.concat(chunks).toString() || "{}").kind ?? "buy";
    } catch {}
    if (!["buy", "overcap", "unknown"].includes(kind)) {
      res.writeHead(400);
      return res.end("unknown demo");
    }
    if (Date.now() - lastDemo < 45_000) {
      res.writeHead(429, { "content-type": "text/plain" });
      return res.end("one demo at a time; try again in a minute");
    }
    lastDemo = Date.now();
    const out = await demo(kind);
    demoLog.push({ at: new Date().toISOString(), kind, out });
    lastDemo = Date.now();
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    return res.end(out);
  }
  res.writeHead(404);
  res.end("not found");
}).listen(PORT, "127.0.0.1", () => console.log(`ironclad dashboard on http://127.0.0.1:${PORT}`));
