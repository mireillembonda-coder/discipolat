/**
 * Implémentation « démonstration » du dépôt de données.
 * ⚠️ Toutes les valeurs renvoyées sont FICTIVES et calculées localement.
 */
import type { PharmacyRepository } from '../repository'
import type {
  AbcRow,
  Alert,
  CategorySales,
  DailySales,
  Kpi,
  OrderSuggestion,
  PeriodDays,
  ProductSales,
  StockItem,
  StockStatus,
} from '../types'
import { DEMO_PHARMACIES, DEMO_PRODUCTS, DEMO_USERS } from './catalog'
import { getDemoDataset } from './generator'
import { EXPIRY_WARNING_DAYS, LOW_STOCK_DAYS, OVERSTOCK_DAYS, TARGET_COVERAGE_DAYS } from '../rules'

function assertDemoId(id: string) {
  if (!DEMO_PHARMACIES.some((p) => p.id === id)) {
    // Garde-fou : la démonstration ne doit jamais recevoir un identifiant réel.
    throw new Error(`Identifiant de pharmacie non démo refusé : ${id}`)
  }
}

function windows(pharmacyId: string, period: PeriodDays) {
  const { days } = getDemoDataset(pharmacyId)
  return { current: days.slice(-period), previous: days.slice(-2 * period, -period) }
}

function totals(days: { qty: number[]; transactions: number }[]) {
  let revenue = 0
  let margin = 0
  let transactions = 0
  for (const d of days) {
    transactions += d.transactions
    d.qty.forEach((q, i) => {
      const prod = DEMO_PRODUCTS[i]
      revenue += q * prod.price
      margin += q * (prod.price - prod.cost)
    })
  }
  return { revenue, margin, transactions }
}

function stockItems(pharmacyId: string): StockItem[] {
  const { days, stock } = getDemoDataset(pharmacyId)
  const last30 = days.slice(-30)
  return stock.map((s, i) => {
    const avg = last30.reduce((acc, d) => acc + d.qty[i], 0) / 30
    const coverage = avg > 0 ? s.onHand / avg : s.onHand > 0 ? 999 : 0
    const status: StockStatus =
      s.onHand === 0 ? 'stockout' : coverage < LOW_STOCK_DAYS ? 'low' : coverage > OVERSTOCK_DAYS ? 'overstock' : 'ok'
    return {
      productId: s.product.id,
      name: s.product.name,
      category: s.product.category,
      onHand: s.onHand,
      avgDailySales: avg,
      coverageDays: coverage,
      unitCost: s.product.cost,
      stockValue: s.onHand * s.product.cost,
      nearestExpiry: s.nearestExpiry,
      status,
    }
  })
}

const resolve = <T,>(v: T) => Promise.resolve(v)

