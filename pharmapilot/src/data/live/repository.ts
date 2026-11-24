/**
 * Implémentation « données réelles » du dépôt, adossée à Supabase.
 * Seule la liste des pharmacies est branchée (table `pharmacies`, filtrée par RLS).
 * Les analyses lèvent NotConnectedError : elles seront implémentées après l'importation des données
 * (vues SQL / fonctions RPC décrites dans supabase/migrations).
 */
import { supabase } from '@/lib/supabase'
import { NotConnectedError, type PharmacyRepository } from '../repository'
import type { Pharmacy } from '../types'

const notConnected = (id: ConstructorParameters<typeof NotConnectedError>[0]) => () => Promise.reject(new NotConnectedError(id))

export const liveRepository: PharmacyRepository = {
  mode: 'live',

  async listPharmacies() {
    if (!supabase) throw new NotConnectedError('pharmacies')
    const { data, error } = await supabase.from('pharmacies').select('id, name, city, country, currency').order('name')
    if (error) throw error
    return (data ?? []).map<Pharmacy>((r) => ({
      id: r.id as string,
      name: r.name as string,
      city: (r.city as string) ?? '',
      country: (r.country as string) ?? '',
      currency: (r.currency as string) ?? 'XAF',
      isDemo: false,
    }))
  },

  getKpis: notConnected('sales_analytics'),
  getDailySales: notConnected('sales_analytics'),
  getCategorySales: notConnected('sales_analytics'),
  getTopProducts: notConnected('sales_analytics'),
  getStock: notConnected('stock_analytics'),
  getOrderSuggestions: notConnected('order_engine'),
  getAlerts: notConnected('alerts_engine'),
  getAbcAnalysis: notConnected('reports_export'),
  listUsers: notConnected('users_invites'),
}
