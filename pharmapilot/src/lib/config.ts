/**
 * Configuration publique de l'application.
 * Les valeurs Supabase viennent des variables d'environnement Vite (.env.local).
 * Aucune clé secrète ne doit être placée ici : seule la clé publique (anon) est utilisée côté navigateur.
 */
export const APP_NAME = 'PharmaPilot AI'
export const APP_TAGLINE_KEY = 'brand.tagline'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export const DEFAULT_CURRENCY = 'XAF'
export const DEFAULT_LOCALE = 'fr'

export const SUPPORTED_LOCALES = [
  { code: 'fr', label: 'Français', intl: 'fr-FR' },
  { code: 'en', label: 'English', intl: 'en-GB' },
] as const
export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]['code']

export const SUPPORTED_CURRENCIES = ['XAF', 'XOF', 'EUR', 'USD'] as const
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]
