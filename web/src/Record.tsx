// The co-signer's ledger and the counter's orders, as the server has them right now.

import { shortId, TAZ, type LedgerEntry, type Order, type State } from "./api.ts";
import { ago } from "./Console.tsx";
import { CheckIcon, CrossIcon, Section, SectionHeading, TxLink } from "./pieces.tsx";
import { humanReason } from "./run.ts";

export function Record({ state }: { state: State | null }) {
  const labels = recipientLabels(state);
  return (
    <Section id="record">
      <SectionHeading title="Every decision is on the record">
        The co-signer writes each one to a hash-chained log before its share leaves. The counter logs what it bought. Both lists are live.
      </SectionHeading>
      <div className="mt-12 grid gap-x-16 gap-y-12 lg:grid-cols-2">
        <List title="Co-signer decisions" note={state ? `${state.ledger.length} most recent` : undefined}>
          {state?.ledger.length === 0 && <Empty text="No decisions yet. Press a key above to make one." />}
          {state?.ledger.map((entry, index) => <Decision key={entry.hash ?? `${entry.at}-${index}`} entry={entry} labels={labels} />)}
          {!state && <Empty text="Loading from the live server" />}
        </List>
        <List title="Orders on Bitrefill" note={state ? `${state.orders.length} most recent` : undefined}>
          {state?.orders.length === 0 && <Empty text="No orders yet." />}
          {state?.orders.map((order) => <OrderRow key={order.txid} order={order} />)}
          {!state && <Empty text="Loading from the live server" />}
        </List>
      </div>
    </Section>
  );
}

// The co-signer sees a payment's single receiver, not the full address the owner listed, so the page
// learns which receiver is which from the co-signer's own reasons ("... to Ironclad counter (...) is ...").
function recipientLabels(state: State | null): Map<string, string> {
  const labels = new Map<string, string>();
  for (const recipient of state?.policy.allowed_recipients ?? []) {
    const short = recipient.label.replace(/ \(.*\)$/, "");
    labels.set(recipient.address, short);
    for (const entry of state?.ledger ?? []) {
      const address = entry.payments[0]?.[0];
      if (address && entry.reason?.includes(`to ${recipient.label}`)) labels.set(address, short);
    }
  }
  return labels;
}

function List({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex items-baseline justify-between gap-3 pb-3">
        <h3 className="font-heading text-[1.5rem] leading-tight font-semibold tracking-[-0.01em]">{title}</h3>
        {note && <span className="text-sm text-ink-faint">{note}</span>}
      </div>
      <ul className="max-h-[560px] overflow-auto border-b border-line">{children}</ul>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <li className="border-t border-line py-5 text-ink-faint">{text}</li>;
}

function Decision({ entry, labels }: { entry: LedgerEntry; labels: Map<string, string> }) {
  const allowed = entry.decision === "allow";
  const [address, zat] = entry.payments[0] ?? ["", 0];
  const known = labels.get(address);
  return (
    <li className="flex gap-3 border-t border-line py-4">
      <span className={`mt-1 shrink-0 ${allowed ? "text-positive" : "text-danger"}`}>{allowed ? <CheckIcon size={16} /> : <CrossIcon size={16} />}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <span>
            <span className={`font-bold ${allowed ? "text-positive" : "text-danger"}`}>{allowed ? "Signed" : "Refused"}</span> <span className="font-mono text-[0.9rem]">{TAZ(zat)}</span> to{" "}
            {known ?? (
              <>
                a stranger <span className="font-mono text-[0.85rem] text-ink-soft">{shortId(address, 10, 6)}</span>
              </>
            )}
          </span>
          <time dateTime={entry.at} className="text-sm text-ink-faint" title={entry.at}>
            {ago(entry.at)}
          </time>
        </div>
        {entry.reason && <span className="text-sm break-words text-ink-soft">{humanReason(entry.reason)}</span>}
      </div>
    </li>
  );
}

function OrderRow({ order }: { order: Order }) {
  const delivered = order.status === "delivered";
  const mock = order.invoiceId?.startsWith("inv_mock");
  return (
    <li className="flex gap-3 border-t border-line py-4">
      <span className={`mt-1 shrink-0 ${delivered ? "text-positive" : "text-signal"}`}>{delivered ? <CheckIcon size={16} /> : <CrossIcon size={16} />}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <span>
            <span className="font-bold">{order.memo.productId}</span> <span className="font-mono text-[0.9rem]">{order.memo.value}</span> for a test number
          </span>
          <time dateTime={order.createdAt} className="text-sm text-ink-faint" title={order.createdAt}>
            {ago(order.createdAt)}
          </time>
        </div>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
          <span>
            {delivered ? "Delivered" : order.status}
            {order.invoiceId && (mock ? ", from a local mock before the API key arrived" : `, invoice ${order.invoiceId.slice(0, 8)}`)}
          </span>
          <TxLink txid={order.txid} label="payment" />
          {order.receiptTxid && <TxLink txid={order.receiptTxid} label="receipt" />}
        </span>
      </div>
    </li>
  );
}
