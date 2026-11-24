import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Vrai si les variables d'environnement Supabase sont renseignées. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Client Supabase unique. `null` tant que le projet n'est pas configuré :
 * dans ce cas seuls le mode démonstration et les écrans d'information sont disponibles.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;
