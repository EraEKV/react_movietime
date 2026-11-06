import { tmdbGet, withLanguage } from '../api/tmdb'
import { useRequest, type FetchState } from './useRequest'
import { useTmdbLanguage } from './useTmdbLanguage'

export type { FetchState }

/**
 * Loads one TMDB path: `useFetch<SeriesDetails>(endpoints.seriesDetails(id))`.
 * Pass `null` to skip the request. Race handling and the state machine live in useRequest.
 * The language is part of the path (and so of the key): switching it refetches.
 */
export function useFetch<T>(path: string | null): FetchState<T> {
  const language = useTmdbLanguage()
  return useRequest(path && withLanguage(path, language), (currentPath, signal) =>
    tmdbGet<T>(currentPath, { signal }),
  )
}
