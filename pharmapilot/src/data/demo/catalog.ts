/**
 * Catalogue FICTIF du mode démonstration.
 * Dénominations génériques (DCI) uniquement ; prix et volumes inventés.
 */
export interface DemoProduct {
  id: string;
  name: string;
  category: string;
  price: number; // prix de vente XAF
  marginRate: number;
  baseDaily: number; // ventes moyennes / jour
}

export const DEMO_CATEGORIES = [
  "Médicaments sur ordonnance",
  "Médicaments sans ordonnance",
  "Parapharmacie",
  "Hygiène & soins bébé",
  "Matériel médical",
  "Compléments alimentaires",
] as const;

const C = DEMO_CATEGORIES;

export const DEMO_PRODUCTS: DemoProduct[] = [
  { id: "p01", name: "Paracétamol 500 mg — boîte de 16", category: C[1], price: 1200, marginRate: 0.3, baseDaily: 38 },
  { id: "p02", name: "Amoxicilline 500 mg — boîte de 12", category: C[0], price: 2500, marginRate: 0.24, baseDaily: 14 },
  { id: "p03", name: "Artéméther/Luméfantrine 20/120 mg", category: C[0], price: 3800, marginRate: 0.22, baseDaily: 18 },
  { id: "p04", name: "Ibuprofène 400 mg — boîte de 20", category: C[1], price: 1500, marginRate: 0.32, baseDaily: 21 },
  { id: "p05", name: "Métformine 850 mg — boîte de 30", category: C[0], price: 2900, marginRate: 0.2, baseDaily: 9 },
  { id: "p06", name: "Amlodipine 5 mg — boîte de 30", category: C[0], price: 3500, marginRate: 0.21, baseDaily: 8 },
  { id: "p07", name: "Sels de réhydratation orale — sachets", category: C[1], price: 600, marginRate: 0.35, baseDaily: 16 },
  { id: "p08", name: "Vitamine C 500 mg — tube de 20", category: C[5], price: 1800, marginRate: 0.4, baseDaily: 11 },
  { id: "p09", name: "Fer + acide folique — boîte de 30", category: C[5], price: 2200, marginRate: 0.38, baseDaily: 7 },
  { id: "p10", name: "Gel hydroalcoolique 100 ml", category: C[3], price: 1500, marginRate: 0.45, baseDaily: 10 },
  { id: "p11", name: "Couches bébé taille 3 — paquet", category: C[3], price: 6500, marginRate: 0.18, baseDaily: 5 },
  { id: "p12", name: "Lait de toilette bébé 500 ml", category: C[3], price: 3900, marginRate: 0.33, baseDaily: 4 },
  { id: "p13", name: "Crème hydratante visage 50 ml", category: C[2], price: 7500, marginRate: 0.42, baseDaily: 3 },
  { id: "p14", name: "Écran solaire SPF 50 — 50 ml", category: C[2], price: 9800, marginRate: 0.4, baseDaily: 2 },
  { id: "p15", name: "Tensiomètre électronique bras", category: C[4], price: 28000, marginRate: 0.3, baseDaily: 0.4 },
  { id: "p16", name: "Glucomètre + 10 bandelettes", category: C[4], price: 18500, marginRate: 0.28, baseDaily: 0.6 },
  { id: "p17", name: "Bandelettes glycémie — boîte de 50", category: C[4], price: 12000, marginRate: 0.25, baseDaily: 1.5 },
  { id: "p18", name: "Compresses stériles 10×10 — boîte", category: C[4], price: 1700, marginRate: 0.36, baseDaily: 6 },
  { id: "p19", name: "Oméprazole 20 mg — boîte de 14", category: C[0], price: 2600, marginRate: 0.23, baseDaily: 10 },
  { id: "p20", name: "Cétirizine 10 mg — boîte de 15", category: C[1], price: 1900, marginRate: 0.31, baseDaily: 8 },
  { id: "p21", name: "Sirop antitussif 125 ml", category: C[1], price: 2800, marginRate: 0.34, baseDaily: 9 },
  { id: "p22", name: "Ciprofloxacine 500 mg — boîte de 10", category: C[0], price: 3200, marginRate: 0.22, baseDaily: 6 },
  { id: "p23", name: "Multivitamines adulte — boîte de 30", category: C[5], price: 5500, marginRate: 0.42, baseDaily: 4 },
  { id: "p24", name: "Thermomètre digital", category: C[4], price: 3500, marginRate: 0.4, baseDaily: 1.2 },
  { id: "p25", name: "Savon antiseptique 250 ml", category: C[3], price: 2100, marginRate: 0.37, baseDaily: 6 },
  { id: "p26", name: "Moustiquaire imprégnée 2 places", category: C[4], price: 8000, marginRate: 0.26, baseDaily: 1 },
  { id: "p27", name: "Losartan 50 mg — boîte de 28", category: C[0], price: 4100, marginRate: 0.21, baseDaily: 5 },
  { id: "p28", name: "Shampoing doux 250 ml", category: C[2], price: 4200, marginRate: 0.39, baseDaily: 2 },
];

export const DEMO_SUPPLIERS = ["Grossiste A (fictif)", "Grossiste B (fictif)", "Laboratoire C (fictif)"];
