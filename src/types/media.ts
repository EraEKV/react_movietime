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

/**
 * "movie_603", "tv_1396" — unique across both types (TMDB ids alone can collide).
 * Used as the Firestore document id of library entries and list items, so a title
 * can't be added twice.
 */
export type MediaKey = `${MediaType}_${number}`
