export const WATCH_STATUSES = [
  { value: 'plan', label: 'Plan to watch' },
  { value: 'watching', label: 'Watching' },
  { value: 'completed', label: 'Completed' },
  { value: 'dropped', label: 'Dropped' },
]

export const statusLabel = (value) => WATCH_STATUSES.find((s) => s.value === value)?.label ?? value

export const SCORE_OPTIONS = [
  { value: '', label: 'No score' },
  ...Array.from({ length: 10 }, (_, i) => ({ value: String(10 - i), label: `${10 - i} / 10` })),
]

export const NOTES_MAX = 500

export const WATCHLIST_SORTS = [
  { value: 'added', label: 'Recently added' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'score', label: 'Your score' },
  { value: 'rating', label: 'TMDB rating' },
]

const compareNullableDesc = (a, b) => (b ?? -1) - (a ?? -1)

const SORTERS = {
  added: (a, b) => b.addedAt.localeCompare(a.addedAt),
  title: (a, b) => a.name.localeCompare(b.name),
  score: (a, b) => compareNullableDesc(a.score, b.score) || a.name.localeCompare(b.name),
  rating: (a, b) => compareNullableDesc(a.tmdbRating, b.tmdbRating),
}

/** Pure: search + status filter + sort. Returns a new array, never mutates `entries`. */
export function filterWatchlist(entries, { search, status, sort }) {
  const term = search.trim().toLowerCase()
  return entries
    .filter((e) => status === 'all' || e.status === status)
    .filter((e) => !term || e.name.toLowerCase().includes(term))
    .toSorted(SORTERS[sort])
}

/** Shape stored for a series picked from TMDB (search result or details). */
export function toWatchlistSeries(series) {
  return {
    seriesId: series.id,
    name: series.name,
    posterPath: series.poster_path,
    firstAirDate: series.first_air_date,
    tmdbRating: series.vote_average || null,
  }
}
