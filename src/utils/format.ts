import { currentLocale } from '../i18n'
import { formatDateWith, formatNumberWith, formatUnitWith } from '../i18n/intl'

// Every formatter takes the locale as its last parameter (tests pass one); by default it is
// the interface language, so components get "12 345" in Russian and "12,345" in English.

export function getYear(date: string | null | undefined): string | null {
  return date ? date.slice(0, 4) : null
}

export function formatRating(vote: number | null | undefined, locale = currentLocale()): string {
  return vote
    ? formatNumberWith(vote, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : '—'
}

export function formatNumber(value: number, locale = currentLocale()): string {
  return formatNumberWith(value, locale)
}

/** Parses a positive integer from a URL param, falling back when invalid. */
export function parsePage(value: string | null, max: number): number {
  const page = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(page) || page < 1) return 1
  return Math.min(page, max)
}

/** "2008–2013", "2019–" for running shows, or a single year. */
export function formatYearRange(
  firstAirDate: string | null,
  lastAirDate: string | null,
  inProduction: boolean,
): string | null {
  const first = getYear(firstAirDate)
  if (!first) return null
  if (inProduction) return `${first}–`
  const last = getYear(lastAirDate)
  return last && last !== first ? `${first}–${last}` : first
}

export function formatDate(
  date: string | null | undefined,
  locale = currentLocale(),
): string | null {
  if (!date) return null
  return formatDateWith(new Date(date), { dateStyle: 'medium' }, locale)
}

/** S2E5 — the short episode code used across the design. */
export function episodeCode(season: number, episode: number): string {
  return `S${season}E${episode}`
}

const unit = (locale: string, name: 'hour' | 'minute', value: number) =>
  formatUnitWith(value, name, locale)

/** 136 → "2h 16m" / "2 ч 16 мин" / "2 сағ 16 мин"; null for unknown (TMDB sends 0 or null). */
export function formatRuntime(
  minutes: number | null | undefined,
  locale = currentLocale(),
): string | null {
  if (!minutes) return null
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return unit(locale, 'minute', rest)
  return rest === 0
    ? unit(locale, 'hour', hours)
    : `${unit(locale, 'hour', hours)} ${unit(locale, 'minute', rest)}`
}

/** 63000000 → "$63M" / "63 млн $"; null when TMDB doesn't know (it sends 0). */
export function formatMoney(amount: number, locale = currentLocale()): string | null {
  if (amount <= 0) return null
  return formatNumberWith(amount, locale, {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  })
}
