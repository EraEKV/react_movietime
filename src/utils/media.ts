import type { MediaKey, MediaSummary, MediaType } from '../types/media'
import type { MovieListItem, SeriesListItem } from '../types/tmdb'

// TMDB names the same fields differently for movies (title, release_date)
// and series (name, first_air_date). These functions hide that difference.

export function fromMovie(movie: MovieListItem): MediaSummary {
  return {
    mediaType: 'movie',
    id: movie.id,
    title: movie.title,
    posterPath: movie.poster_path,
    date: movie.release_date ?? '',
    rating: movie.vote_average,
    genreIds: movie.genre_ids ?? [],
  }
}

export function fromSeries(series: SeriesListItem): MediaSummary {
  return {
    mediaType: 'tv',
    id: series.id,
    title: series.name,
    posterPath: series.poster_path,
    date: series.first_air_date ?? '',
    rating: series.vote_average,
    genreIds: series.genre_ids ?? [],
  }
}

export function mediaKey(mediaType: MediaType, id: number): MediaKey {
  return `${mediaType}:${id}`
}

/** App route of a title: /movies/603 or /series/1396. */
export function mediaHref(mediaType: MediaType, id: number): string {
  return `/${mediaType === 'movie' ? 'movies' : 'series'}/${id}`
}

/**
 * Drops repeated titles, keeping the first one. TMDB pages are computed per request,
 * so when popularity shifts between two page requests a title can appear on both —
 * and a duplicate id would also be a duplicate React key.
 */
export function uniqueById<T extends { id: number }>(items: T[]): T[] {
  const seen = new Set<number>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}
