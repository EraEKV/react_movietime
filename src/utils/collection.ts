import type { MediaKey } from '../types/media'
import type { ListMedia } from '../types/list'
import type { CollectionPart } from '../types/tmdb'
import { getYear } from '../shared/lib/format'
import { mediaKey } from './media'

/** A film of a collection with what the page needs, in one flat shape. */
export interface CollectionFilm {
  key: MediaKey
  id: number
  title: string
  posterPath: string | null
  /** '' when unknown. */
  date: string
  rating: number
  overview: string
  genreIds: number[]
}

export function toFilm(part: CollectionPart): CollectionFilm {
  return {
    key: mediaKey('movie', part.id),
    id: part.id,
    title: part.title,
    posterPath: part.poster_path,
    date: part.release_date ?? '',
    rating: part.vote_average,
    overview: part.overview ?? '',
    genreIds: part.genre_ids ?? [],
  }
}

/**
 * Films in release order: the order a franchise is meant to be watched in. TMDB returns the
 * parts in no promised order. Films without a date go last (announced, date unknown), and the
 * same date falls back to the title, so the order never jumps between renders.
 */
export function filmsByDate(parts: CollectionPart[]): CollectionFilm[] {
  return parts.map(toFilm).sort((a, b) => {
    if (!a.date !== !b.date) return a.date ? -1 : 1
    return a.date.localeCompare(b.date) || a.title.localeCompare(b.title) || a.id - b.id
  })
}

/** Out already: a date that is today or earlier. */
export const isReleased = (film: CollectionFilm, today: string) =>
  Boolean(film.date) && film.date <= today

export function splitFilms(films: CollectionFilm[], today: string) {
  return {
    released: films.filter((film) => isReleased(film, today)),
    upcoming: films.filter((film) => !isReleased(film, today)),
  }
}

/** The years a franchise spans: "1999–2021", "2010", or null with no dates. */
export function yearSpan(films: CollectionFilm[]): string | null {
  const years = films.map((film) => getYear(film.date)).filter((year): year is string => !!year)
  const first = years.at(0)
  const last = years.at(-1)
  if (!first || !last) return null
  return first === last ? first : `${first}–${last}`
}

/** What a list stores for a film: the snapshot the "Add to list" dialog saves too. */
export function filmToListMedia(film: CollectionFilm): ListMedia {
  return {
    mediaType: 'movie',
    tmdbId: film.id,
    title: film.title,
    posterPath: film.posterPath,
    year: getYear(film.date),
    genreIds: film.genreIds,
    tmdbRating: film.rating || null,
  }
}
