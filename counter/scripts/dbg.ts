import { Zkool, incomingPayments } from "../src/zkool.js";
const z = new Zkool("http://127.0.0.1:8010");
const tip = await z.synchronize([1]);
const txs = await z.transactions(1);
console.log("tip", tip, "txs", txs.length);
console.log(JSON.stringify(incomingPayments(txs)));
