/**
 * Registre des fonctionnalités et de leur état de branchement.
 * C'est la source unique utilisée par l'interface (badges « À connecter ») et par la page Paramètres.
 *
 * - ready      : fonctionne réellement (pas de simulation).
 * - partial    : l'interface et une partie de la logique existent, le reste est à brancher.
 * - to_connect : seule l'interface existe ; aucun service n'est appelé.
 */
export type IntegrationStatus = 'ready' | 'partial' | 'to_connect'

export interface Integration {
  id: string
  status: IntegrationStatus
  /** Clé i18n du nom et de la description : integrations.<id>.name / .desc */
}

export const INTEGRATIONS = [
  { id: 'auth', status: 'partial' },
  { id: 'pharmacies', status: 'partial' },
  { id: 'onboarding', status: 'to_connect' },
  { id: 'import_files', status: 'partial' },
  { id: 'lgo_connectors', status: 'to_connect' },
  { id: 'sales_analytics', status: 'to_connect' },
  { id: 'stock_analytics', status: 'to_connect' },
  { id: 'order_engine', status: 'to_connect' },
  { id: 'supplier_sending', status: 'to_connect' },
  { id: 'alerts_engine', status: 'to_connect' },
  { id: 'notifications', status: 'to_connect' },
  { id: 'reports_export', status: 'to_connect' },
  { id: 'ai_assistant', status: 'to_connect' },
  { id: 'users_invites', status: 'to_connect' },
  { id: 'billing', status: 'to_connect' },
  { id: 'password_reset', status: 'to_connect' },
] as const satisfies readonly Integration[]

export type IntegrationId = (typeof INTEGRATIONS)[number]['id']

export function getIntegration(id: IntegrationId): Integration {
  return INTEGRATIONS.find((i) => i.id === id)!
}
