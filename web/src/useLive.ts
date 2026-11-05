// The live state, polled: every 2 seconds while a run is going (so its lines stream in), every 12
// seconds otherwise, and not at all while the tab is hidden.

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchState, type State } from "./api.ts";
import { outcomeOf } from "./run.ts";

// After a purchase is sent, keep polling fast until the counter's order is delivered or failed (at most
// five minutes), so the page shows "delivered" as soon as it happens.
function awaitingDelivery(state: State): boolean {
  const run = state.run;
  if (!run?.done || run.kind !== "buy" || !run.endedAt || Date.now() - Date.parse(run.endedAt) > 300_000) return false;
  const outcome = outcomeOf(run);
  if (outcome.kind !== "sent") return false;
  const order = state.orders.find((item) => item.txid === outcome.txid);
  return !order || !["delivered", "failed"].includes(order.status);
}

export function useLive() {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    window.clearTimeout(timer.current);
    if (busy.current) return;
    busy.current = true;
    let running = false;
    try {
      const next = await fetchState();
      setState(next);
      setError(null);
      running = Boolean(next.run && !next.run.done) || awaitingDelivery(next);
    } catch (problem) {
      setError(problem instanceof Error && problem.message.startsWith("The live") ? problem.message : "The live server can't be reached right now.");
    } finally {
      busy.current = false;
      if (document.visibilityState === "visible") timer.current = window.setTimeout(refresh, running ? 2000 : 12000);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return { state, error, refresh };
}