export const demoRepository: PharmacyRepository = {
  mode: 'demo',

  listPharmacies: () => resolve(DEMO_PHARMACIES),

  getKpis(pharmacyId, period) {
    assertDemoId(pharmacyId)
    const { current, previous } = windows(pharmacyId, period)
    const c = totals(current)
    const p = totals(previous)
    const stock = stockItems(pharmacyId)
    const withSales = stock.filter((s) => s.avgDailySales > 0 && s.onHand > 0)
    const kpi: Kpi = {
      revenue: c.revenue,
      revenuePrev: p.revenue,
      transactions: c.transactions,
      transactionsPrev: p.transactions,
      avgBasket: c.revenue / c.transactions,
      avgBasketPrev: p.revenue / p.transactions,
      grossMarginRate: c.margin / c.revenue,
      grossMarginRatePrev: p.margin / p.revenue,
      stockValue: stock.reduce((s, i) => s + i.stockValue, 0),
      stockouts: stock.filter((s) => s.status === 'stockout').length,
      lowStock: stock.filter((s) => s.status === 'low').length,
      overstock: stock.filter((s) => s.status === 'overstock').length,
      avgCoverageDays: withSales.reduce((s, i) => s + Math.min(i.coverageDays, 180), 0) / Math.max(1, withSales.length),
    }
    return resolve(kpi)
  },

  getDailySales(pharmacyId, period) {
    assertDemoId(pharmacyId)
    const { current, previous } = windows(pharmacyId, period)
    const rev = (d: { qty: number[] }) => d.qty.reduce((s, q, i) => s + q * DEMO_PRODUCTS[i].price, 0)
    const out: DailySales[] = current.map((d, i) => ({
      date: d.date,
      revenue: rev(d),
      revenuePrev: previous[i] ? rev(previous[i]) : 0,
      transactions: d.transactions,
    }))
    return resolve(out)
  },

  getCategorySales(pharmacyId, period) {
    assertDemoId(pharmacyId)
    const { current } = windows(pharmacyId, period)
    const map = new Map<string, CategorySales>()
    current.forEach((d) =>
      d.qty.forEach((q, i) => {
        const prod = DEMO_PRODUCTS[i]
        const row = map.get(prod.category) ?? { category: prod.category, revenue: 0, margin: 0 }
        row.revenue += q * prod.price
        row.margin += q * (prod.price - prod.cost)
        map.set(prod.category, row)
      }),
    )
    return resolve([...map.values()].sort((a, b) => b.revenue - a.revenue))
  },

  getTopProducts(pharmacyId, period, limit = 10) {
    assertDemoId(pharmacyId)
    const { current, previous } = windows(pharmacyId, period)
    const rows: ProductSales[] = DEMO_PRODUCTS.map((prod, i) => {
      const qty = current.reduce((s, d) => s + d.qty[i], 0)
      const qtyPrev = previous.reduce((s, d) => s + d.qty[i], 0)
      return {
        productId: prod.id,
        name: prod.name,
        category: prod.category,
        quantity: qty,
        revenue: qty * prod.price,
        marginRate: (prod.price - prod.cost) / prod.price,
        trend: qtyPrev > 0 ? (qty - qtyPrev) / qtyPrev : 0,
      }
    })
    return resolve(rows.sort((a, b) => b.revenue - a.revenue).slice(0, limit))
  },

  getStock(pharmacyId) {
    assertDemoId(pharmacyId)
    return resolve(stockItems(pharmacyId))
  },

  getOrderSuggestions(pharmacyId) {
    assertDemoId(pharmacyId)
    const items = stockItems(pharmacyId)
    const out: OrderSuggestion[] = []
    items.forEach((s) => {
      if (s.status !== 'stockout' && s.status !== 'low') return
      const prod = DEMO_PRODUCTS.find((p) => p.id === s.productId)!
      const need = Math.max(0, s.avgDailySales * TARGET_COVERAGE_DAYS - s.onHand)
      const qty = Math.max(prod.packSize, Math.ceil(need / prod.packSize) * prod.packSize)
      out.push({
        productId: s.productId,
        name: s.name,
        supplier: prod.supplier,
        onHand: s.onHand,
        avgDailySales: s.avgDailySales,
        suggestedQty: qty,
        packSize: prod.packSize,
        unitCost: prod.cost,
        total: qty * prod.cost,
        reason: s.status === 'stockout' ? 'stockout' : 'below_reorder_point',
      })
    })
    return resolve(out.sort((a, b) => a.onHand / (a.avgDailySales || 1) - b.onHand / (b.avgDailySales || 1)))
  },

  async getAlerts(pharmacyId) {
    assertDemoId(pharmacyId)
    const items = stockItems(pharmacyId)
    const top = await demoRepository.getTopProducts(pharmacyId, 30, DEMO_PRODUCTS.length)
    const now = new Date()
    const today = now.toISOString()
    const alerts: Alert[] = []
    items.forEach((s) => {
      if (s.status === 'stockout')
        alerts.push({ id: `a-so-${s.productId}`, type: 'stockout', severity: 'critical', productName: s.name, values: { days: Math.round(s.avgDailySales) }, createdAt: today })
      if (s.status === 'low')
        alerts.push({ id: `a-low-${s.productId}`, type: 'low_stock', severity: 'warning', productName: s.name, values: { days: Math.max(1, Math.round(s.coverageDays)) }, createdAt: today })
      if (s.status === 'overstock')
        alerts.push({ id: `a-over-${s.productId}`, type: 'overstock', severity: 'info', productName: s.name, values: { days: Math.round(s.coverageDays) }, createdAt: today })
      if (s.nearestExpiry && s.onHand > 0) {
        const days = Math.round((new Date(s.nearestExpiry).getTime() - now.getTime()) / 86400000)
        if (days < EXPIRY_WARNING_DAYS)
          alerts.push({ id: `a-exp-${s.productId}`, type: 'expiry', severity: days < 45 ? 'critical' : 'warning', productName: s.name, values: { days }, createdAt: today })
      }
    })
    top.filter((p) => p.trend < -0.15).forEach((p) =>
      alerts.push({ id: `a-drop-${p.productId}`, type: 'sales_drop', severity: 'info', productName: p.name, values: { pct: Math.round(-p.trend * 100) }, createdAt: today }),
    )
    const rank = { critical: 0, warning: 1, info: 2 }
    return alerts.sort((a, b) => rank[a.severity] - rank[b.severity])
  },

  async getAbcAnalysis(pharmacyId, period) {
    assertDemoId(pharmacyId)
    const rows = await demoRepository.getTopProducts(pharmacyId, period, DEMO_PRODUCTS.length)
    const total = rows.reduce((s, r) => s + r.revenue, 0)
    let cum = 0
    return rows.map<AbcRow>((r) => {
      cum += r.revenue
      const share = cum / total
      return { productId: r.productId, name: r.name, revenue: r.revenue, cumulativeShare: share, abcClass: share <= 0.8 ? 'A' : share <= 0.95 ? 'B' : 'C' }
    })
  },

  listUsers(pharmacyId) {
    assertDemoId(pharmacyId)
    return resolve(DEMO_USERS)
  },
}

