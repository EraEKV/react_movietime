import { endpoints, tmdbGet } from '../api/tmdb'
import type { MediaSummary } from '../types/media'
import type { MovieListItem, Paginated, SeriesListItem } from '../types/tmdb'
import { fromMovie, fromSeries } from '../utils/media'
import { useDebouncedValue } from './useDebouncedValue'
import { useRequest } from './useRequest'

const MIN_LENGTH = 2

/** Alternates movies and series, so both kinds show up near the top. */
function interleave(a: MediaSummary[], b: MediaSummary[]): MediaSummary[] {
  const out: MediaSummary[] = []
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const movie = a[i]
    const series = b[i]
    if (movie) out.push(movie)
    if (series) out.push(series)
  }
  return out
}

/**
 * Searches movies and series at once (two TMDB requests, one AbortSignal), debounced so
 * typing "breaking" sends one search, not eight. Queries shorter than 2 letters stay idle.
 */
export function useTitleSearch(query: string) {
  const debounced = useDebouncedValue(query.trim(), 350)
  const key = debounced.length >= MIN_LENGTH ? debounced : null

  const state = useRequest(key, async (q, signal) => {
    const [movies, series] = await Promise.all([
      tmdbGet<Paginated<MovieListItem>>(endpoints.searchMovies({ query: q }), { signal }),
      tmdbGet<Paginated<SeriesListItem>>(endpoints.searchSeries({ query: q }), { signal }),
    ])
    return interleave(movies.results.map(fromMovie), series.results.map(fromSeries))
  })

  // While the debounce is pending the old results would be misleading: report loading.
  const pending = query.trim() !== debounced && query.trim().length >= MIN_LENGTH
  return { ...state, pending, tooShort: query.trim().length < MIN_LENGTH }
}
