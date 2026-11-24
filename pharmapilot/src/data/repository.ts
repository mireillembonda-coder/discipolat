import type { IntegrationId } from '@/lib/integrations'
import type {
  AbcRow,
  Alert,
  AppUser,
  CategorySales,
  DailySales,
  Kpi,
  OrderSuggestion,
  PeriodDays,
  Pharmacy,
  ProductSales,
  StockItem,
} from './types'

/**
 * Contrat d'accès aux données. Deux implémentations strictement séparées :
 * - DemoRepository (src/data/demo)  : données fictives générées en mémoire, jamais persistées.
 * - LiveRepository (src/data/live)  : Supabase. Les méthodes non branchées lèvent NotConnectedError.
 */
export interface PharmacyRepository {
  readonly mode: 'demo' | 'live'
  listPharmacies(): Promise<Pharmacy[]>
  getKpis(pharmacyId: string, period: PeriodDays): Promise<Kpi>
  getDailySales(pharmacyId: string, period: PeriodDays): Promise<DailySales[]>
  getCategorySales(pharmacyId: string, period: PeriodDays): Promise<CategorySales[]>
  getTopProducts(pharmacyId: string, period: PeriodDays, limit?: number): Promise<ProductSales[]>
  getStock(pharmacyId: string): Promise<StockItem[]>
  getOrderSuggestions(pharmacyId: string): Promise<OrderSuggestion[]>
  getAlerts(pharmacyId: string): Promise<Alert[]>
  getAbcAnalysis(pharmacyId: string, period: PeriodDays): Promise<AbcRow[]>
  listUsers(pharmacyId: string): Promise<AppUser[]>
}

/** Signale qu'une fonctionnalité n'est pas encore branchée à un service réel. */
export class NotConnectedError extends Error {
  constructor(public readonly integration: IntegrationId) {
    super(`Fonctionnalité non connectée : ${integration}`)
    this.name = 'NotConnectedError'
  }
}
