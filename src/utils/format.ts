export function getYear(date: string | null | undefined): string | null {
  return date ? date.slice(0, 4) : null
}

export function formatRating(vote: number | null | undefined): string {
  return vote ? vote.toFixed(1) : '—'
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
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

export function pluralize(count: number, word: string): string {
  return `${count} ${count === 1 ? word : `${word}s`}`
}

export function formatDate(date: string | null | undefined): string | null {
  if (!date) return null
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(date))
}

/** S2E5 — the short episode code used across the design. */
export function episodeCode(season: number, episode: number): string {
  return `S${season}E${episode}`
}

/** 136 → "2h 16m", 45 → "45m"; null for unknown (TMDB sends 0 or null). */
export function formatRuntime(minutes: number | null | undefined): string | null {
  if (!minutes) return null
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}m`
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** 63000000 → "$63M"; null when TMDB doesn't know (it sends 0). */
export function formatMoney(amount: number): string | null {
  return amount > 0 ? usdCompact.format(amount) : null
}
