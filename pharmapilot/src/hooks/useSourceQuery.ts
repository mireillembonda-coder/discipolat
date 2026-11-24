import { useCallback, useEffect, useState, type DependencyList } from "react";
import { NotConnectedError, type DataSource, type FeatureKey, type Pharmacy } from "@/data/types";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export type QueryState<T> =
  | { status: "loading" }
  | { status: "no-pharmacy" }
  | { status: "not-connected"; feature: FeatureKey }
  | { status: "error"; error: Error }
  | { status: "ok"; data: T };

/** Interroge la source du mode courant pour l'officine sélectionnée. */
export function useSourceQuery<T>(fetcher: (source: DataSource, pharmacy: Pharmacy) => Promise<T>, deps: DependencyList = []) {
  const { source, pharmacy } = useWorkspace();
  const [state, setState] = useState<QueryState<T>>({ status: "loading" });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!pharmacy) {
      setState({ status: "no-pharmacy" });
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    fetcher(source, pharmacy)
      .then((data) => !cancelled && setState({ status: "ok", data }))
      .catch((error: Error) => {
        if (cancelled) return;
        if (error instanceof NotConnectedError) setState({ status: "not-connected", feature: error.feature });
        else setState({ status: "error", error });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, pharmacy?.id, nonce, ...deps]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { state, reload };
}
