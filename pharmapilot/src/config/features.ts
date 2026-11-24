import {
  AlertTriangle,
  BarChart3,
  Bot,
  CreditCard,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { FeatureKey } from "@/data/types";

export type IntegrationStatus = "ready" | "partial" | "to-connect";

export interface FeatureDef {
  key: FeatureKey;
  path: string;
  icon: LucideIcon;
  section: "pilot" | "tools" | "account";
  /** État de branchement aux données RÉELLES (le mode démo couvre toutes les vues). */
  live: IntegrationStatus;
  /** Ce qui reste à connecter pour la production. */
  todo: string[];
}

/**
 * Registre central des modules : navigation + état d'intégration.
 * C'est la référence unique pour savoir ce qui reste à connecter.
 */
export const FEATURES: FeatureDef[] = [
  {
    key: "overview",
    path: "overview",
    icon: LayoutDashboard,
    section: "pilot",
    live: "to-connect",
    todo: ["Agrégats de ventes quotidiens (vue SQL ou fonction)", "Synthèse des alertes et de la santé du stock"],
  },
  {
    key: "sales",
    path: "sales",
    icon: BarChart3,
    section: "pilot",
    live: "to-connect",
    todo: ["Tables ventes / lignes de vente alimentées par l'import", "Calcul des marges à partir des prix d'achat", "Comparaison N-1"],
  },
  {
    key: "stock",
    path: "stock",
    icon: Package,
    section: "pilot",
    live: "to-connect",
    todo: ["Table d'état du stock à date", "Calcul de couverture à partir des ventes", "Dates de péremption par lot"],
  },
  {
    key: "orders",
    path: "orders",
    icon: ShoppingCart,
    section: "pilot",
    live: "to-connect",
    todo: ["Moteur de proposition de commandes", "Catalogue grossistes et conditions", "Export ou transmission vers le LGO / grossiste"],
  },
  {
    key: "alerts",
    path: "alerts",
    icon: AlertTriangle,
    section: "pilot",
    live: "to-connect",
    todo: ["Règles d'alertes (rupture, péremption, anomalies, marge)", "Notifications e-mail / push"],
  },
  {
    key: "reports",
    path: "reports",
    icon: FileText,
    section: "tools",
    live: "to-connect",
    todo: ["Génération PDF / Excel", "Archivage des rapports", "Envoi programmé"],
  },
  {
    key: "assistant",
    path: "assistant",
    icon: Bot,
    section: "tools",
    live: "to-connect",
    todo: ["Fonction serveur (Edge Function) appelant le modèle IA", "Accès contrôlé aux données de l'officine", "Historique des conversations"],
  },
  {
    key: "import",
    path: "import",
    icon: Upload,
    section: "tools",
    live: "partial",
    todo: ["Stockage des fichiers (Supabase Storage)", "Mappage des colonnes par logiciel d'officine", "Traitement et validation des imports"],
  },
  {
    key: "users",
    path: "users",
    icon: Users,
    section: "account",
    live: "to-connect",
    todo: ["Lecture des membres (table memberships)", "Invitations par e-mail", "Gestion des rôles"],
  },
  {
    key: "settings",
    path: "settings",
    icon: Settings,
    section: "account",
    live: "partial",
    todo: ["Enregistrement des paramètres de l'officine", "Seuils de pilotage par officine"],
  },
  {
    key: "subscription",
    path: "subscription",
    icon: CreditCard,
    section: "account",
    live: "to-connect",
    todo: ["Grille tarifaire définitive", "Prestataire de paiement (carte, mobile money)", "Facturation"],
  },
];

export const featureByKey = (key: FeatureKey) => FEATURES.find((f) => f.key === key)!;
