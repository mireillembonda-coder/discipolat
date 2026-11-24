import { SUPPORTED_LOCALES, type LocaleCode } from './config'

function intlLocale(locale: string): string {
  return SUPPORTED_LOCALES.find((l) => l.code === locale)?.intl ?? 'fr-FR'
}

/** Montant monétaire. XAF / XOF n'ont pas de sous-unité : 0 décimale. */
export function formatCurrency(value: number, currency: string, locale: LocaleCode | string, opts?: { compact?: boolean }) {
  const noDecimals = currency === 'XAF' || currency === 'XOF'
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'currency',
    currency,
    notation: opts?.compact ? 'compact' : 'standard',
    maximumFractionDigits: opts?.compact ? 1 : noDecimals ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number, locale: LocaleCode | string, opts?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 1, ...opts }).format(value)
}

export function formatPercent(value: number, locale: LocaleCode | string, digits = 1) {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'percent',
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value)
}

export function formatDate(value: Date | string, locale: LocaleCode | string, opts?: Intl.DateTimeFormatOptions) {
  const d = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat(intlLocale(locale), opts ?? { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
}

export function formatSignedPercent(value: number, locale: LocaleCode | string) {
  const s = formatPercent(Math.abs(value), locale)
  return `${value >= 0 ? '+' : '−'}${s}`
}
