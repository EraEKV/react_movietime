import { tmdbGet } from '../api/tmdb'
import { useRequest, type FetchState } from './useRequest'

export type { FetchState }

/**
 * Loads one TMDB path: `useFetch<SeriesDetails>(endpoints.seriesDetails(id))`.
 * Pass `null` to skip the request. Race handling and the state machine live in useRequest.
 */
export function useFetch<T>(path: string | null): FetchState<T> {
  return useRequest(path, (currentPath, signal) => tmdbGet<T>(currentPath, { signal }))
}
