import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DataMode, DataSource, Pharmacy } from "@/data/types";
import { demoSource } from "@/data/demo/demoSource";
import { liveSource } from "@/data/supabase/liveSource";

interface WorkspaceState {
  mode: DataMode;
  source: DataSource;
  /** Préfixe de route : `/demo` ou `/app`. */
  basePath: string;
  pharmacies: Pharmacy[];
  pharmacy: Pharmacy | null;
  loading: boolean;
  error: Error | null;
  selectPharmacy(id: string): void;
}

const WorkspaceContext = createContext<WorkspaceState | null>(null);

/**
 * Espace de travail isolé par mode. Le mode démo et le mode réel utilisent :
 *  - une source de données distincte,
 *  - une clé de stockage local distincte pour l'officine sélectionnée,
 *  - un préfixe de route distinct.
 * Ils ne peuvent donc jamais partager ni mélanger leurs données.
 */
export function WorkspaceProvider({ mode, children }: { mode: DataMode; children: ReactNode }) {
  const source = mode === "demo" ? demoSource : liveSource;
  const storageKey = `pp.${mode}.pharmacy`;
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    source
      .listPharmacies()
      .then((list) => {
        if (cancelled) return;
        // Garde-fou : une source ne doit renvoyer que des officines de son propre mode.
        setPharmacies(list.filter((p) => p.isDemo === (mode === "demo")));
        setError(null);
      })
      .catch((e: Error) => !cancelled && setError(e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [source, mode]);

  const selectPharmacy = useCallback(
    (id: string) => {
      setSelectedId(id);
      try {
        localStorage.setItem(storageKey, id);
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  );

  const pharmacy = pharmacies.find((p) => p.id === selectedId) ?? pharmacies[0] ?? null;

  const value = useMemo<WorkspaceState>(
    () => ({ mode, source, basePath: mode === "demo" ? "/demo" : "/app", pharmacies, pharmacy, loading, error, selectPharmacy }),
    [mode, source, pharmacies, pharmacy, loading, error, selectPharmacy],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace doit être utilisé dans <WorkspaceProvider>");
  return ctx;
}
