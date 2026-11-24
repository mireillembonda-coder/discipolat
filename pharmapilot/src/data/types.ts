/** Modèle de données côté interface. Indépendant de la source (démo ou réelle). */

export type DataMode = "demo" | "live";

export type FeatureKey =
  | "overview"
  | "sales"
  | "stock"
  | "orders"
  | "alerts"
  | "reports"
  | "assistant"
  | "import"
  | "users"
  | "settings"
  | "subscription";

export type PeriodDays = 7 | 30 | 90;

export interface Pharmacy {
  id: string;
  name: string;
  city: string;
  currency: string;
  /** Vrai uniquement pour les officines fictives du mode démonstration. */
  isDemo: boolean;
}

export interface Kpi {
  value: number;
  /** Variation relative vs période précédente (0.05 = +5 %). */
  delta: number;
}

export interface OverviewKpis {
  revenue: Kpi;
  transactions: Kpi;
  basket: Kpi;
  marginRate: Kpi;
}

export interface DailySales {
  date: string; // ISO yyyy-mm-dd
  revenue: number;
  revenueLastYear: number;
  transactions: number;
  margin: number;
}

export interface CategorySales {
  category: string;
  revenue: number;
  margin: number;
}

export interface ProductSales {
  id: string;
  name: string;
  category: string;
  qty: number;
  revenue: number;
  margin: number;
}

export interface HourlyTraffic {
  hour: string;
  transactions: number;
}

export type StockState = "rupture" | "critical" | "ok" | "overstock";

export interface StockItem {
  id: string;
  name: string;
  category: string;
  onHand: number;
  dailySales: number;
  coverageDays: number;
  unitCost: number;
  value: number;
  expiry: string | null;
  state: StockState;
  supplier: string;
}

export type OrderReason = "rupture" | "lowCoverage" | "seasonal";

export interface OrderSuggestion {
  id: string;
  productId: string;
  name: string;
  supplier: string;
  onHand: number;
  coverageDays: number;
  suggestedQty: number;
  unitCost: number;
  reason: OrderReason;
}

export type AlertSeverity = "critical" | "serious" | "warning" | "info";
export type AlertType = "rupture" | "expiry" | "anomaly" | "margin" | "overstock";

export interface PharmaAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  detail: string;
  date: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "pharmacist" | "staff" | "viewer";
  lastSeen: string | null;
}

export interface SalesBundle {
  kpis: OverviewKpis;
  daily: DailySales[];
  categories: CategorySales[];
  products: ProductSales[];
  hourly: HourlyTraffic[];
}

/**
 * Contrat unique d'accès aux données. Deux implémentations strictement séparées :
 *  - `demo`  : données fictives générées en mémoire, jamais écrites en base ;
 *  - `live`  : Supabase. Les méthodes non branchées lèvent `NotConnectedError`.
 */
export interface DataSource {
  mode: DataMode;
  listPharmacies(): Promise<Pharmacy[]>;
  getSales(pharmacyId: string, period: PeriodDays): Promise<SalesBundle>;
  getStock(pharmacyId: string): Promise<StockItem[]>;
  getOrderSuggestions(pharmacyId: string, targetCoverageDays: number): Promise<OrderSuggestion[]>;
  getAlerts(pharmacyId: string): Promise<PharmaAlert[]>;
  getTeam(pharmacyId: string): Promise<TeamMember[]>;
}

export class NotConnectedError extends Error {
  constructor(public feature: FeatureKey) {
    super(`Feature "${feature}" is not connected to a live data source yet.`);
    this.name = "NotConnectedError";
  }
}
