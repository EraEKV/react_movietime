import { useMemo } from 'react'
import { endpoints } from '../api/tmdb.js'
import { useFetch } from './useFetch.js'

/**
 * TV genres as a list (for selects) and an id → name Map (for cards).
 * Genres are secondary data: if the request fails, the UI just shows no genre names.
 */
export function useGenres() {
  const { data } = useFetch(endpoints.genres())
  const genres = useMemo(() => data?.genres ?? [], [data])
  const genresById = useMemo(() => new Map(genres.map((g) => [g.id, g.name])), [genres])
  return { genres, genresById }
}
