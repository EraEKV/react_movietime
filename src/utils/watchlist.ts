import type { Option } from '../types/common'
import type { SeriesListItem, SeriesSummary } from '../types/tmdb'
import type { WatchlistEntry, WatchlistSeries, WatchStatus } from '../types/watchlist'

export const WATCH_STATUSES: Option<WatchStatus>[] = [
  { value: 'plan', label: 'Plan to watch' },
  { value: 'watching', label: 'Watching' },
  { value: 'completed', label: 'Completed' },
  { value: 'dropped', label: 'Dropped' },
]

export const isWatchStatus = (value: string): value is WatchStatus =>
  WATCH_STATUSES.some((s) => s.value === value)

export const statusLabel = (value: WatchStatus): string =>
  WATCH_STATUSES.find((s) => s.value === value)?.label ?? value

export const SCORE_OPTIONS: Option[] = [
  { value: '', label: 'No score' },
  ...Array.from({ length: 10 }, (_, i) => ({ value: String(10 - i), label: `${10 - i} / 10` })),
]

export const NOTES_MAX = 500

export type WatchlistSort = 'added' | 'title' | 'score' | 'rating'

export const WATCHLIST_SORTS: Option<WatchlistSort>[] = [
  { value: 'added', label: 'Recently added' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'score', label: 'Your score' },
  { value: 'rating', label: 'TMDB rating' },
]

export const isWatchlistSort = (value: string): value is WatchlistSort =>
  WATCHLIST_SORTS.some((s) => s.value === value)

const compareNullableDesc = (a: number | null, b: number | null) => (b ?? -1) - (a ?? -1)

type Comparator = (a: WatchlistEntry, b: WatchlistEntry) => number

const SORTERS: Record<WatchlistSort, Comparator> = {
  added: (a, b) => b.addedAt.localeCompare(a.addedAt),
  title: (a, b) => a.name.localeCompare(b.name),
  score: (a, b) => compareNullableDesc(a.score, b.score) || a.name.localeCompare(b.name),
  rating: (a, b) => compareNullableDesc(a.tmdbRating, b.tmdbRating),
}

export type StatusFilter = WatchStatus | 'all'

interface WatchlistQuery {
  search: string
  status: StatusFilter
  sort: WatchlistSort
}

/** Pure: search + status filter + sort. Returns a new array, never mutates `entries`. */
export function filterWatchlist(
  entries: WatchlistEntry[],
  { search, status, sort }: WatchlistQuery,
): WatchlistEntry[] {
  const term = search.trim().toLowerCase()
  return entries
    .filter((e) => status === 'all' || e.status === status)
    .filter((e) => !term || e.name.toLowerCase().includes(term))
    .toSorted(SORTERS[sort])
}

/** Shape stored for a series picked from TMDB (search result or details). */
export function toWatchlistSeries(series: SeriesListItem | SeriesSummary): WatchlistSeries {
  return {
    seriesId: series.id,
    name: series.name,
    posterPath: series.poster_path,
    firstAirDate: series.first_air_date || null,
    tmdbRating: series.vote_average || null,
  }
}
