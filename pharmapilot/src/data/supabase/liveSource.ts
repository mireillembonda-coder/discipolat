/**
 * Source de données RÉELLE (Supabase).
 *
 * Branché dans cette version : liste des officines accessibles à l'utilisateur
 * (table `pharmacies`, filtrée par les politiques RLS — voir supabase/migrations).
 *
 * Non branché : ventes, stock, commandes, alertes, équipe. Ces méthodes lèvent
 * volontairement `NotConnectedError` : l'interface affiche alors un état « À connecter »
 * plutôt que des données inventées.
 */
import { supabase } from "@/lib/supabase";
import { NotConnectedError, type DataSource, type Pharmacy } from "../types";

export const liveSource: DataSource = {
  mode: "live",

  async listPharmacies(): Promise<Pharmacy[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from("pharmacies").select("id, name, city, currency").order("name");
    if (error) throw error;
    return (data ?? []).map((p) => ({
      id: p.id as string,
      name: p.name as string,
      city: (p.city as string | null) ?? "",
      currency: (p.currency as string | null) ?? "XAF",
      isDemo: false,
    }));
  },

  async getSales() {
    throw new NotConnectedError("sales");
  },
  async getStock() {
    throw new NotConnectedError("stock");
  },
  async getOrderSuggestions() {
    throw new NotConnectedError("orders");
  },
  async getAlerts() {
    throw new NotConnectedError("alerts");
  },
  async getTeam() {
    throw new NotConnectedError("users");
  },
};
