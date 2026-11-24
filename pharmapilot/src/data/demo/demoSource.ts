/**
 * Source de données du MODE DÉMONSTRATION.
 *
 * - Toutes les données sont FICTIVES et générées en mémoire, de façon déterministe.
 * - Rien n'est lu ni écrit dans Supabase : aucune contamination possible des données réelles.
 * - Les identifiants sont préfixés `demo-` et chaque officine porte `isDemo: true`.
 */
import type {
  CategorySales,
  DailySales,
  DataSource,
  HourlyTraffic,
  OrderSuggestion,
  PeriodDays,
  PharmaAlert,
  Pharmacy,
  ProductSales,
  SalesBundle,
  StockItem,
  StockState,
  TeamMember,
} from "../types";
import { DEMO_CATEGORIES, DEMO_PRODUCTS, DEMO_SUPPLIERS } from "./catalog";
import { hashString, mulberry32 } from "./random";

const DEMO_PHARMACIES: (Pharmacy & { scale: number; growth: number })[] = [
  { id: "demo-centre", name: "Pharmacie du Centre (démo)", city: "Douala", currency: "XAF", isDemo: true, scale: 1, growth: 0.09 },
  { id: "demo-palmiers", name: "Pharmacie des Palmiers (démo)", city: "Yaoundé", currency: "XAF", isDemo: true, scale: 0.7, growth: 0.04 },
  { id: "demo-gare", name: "Pharmacie de la Gare (démo)", city: "Libreville", currency: "XAF", isDemo: true, scale: 1.25, growth: -0.03 },
];

const HISTORY_DAYS = 180;
const fr = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
const latency = () => new Promise((r) => setTimeout(r, 180));

function pharmacy(id: string) {
  const p = DEMO_PHARMACIES.find((x) => x.id === id);
  if (!p) throw new Error(`Officine de démonstration inconnue : ${id}`);
  return p;
}

function isoDay(offsetFromToday: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetFromToday);
  return d.toISOString().slice(0, 10);
}

const avgDailyRevenueBase = DEMO_PRODUCTS.reduce((s, p) => s + p.price * p.baseDaily, 0);

/** Historique quotidien sur 180 jours (le plus ancien en premier). */
function history(pharmacyId: string): DailySales[] {
  const ph = pharmacy(pharmacyId);
  const out: DailySales[] = [];
  for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
    const date = isoDay(-i);
    const rnd = mulberry32(hashString(pharmacyId + date));
    const dow = new Date(date).getDay();
    const weekly = dow === 0 ? 0.45 : dow === 6 ? 1.12 : 1;
    const trend = 1 + ph.growth * ((HISTORY_DAYS - i) / HISTORY_DAYS);
    const noise = 0.85 + rnd() * 0.3;
    const revenue = Math.round(avgDailyRevenueBase * ph.scale * weekly * trend * noise);
    const basket = 4200 + rnd() * 900;
    out.push({
      date,
      revenue,
      revenueLastYear: Math.round((revenue / (1 + ph.growth)) * (0.9 + rnd() * 0.2)),
      transactions: Math.round(revenue / basket),
      margin: Math.round(revenue * (0.27 + rnd() * 0.03)),
    });
  }
  return out;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const delta = (cur: number, prev: number) => (prev === 0 ? 0 : (cur - prev) / prev);

function productSales(pharmacyId: string, period: PeriodDays, revenueRatio: number): ProductSales[] {
  const ph = pharmacy(pharmacyId);
  const rnd = mulberry32(hashString(`${pharmacyId}-products-${period}`));
  return DEMO_PRODUCTS.map((p) => {
    const qty = Math.max(0, Math.round(p.baseDaily * period * ph.scale * revenueRatio * (0.8 + rnd() * 0.4)));
    const revenue = qty * p.price;
    return { id: `demo-${p.id}`, name: p.name, category: p.category, qty, revenue, margin: Math.round(revenue * p.marginRate) };
  }).sort((a, b) => b.revenue - a.revenue);
}

function hourly(pharmacyId: string, period: PeriodDays, transactions: number): HourlyTraffic[] {
  const shape = [0.03, 0.06, 0.08, 0.09, 0.1, 0.08, 0.05, 0.05, 0.07, 0.09, 0.1, 0.09, 0.07, 0.04];
  const rnd = mulberry32(hashString(`${pharmacyId}-hours`));
  return shape.map((w, i) => ({
    hour: `${String(8 + i).padStart(2, "0")}h`,
    transactions: Math.round(((transactions / period) * w * (0.9 + rnd() * 0.2)) * 10) / 10,
  }));
}

function stock(pharmacyId: string): StockItem[] {
  const ph = pharmacy(pharmacyId);
  const rnd = mulberry32(hashString(`${pharmacyId}-stock-${isoDay(0)}`));
  return DEMO_PRODUCTS.map((p, i) => {
    const dailySales = Math.round(p.baseDaily * ph.scale * 10) / 10;
    const r = rnd();
    let coverageTarget: number;
    if (r < 0.08) coverageTarget = 0;
    else if (r < 0.25) coverageTarget = 1 + rnd() * 5;
    else if (r < 0.85) coverageTarget = 10 + rnd() * 35;
    else coverageTarget = 70 + rnd() * 80;
    const onHand = Math.max(0, Math.round(dailySales * coverageTarget));
    const coverageDays = dailySales > 0 ? Math.round((onHand / dailySales) * 10) / 10 : 999;
    const unitCost = Math.round(p.price * (1 - p.marginRate));
    const state: StockState = onHand === 0 ? "rupture" : coverageDays < 7 ? "critical" : coverageDays > 60 ? "overstock" : "ok";
    const expiryOffset = Math.round(20 + rnd() * 520);
    return {
      id: `demo-${p.id}`,
      name: p.name,
      category: p.category,
      onHand,
      dailySales,
      coverageDays,
      unitCost,
      value: onHand * unitCost,
      expiry: onHand === 0 ? null : isoDay(expiryOffset),
      state,
      supplier: DEMO_SUPPLIERS[i % DEMO_SUPPLIERS.length],
    };
  });
}

