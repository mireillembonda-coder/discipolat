/** Types métier partagés par la démonstration et les données réelles. */

export type DataMode = 'demo' | 'live'

export interface Pharmacy {
  id: string
  name: string
  city: string
  country: string
  currency: string
  /** true pour les pharmacies fictives du mode démonstration */
  isDemo: boolean
}

export type PeriodDays = 7 | 30 | 90

export interface Kpi {
  revenue: number
  revenuePrev: number
  transactions: number
  transactionsPrev: number
  avgBasket: number
  avgBasketPrev: number
  grossMarginRate: number
  grossMarginRatePrev: number
  stockValue: number
  stockouts: number
  lowStock: number
  overstock: number
  avgCoverageDays: number
}

export interface DailySales {
  date: string // ISO yyyy-mm-dd
  revenue: number
  revenuePrev: number
  transactions: number
}

export interface CategorySales {
  category: string
  revenue: number
  margin: number
}

export interface ProductSales {
  productId: string
  name: string
  category: string
  quantity: number
  revenue: number
  marginRate: number
  trend: number // variation vs période précédente
}

export type StockStatus = 'stockout' | 'low' | 'ok' | 'overstock'

export interface StockItem {
  productId: string
  name: string
  category: string
  onHand: number
  avgDailySales: number
  coverageDays: number
  unitCost: number
  stockValue: number
  nearestExpiry: string | null
  status: StockStatus
}

export interface OrderSuggestion {
  productId: string
  name: string
  supplier: string
  onHand: number
  avgDailySales: number
  suggestedQty: number
  packSize: number
  unitCost: number
  total: number
  reason: 'stockout' | 'below_reorder_point'
}

export type AlertSeverity = 'critical' | 'warning' | 'info'
export type AlertType = 'stockout' | 'low_stock' | 'expiry' | 'overstock' | 'sales_drop'

export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  productName: string
  /** valeurs pour interpoler le message i18n alerts.messages.<type> */
  values: Record<string, string | number>
  createdAt: string
}

export type UserRole = 'owner' | 'pharmacist' | 'technician' | 'viewer'

export interface AppUser {
  id: string
  fullName: string
  email: string
  role: UserRole
  status: 'active' | 'invited'
  lastSeen: string | null
}

export interface AbcRow {
  productId: string
  name: string
  revenue: number
  cumulativeShare: number
  abcClass: 'A' | 'B' | 'C'
}
