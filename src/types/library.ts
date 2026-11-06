import type { MediaKey, MediaType } from './media'

export type LibraryStatus = 'plan' | 'watching' | 'completed' | 'dropped'

/** Series progress: the last watched episode. */
export interface SeriesProgress {
  season: number
  episode: number
  /** Episodes watched up to and including this one (regular seasons only). */
  watchedEpisodes: number
}

/**
 * A snapshot of the title, saved with the entry so the library renders
 * without a TMDB request per row (see docs/DATA_MODEL.md).
 */
export interface LibraryMedia {
  mediaType: MediaType
  tmdbId: number
  title: string
  posterPath: string | null
  /** "1999" or null. */
  year: string | null
  genreIds: number[]
  tmdbRating: number | null
  /** Minutes: movie runtime or a typical episode. */
  runtime: number | null
  /** Series only. */
  totalEpisodes: number | null
}

/**
 * `users/{uid}/library/{key}` for signed-in users, `localStorage` for guests.
 * In the app (and in Redux) dates are ISO strings: Firestore Timestamps are converted in
 * the service, because the store must only hold serializable data.
 */
export interface LibraryEntry extends LibraryMedia {
  key: MediaKey
  status: LibraryStatus
  /** 1–10, or null when not scored. */
  score: number | null
  notes: string
  progress: SeriesProgress | null
  addedAt: string
  updatedAt: string
  completedAt: string | null
}

/** What the user can change on an entry. */
export type LibraryChanges = Partial<Pick<LibraryEntry, 'status' | 'score' | 'notes' | 'progress'>>
