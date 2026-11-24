/**
 * ⚠️ GÉNÉRATEUR DE DONNÉES FICTIVES — MODE DÉMONSTRATION UNIQUEMENT.
 * Les séries sont déterministes (graine = identifiant de la pharmacie démo) et calculées en mémoire.
 * Rien n'est lu ni écrit dans Supabase.
 */
import type { StockStatus } from '../types'
import { DEMO_PRODUCTS, DEMO_SCALE, type DemoProduct } from './catalog'

export const HISTORY_DAYS = 180

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface DemoDay {
  date: string
  qty: number[] // index = DEMO_PRODUCTS
  transactions: number
}

export interface DemoStock {
  product: DemoProduct
  onHand: number
  nearestExpiry: string
  forcedStatus: StockStatus
}

export interface DemoDataset {
  days: DemoDay[] // du plus ancien au plus récent
  stock: DemoStock[]
}

const cache = new Map<string, DemoDataset>()

function isoDay(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getDemoDataset(pharmacyId: string): DemoDataset {
  const hit = cache.get(pharmacyId)
  if (hit) return hit

  const rnd = mulberry32(hash(pharmacyId))
  const scale = DEMO_SCALE[pharmacyId] ?? 0.8
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days: DemoDay[] = []
  for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dow = d.getDay()
    const weekday = dow === 0 ? 0.55 : dow === 6 ? 1.12 : 1
    const growth = 1 + 0.0009 * (HISTORY_DAYS - i - HISTORY_DAYS / 2)
    const dayIndex = HISTORY_DAYS - i
    let units = 0
    const qty = DEMO_PRODUCTS.map((prod) => {
      const season = prod.category === 'antimalarials' ? 1 + 0.35 * Math.sin((dayIndex / 60) * Math.PI) : 1
      const lambda = prod.avgDaily * scale * weekday * growth * season
      const q = Math.max(0, Math.round(lambda * (0.7 + rnd() * 0.6)))
      units += q
      return q
    })
    days.push({ date: isoDay(d), qty, transactions: Math.max(1, Math.round(units / (2.6 + rnd() * 0.5))) })
  }

  // Répartition forcée des statuts de stock pour une démonstration lisible.
  const order = DEMO_PRODUCTS.map((_, i) => i).sort(() => rnd() - 0.5)
  const statusOf = new Map<number, StockStatus>()
  order.slice(0, 2).forEach((i) => statusOf.set(i, 'stockout'))
  order.slice(2, 6).forEach((i) => statusOf.set(i, 'low'))
  order.slice(6, 9).forEach((i) => statusOf.set(i, 'overstock'))
  const nearExpiry = new Set(order.slice(9, 12))

  const last30 = days.slice(-30)
  const stock: DemoStock[] = DEMO_PRODUCTS.map((product, i) => {
    const avg = last30.reduce((s, d) => s + d.qty[i], 0) / 30
    const forcedStatus = statusOf.get(i) ?? 'ok'
    const coverage =
      forcedStatus === 'stockout' ? 0
      : forcedStatus === 'low' ? 2 + rnd() * 4
      : forcedStatus === 'overstock' ? 75 + rnd() * 65
      : 12 + rnd() * 30
    const exp = new Date(today)
    exp.setDate(exp.getDate() + (nearExpiry.has(i) ? 25 + Math.round(rnd() * 60) : 120 + Math.round(rnd() * 600)))
    return { product, onHand: Math.round(avg * coverage), nearestExpiry: isoDay(exp), forcedStatus }
  })

  const ds = { days, stock }
  cache.set(pharmacyId, ds)
  return ds
}
