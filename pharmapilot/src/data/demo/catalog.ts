/**
 * ⚠️ DONNÉES FICTIVES — MODE DÉMONSTRATION UNIQUEMENT.
 * Ces produits, pharmacies, fournisseurs et utilisateurs sont inventés.
 * Ils ne doivent jamais être écrits dans Supabase ni mélangés aux données réelles.
 */
import type { AppUser, Pharmacy } from '../types'

export const DEMO_ID_PREFIX = 'demo-'

export const DEMO_PHARMACIES: Pharmacy[] = [
  { id: 'demo-centre', name: 'Pharmacie Démo Centre', city: 'Douala', country: 'CM', currency: 'XAF', isDemo: true },
  { id: 'demo-plateau', name: 'Pharmacie Démo Plateau', city: 'Yaoundé', country: 'CM', currency: 'XAF', isDemo: true },
  { id: 'demo-riviere', name: 'Pharmacie Démo Rivière', city: 'Libreville', country: 'GA', currency: 'XAF', isDemo: true },
]

/** Facteur d'activité par pharmacie (pour différencier les jeux de données). */
export const DEMO_SCALE: Record<string, number> = { 'demo-centre': 1, 'demo-plateau': 0.72, 'demo-riviere': 0.55 }

export const DEMO_SUPPLIERS = ['Répartiteur Démo A', 'Répartiteur Démo B', 'Laboratoire Démo C'] as const

export interface DemoProduct {
  id: string
  name: string
  category: string
  price: number // prix de vente XAF
  cost: number // prix d'achat XAF
  avgDaily: number // ventes moyennes / jour (pharmacie de référence)
  packSize: number
  supplier: (typeof DEMO_SUPPLIERS)[number]
}

const p = (
  id: string,
  name: string,
  category: string,
  price: number,
  marginRate: number,
  avgDaily: number,
  packSize: number,
  supplier: DemoProduct['supplier'],
): DemoProduct => ({ id: `demo-p-${id}`, name, category, price, cost: Math.round(price * (1 - marginRate)), avgDaily, packSize, supplier })

// Catégories : clés i18n dans categories.*
export const DEMO_PRODUCTS: DemoProduct[] = [
  p('001', 'Paracétamol 500 mg cp B/16', 'analgesics', 600, 0.32, 38, 50, 'Répartiteur Démo A'),
  p('002', 'Ibuprofène 400 mg cp B/20', 'analgesics', 1200, 0.3, 14, 20, 'Répartiteur Démo A'),
  p('003', 'Diclofénac gel 1 % 50 g', 'analgesics', 2500, 0.28, 5, 10, 'Répartiteur Démo B'),
  p('004', 'Amoxicilline 500 mg gél B/12', 'antibiotics', 1500, 0.3, 17, 20, 'Répartiteur Démo A'),
  p('005', 'Ciprofloxacine 500 mg cp B/10', 'antibiotics', 2800, 0.29, 6, 10, 'Répartiteur Démo B'),
  p('006', 'Cotrimoxazole 480 mg cp B/20', 'antibiotics', 900, 0.33, 9, 20, 'Répartiteur Démo A'),
  p('007', 'Métronidazole 250 mg cp B/20', 'antibiotics', 800, 0.34, 10, 20, 'Répartiteur Démo A'),
  p('008', 'Artéméther-Luméfantrine 80/480 B/6', 'antimalarials', 3500, 0.27, 21, 10, 'Répartiteur Démo B'),
  p('009', 'Quinine 300 mg cp B/10', 'antimalarials', 2200, 0.28, 5, 10, 'Répartiteur Démo B'),
  p('010', 'Test diagnostic rapide paludisme', 'medical_devices', 1500, 0.35, 11, 25, 'Laboratoire Démo C'),
  p('011', 'Oméprazole 20 mg gél B/14', 'gastro', 1800, 0.31, 8, 14, 'Répartiteur Démo A'),
  p('012', 'Sels de réhydratation orale B/10', 'gastro', 1000, 0.36, 9, 20, 'Répartiteur Démo A'),
  p('013', 'Zinc 20 mg cp B/10', 'gastro', 1200, 0.35, 6, 20, 'Répartiteur Démo A'),
  p('014', 'Albendazole 400 mg cp B/1', 'gastro', 500, 0.38, 12, 50, 'Répartiteur Démo B'),
  p('015', 'Amlodipine 5 mg cp B/30', 'cardiology', 4200, 0.26, 4, 10, 'Répartiteur Démo B'),
  p('016', 'Losartan 50 mg cp B/28', 'cardiology', 5600, 0.25, 3, 10, 'Répartiteur Démo B'),
  p('017', 'Metformine 850 mg cp B/30', 'diabetes', 2900, 0.27, 5, 10, 'Répartiteur Démo A'),
  p('018', 'Vitamine C 500 mg cp B/20', 'vitamins', 1500, 0.42, 11, 20, 'Laboratoire Démo C'),
  p('019', 'Fer + acide folique cp B/30', 'vitamins', 1800, 0.4, 7, 20, 'Laboratoire Démo C'),
  p('020', 'Multivitamines enfant sirop 150 ml', 'vitamins', 3200, 0.4, 4, 12, 'Laboratoire Démo C'),
  p('021', 'Sirop antitussif enfant 125 ml', 'respiratory', 2400, 0.33, 7, 12, 'Répartiteur Démo A'),
  p('022', 'Crème hydratante corps 200 ml', 'dermocosmetics', 6500, 0.45, 3, 6, 'Laboratoire Démo C'),
  p('023', 'Gants d’examen nitrile B/100', 'medical_devices', 7500, 0.3, 2, 10, 'Laboratoire Démo C'),
  p('024', 'Seringues 5 ml B/100', 'medical_devices', 6000, 0.32, 2, 10, 'Laboratoire Démo C'),
]

export const DEMO_USERS: AppUser[] = [
  { id: 'demo-u-1', fullName: 'Dr Awa Démo', email: 'titulaire@demo.pharmapilot.invalid', role: 'owner', status: 'active', lastSeen: null },
  { id: 'demo-u-2', fullName: 'Dr Paul Exemple', email: 'adjoint@demo.pharmapilot.invalid', role: 'pharmacist', status: 'active', lastSeen: null },
  { id: 'demo-u-3', fullName: 'Marie Fictive', email: 'preparatrice@demo.pharmapilot.invalid', role: 'technician', status: 'active', lastSeen: null },
  { id: 'demo-u-4', fullName: 'Jean Test', email: 'comptable@demo.pharmapilot.invalid', role: 'viewer', status: 'invited', lastSeen: null },
]
