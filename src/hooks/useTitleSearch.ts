import { endpoints, tmdbGet, withLanguage } from '../shared/api/tmdb'
import type { MediaSummary } from '../types/media'
import type { MovieListItem, Paginated, SeriesListItem } from '../types/tmdb'
import { fromMovie, fromSeries } from '../utils/media'
import { useDebouncedValue } from '../shared/hooks/useDebouncedValue'
import { useRequest } from '../shared/hooks/useRequest'
import { useTmdbLanguage } from '../shared/hooks/useTmdbLanguage'

export const MIN_LENGTH = 2

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

/** Movies and series matching `query`, interleaved (two TMDB requests, one AbortSignal). */
export async function searchTitles(
  query: string,
  language: string,
  signal?: AbortSignal,
): Promise<MediaSummary[]> {
  const [movies, series] = await Promise.all([
    tmdbGet<Paginated<MovieListItem>>(withLanguage(endpoints.searchMovies({ query }), language), {
      signal,
    }),
    tmdbGet<Paginated<SeriesListItem>>(withLanguage(endpoints.searchSeries({ query }), language), {
      signal,
    }),
  ])
  return interleave(movies.results.map(fromMovie), series.results.map(fromSeries))
}

/**
 * Searches movies and series at once, debounced so typing "breaking" sends one search, not
 * eight. Queries shorter than 2 letters stay idle.
 */
export function useTitleSearch(query: string) {
  const debounced = useDebouncedValue(query.trim(), 350)
  const language = useTmdbLanguage()
  const key = debounced.length >= MIN_LENGTH ? `${language}|${debounced}` : null

  const state = useRequest(key, (currentKey, signal) =>
    searchTitles(currentKey.slice(language.length + 1), language, signal),
  )

  // While the debounce is pending the old results would be misleading: report loading.
  const pending = query.trim() !== debounced && query.trim().length >= MIN_LENGTH
  return { ...state, pending, tooShort: query.trim().length < MIN_LENGTH }
}
