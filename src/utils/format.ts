export function getYear(date: string | null | undefined): string | null {
  return date ? date.slice(0, 4) : null
}

export function formatRating(vote: number | null | undefined): string {
  return vote ? vote.toFixed(1) : '—'
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export type RatingTone = 'none' | 'awesome' | 'great' | 'good' | 'ok' | 'bad'

/** Maps a 0–10 score to a tone used by badges and the episode heatmap. */
export function ratingTone(vote: number | null | undefined): RatingTone {
  if (!vote) return 'none'
  if (vote >= 9) return 'awesome'
  if (vote >= 8) return 'great'
  if (vote >= 7) return 'good'
  if (vote >= 5.5) return 'ok'
  return 'bad'
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

/** S01E05 */
export function episodeCode(season: number, episode: number): string {
  return `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
}
