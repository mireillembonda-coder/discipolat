import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { demoRepository } from '@/data/demo/repository'
import { liveRepository } from '@/data/live/repository'
import type { PharmacyRepository } from '@/data/repository'
import type { DataMode, Pharmacy } from '@/data/types'

const DEMO_FLAG = 'pharmapilot.demo'
const SELECTED_KEY = (mode: DataMode) => `pharmapilot.pharmacy.${mode}`

function storageGet(store: Storage, key: string) {
  try {
    return store.getItem(key)
  } catch {
    return null
  }
}
function storageSet(store: Storage, key: string, value: string | null) {
  try {
    if (value === null) store.removeItem(key)
    else store.setItem(key, value)
  } catch {
    /* ignoré */
  }
}

interface WorkspaceValue {
  /** null = ni session réelle, ni démonstration : l'utilisateur doit se connecter. */
  mode: DataMode | null
  repository: PharmacyRepository | null
  pharmacies: Pharmacy[]
  pharmaciesStatus: 'idle' | 'loading' | 'ready' | 'error'
  pharmaciesError: unknown
  current: Pharmacy | null
  selectPharmacy: (id: string) => void
  enterDemo: () => void
  exitDemo: () => void
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null)

/**
 * Espace de travail : mode de données (démo / réel), dépôt associé et pharmacie sélectionnée.
 * La démonstration et les données réelles utilisent des dépôts, des listes de pharmacies et des
 * sélections mémorisées distincts : elles ne sont jamais mélangées.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [demo, setDemo] = useState(() => storageGet(sessionStorage, DEMO_FLAG) === '1')
  const mode: DataMode | null = demo ? 'demo' : session ? 'live' : null
  const repository = mode === 'demo' ? demoRepository : mode === 'live' ? liveRepository : null

  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([])
  const [status, setStatus] = useState<WorkspaceValue['pharmaciesStatus']>('idle')
  const [error, setError] = useState<unknown>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setPharmacies([])
    setError(null)
    if (!repository || !mode) {
      setStatus('idle')
      setSelectedId(null)
      return
    }
    setStatus('loading')
    repository
      .listPharmacies()
      .then((list) => {
        if (cancelled) return
        setPharmacies(list)
        const remembered = storageGet(localStorage, SELECTED_KEY(mode))
        setSelectedId(list.find((p) => p.id === remembered)?.id ?? list[0]?.id ?? null)
        setStatus('ready')
      })
      .catch((e) => {
        if (cancelled) return
        setError(e)
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [repository, mode, session?.user.id])

  const selectPharmacy = useCallback(
    (id: string) => {
      if (!mode || !pharmacies.some((p) => p.id === id)) return
      setSelectedId(id)
      storageSet(localStorage, SELECTED_KEY(mode), id)
    },
    [mode, pharmacies],
  )

  const value = useMemo<WorkspaceValue>(
    () => ({
      mode,
      repository,
      pharmacies,
      pharmaciesStatus: status,
      pharmaciesError: error,
      current: pharmacies.find((p) => p.id === selectedId) ?? null,
      selectPharmacy,
      enterDemo: () => {
        storageSet(sessionStorage, DEMO_FLAG, '1')
        setDemo(true)
      },
      exitDemo: () => {
        storageSet(sessionStorage, DEMO_FLAG, null)
        setDemo(false)
      },
    }),
    [mode, repository, pharmacies, status, error, selectedId, selectPharmacy],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace doit être utilisé dans WorkspaceProvider')
  return ctx
}
