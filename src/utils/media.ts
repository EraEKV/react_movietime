import type { MediaKey, MediaSummary, MediaType } from '../types/media'
import type { MovieListItem, SeriesListItem, Translations, Video } from '../types/tmdb'

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
  return `${mediaType}_${id}`
}

/** Reads a key from a URL or storage; null for anything that isn't a valid key. */
export function parseMediaKey(value: string): { mediaType: MediaType; id: number } | null {
  const match = /^(movie|tv)_(\d+)$/.exec(value)
  if (!match) return null
  return { mediaType: match[1] === 'movie' ? 'movie' : 'tv', id: Number(match[2]) }
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

/**
 * The overview in the current language, or the English one when TMDB has no translation
 * (common for Kazakh). Comes from the same request: details append `translations`.
 */
export function overviewOf(title: { overview: string; translations?: Translations }): string {
  if (title.overview.trim()) return title.overview
  const english = title.translations?.translations.find((item) => item.iso_639_1 === 'en')
  return english?.data.overview?.trim() ?? ''
}

/**
 * Best YouTube trailer: official trailer → any trailer → teaser. Videos come in the
 * interface language and English (include_video_language), so the first match wins.
 */
export function pickTrailer(videos: Video[] = []): Video | null {
  const youtube = videos.filter((v) => v.site === 'YouTube')
  return (
    youtube.find((v) => v.type === 'Trailer' && v.official) ??
    youtube.find((v) => v.type === 'Trailer') ??
    youtube.find((v) => v.type === 'Teaser') ??
    null
  )
}
