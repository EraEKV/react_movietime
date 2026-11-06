import { useMemo } from 'react'
import { endpoints } from '../api/tmdb'
import type { MediaType } from '../types/media'
import type { Genre, GenresResponse } from '../types/tmdb'
import { useFetch } from './useFetch'

/**
 * Genres of one media type as a list (for selects) and an id → name Map (for cards).
 * Movie and TV genres are different lists in TMDB (e.g. "Sci-Fi & Fantasy" is TV only).
 * Genres are secondary data: if the request fails, the UI just shows no genre names.
 */
export function useGenres(mediaType: MediaType): {
  genres: Genre[]
  genresById: Map<number, string>
} {
  const { data } = useFetch<GenresResponse>(endpoints.genres(mediaType))
  const genres = useMemo(() => data?.genres ?? [], [data])
  const genresById = useMemo(() => new Map(genres.map((g) => [g.id, g.name])), [genres])
  return { genres, genresById }
}
