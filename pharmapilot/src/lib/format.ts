import i18n from "@/i18n";

export const DEFAULT_CURRENCY = "XAF";

function locale() {
  return i18n.language === "en" ? "en-GB" : "fr-FR";
}

export function formatCurrency(value: number, currency = DEFAULT_CURRENCY, opts: { compact?: boolean } = {}) {
  return new Intl.NumberFormat(locale(), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    notation: opts.compact ? "compact" : "standard",
  }).format(value);
}

export function formatNumber(value: number, opts: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(locale(), opts).format(value);
}

export function formatPercent(value: number, digits = 1) {
  return new Intl.NumberFormat(locale(), {
    style: "percent",
    maximumFractionDigits: digits,
    signDisplay: "exceptZero",
  }).format(value);
}

export function formatDate(value: string | Date, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" }) {
  return new Intl.DateTimeFormat(locale(), opts).format(typeof value === "string" ? new Date(value) : value);
}
