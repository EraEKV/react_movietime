// One shape for movies and series, so cards, grids and (later) the library don't care
// which TMDB endpoint a title came from.

/** TMDB's own names for the two kinds of titles, used in API paths (/movie/…, /tv/…). */
export type MediaType = 'movie' | 'tv'

export interface MediaSummary {
  mediaType: MediaType
  id: number
  title: string
  posterPath: string | null
  /** Release date for movies, first air date for series; '' when unknown. */
  date: string
  rating: number
  genreIds: number[]
}

/** "movie:603", "tv:1396" — unique across both types (TMDB ids alone can collide). */
export type MediaKey = `${MediaType}:${number}`