export const demoSource: DataSource = {
  mode: "demo",

  async listPharmacies() {
    await latency();
    return DEMO_PHARMACIES.map(({ scale: _s, growth: _g, ...p }) => p);
  },

  async getSales(pharmacyId, period): Promise<SalesBundle> {
    await latency();
    const h = history(pharmacyId);
    const cur = h.slice(-period);
    const prev = h.slice(-period * 2, -period);
    const rev = sum(cur.map((d) => d.revenue));
    const revPrev = sum(prev.map((d) => d.revenue));
    const tx = sum(cur.map((d) => d.transactions));
    const txPrev = sum(prev.map((d) => d.transactions));
    const mar = sum(cur.map((d) => d.margin));
    const marPrev = sum(prev.map((d) => d.margin));
    const products = productSales(pharmacyId, period, rev / (avgDailyRevenueBase * pharmacy(pharmacyId).scale * period));
    const categories: CategorySales[] = DEMO_CATEGORIES.map((c) => {
      const ps = products.filter((p) => p.category === c);
      return { category: c, revenue: sum(ps.map((p) => p.revenue)), margin: sum(ps.map((p) => p.margin)) };
    }).sort((a, b) => b.revenue - a.revenue);
    return {
      kpis: {
        revenue: { value: rev, delta: delta(rev, revPrev) },
        transactions: { value: tx, delta: delta(tx, txPrev) },
        basket: { value: rev / tx, delta: delta(rev / tx, revPrev / txPrev) },
        marginRate: { value: mar / rev, delta: mar / rev - marPrev / revPrev },
      },
      daily: cur,
      categories,
      products,
      hourly: hourly(pharmacyId, period, tx),
    };
  },

  async getStock(pharmacyId) {
    await latency();
    return stock(pharmacyId);
  },

  async getOrderSuggestions(pharmacyId, target): Promise<OrderSuggestion[]> {
    await latency();
    return stock(pharmacyId)
      .filter((s) => s.coverageDays < target && s.dailySales > 0)
      .map((s) => {
        const raw = Math.ceil(target * s.dailySales - s.onHand);
        const suggestedQty = Math.max(5, Math.ceil(raw / 5) * 5);
        const reason = s.onHand === 0 ? "rupture" : s.id.endsWith("p03") || s.id.endsWith("p26") ? "seasonal" : "lowCoverage";
        return {
          id: `demo-order-${s.id}`,
          productId: s.id,
          name: s.name,
          supplier: s.supplier,
          onHand: s.onHand,
          coverageDays: s.coverageDays,
          suggestedQty,
          unitCost: s.unitCost,
          reason,
        } satisfies OrderSuggestion;
      })
      .sort((a, b) => a.coverageDays - b.coverageDays);
  },

  async getAlerts(pharmacyId): Promise<PharmaAlert[]> {
    await latency();
    const items = stock(pharmacyId);
    const today = isoDay(0);
    const alerts: PharmaAlert[] = [];
    for (const s of items) {
      if (s.state === "rupture")
        alerts.push({ id: `demo-a-r-${s.id}`, type: "rupture", severity: "critical", title: s.name, detail: `Rupture de stock — ${fr(s.dailySales)} ventes / jour en moyenne.`, date: today });
      else if (s.state === "critical")
        alerts.push({ id: `demo-a-c-${s.id}`, type: "rupture", severity: "serious", title: s.name, detail: `Couverture de ${fr(s.coverageDays)} jours seulement.`, date: today });
      if (s.expiry) {
        const days = Math.round((new Date(s.expiry).getTime() - Date.now()) / 86400000);
        if (days <= 90)
          alerts.push({ id: `demo-a-e-${s.id}`, type: "expiry", severity: days <= 45 ? "serious" : "warning", title: s.name, detail: `${s.onHand} unités périment dans ${days} jours.`, date: today });
      }
      if (s.state === "overstock")
        alerts.push({ id: `demo-a-o-${s.id}`, type: "overstock", severity: "info", title: s.name, detail: `${Math.round(s.coverageDays)} jours de stock immobilisés.`, date: today });
    }
    alerts.push(
      { id: "demo-a-anom", type: "anomaly", severity: "warning", title: "Artéméther/Luméfantrine 20/120 mg", detail: "Ventes +48 % vs moyenne des 4 dernières semaines.", date: isoDay(-1) },
      { id: "demo-a-marg", type: "margin", severity: "warning", title: "Parapharmacie", detail: "Taux de marge en baisse de 2,1 points sur 30 jours.", date: isoDay(-2) },
    );
    const order = { critical: 0, serious: 1, warning: 2, info: 3 };
    return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
  },

  async getTeam(): Promise<TeamMember[]> {
    await latency();
    return [
      { id: "demo-u1", name: "Dr Titulaire Démo", email: "titulaire@exemple.invalid", role: "owner", lastSeen: isoDay(0) },
      { id: "demo-u2", name: "Pharmacien Adjoint Démo", email: "adjoint@exemple.invalid", role: "pharmacist", lastSeen: isoDay(-1) },
      { id: "demo-u3", name: "Préparateur Démo", email: "preparateur@exemple.invalid", role: "staff", lastSeen: isoDay(-3) },
      { id: "demo-u4", name: "Comptable Démo", email: "comptable@exemple.invalid", role: "viewer", lastSeen: null },
    ];
  },
};
