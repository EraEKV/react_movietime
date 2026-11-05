import { useMemo } from 'react'
import { endpoints } from '../api/tmdb'
import type { Genre, GenresResponse } from '../types/tmdb'
import { useFetch } from './useFetch'

/**
 * TV genres as a list (for selects) and an id → name Map (for cards).
 * Genres are secondary data: if the request fails, the UI just shows no genre names.
 */
export function useGenres(): { genres: Genre[]; genresById: Map<number, string> } {
  const { data } = useFetch<GenresResponse>(endpoints.genres())
  const genres = useMemo(() => data?.genres ?? [], [data])
  const genresById = useMemo(() => new Map(genres.map((g) => [g.id, g.name])), [genres])
  return { genres, genresById }
}
