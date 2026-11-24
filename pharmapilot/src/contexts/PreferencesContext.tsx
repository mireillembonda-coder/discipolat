import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import i18n from '@/i18n'
import { DEFAULT_CURRENCY, DEFAULT_LOCALE, type LocaleCode } from '@/lib/config'
import { formatCurrency, formatDate, formatNumber, formatPercent, formatSignedPercent } from '@/lib/format'

const STORAGE_KEY = 'pharmapilot.prefs'

interface Prefs {
  locale: LocaleCode
  currency: string
}

function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { locale: DEFAULT_LOCALE, currency: DEFAULT_CURRENCY, ...JSON.parse(raw) }
  } catch {
    /* stockage indisponible : valeurs par défaut */
  }
  return { locale: DEFAULT_LOCALE, currency: DEFAULT_CURRENCY }
}

interface PreferencesValue extends Prefs {
  setLocale: (l: LocaleCode) => void
  setCurrency: (c: string) => void
  fmt: {
    money: (v: number, opts?: { compact?: boolean }) => string
    number: (v: number, opts?: Intl.NumberFormatOptions) => string
    percent: (v: number, digits?: number) => string
    signedPercent: (v: number) => string
    date: (v: Date | string, opts?: Intl.DateTimeFormatOptions) => string
  }
}

const PreferencesContext = createContext<PreferencesValue | null>(null)

/** Préférences d'affichage propres à l'appareil (langue, devise). */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(() => {
    const p = readPrefs()
    if (i18n.language !== p.locale) void i18n.changeLanguage(p.locale)
    return p
  })

  const persist = useCallback((next: Prefs) => {
    setPrefs(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignoré */
    }
  }, [])

  const value = useMemo<PreferencesValue>(() => {
    const { locale, currency } = prefs
    return {
      ...prefs,
      setLocale: (l) => {
        void i18n.changeLanguage(l)
        document.documentElement.lang = l
        persist({ ...prefs, locale: l })
      },
      setCurrency: (c) => persist({ ...prefs, currency: c }),
      fmt: {
        money: (v, opts) => formatCurrency(v, currency, locale, opts),
        number: (v, opts) => formatNumber(v, locale, opts),
        percent: (v, d) => formatPercent(v, locale, d),
        signedPercent: (v) => formatSignedPercent(v, locale),
        date: (v, opts) => formatDate(v, locale, opts),
      },
    }
  }, [prefs, persist])

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences doit être utilisé dans PreferencesProvider')
  return ctx
}
