// The live state, polled: every 2 seconds while a run is going (so its lines stream in), every 12
// seconds otherwise, and not at all while the tab is hidden.

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchState, type State } from "./api.ts";

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
      running = Boolean(next.run && !next.run.done);
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
