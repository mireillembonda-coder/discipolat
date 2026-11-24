import { useEffect, useState } from 'react'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { NotConnectedError, type PharmacyRepository } from '@/data/repository'
import type { IntegrationId } from '@/lib/integrations'

export type DataState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'not_connected'; integration: IntegrationId }
  | { status: 'no_pharmacy' }
  | { status: 'error'; error: unknown }

/**
 * Charge une donnée pour la pharmacie courante via le dépôt du mode actif.
 * Distingue « non connecté » (fonctionnalité à brancher) d'une vraie erreur.
 */
export function usePharmacyData<T>(
  loader: (repo: PharmacyRepository, pharmacyId: string) => Promise<T>,
  deps: unknown[] = [],
): DataState<T> {
  const { repository, current } = useWorkspace()
  const [state, setState] = useState<DataState<T>>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    if (!repository || !current) {
      setState({ status: 'no_pharmacy' })
      return
    }
    setState({ status: 'loading' })
    loader(repository, current.id)
      .then((data) => !cancelled && setState({ status: 'ready', data }))
      .catch((error) => {
        if (cancelled) return
        if (error instanceof NotConnectedError) setState({ status: 'not_connected', integration: error.integration })
        else setState({ status: 'error', error })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repository, current?.id, ...deps])

  return state
}
