// Pure helpers for library entries: options, labels, building and changing entries.
import type { Option } from '../types/common'
import type { LibraryChanges, LibraryEntry, LibraryMedia, LibraryStatus } from '../types/library'
import type { MovieDetails, SeriesDetails } from '../types/tmdb'
import { getYear } from './format'
import { mediaKey } from './media'

export const LIBRARY_STATUSES: Option<LibraryStatus>[] = [
  { value: 'plan', label: 'Plan to watch' },
  { value: 'watching', label: 'Watching' },
  { value: 'completed', label: 'Completed' },
  { value: 'dropped', label: 'Dropped' },
]

export const isLibraryStatus = (value: unknown): value is LibraryStatus =>
  LIBRARY_STATUSES.some((s) => s.value === value)

export const statusLabel = (value: LibraryStatus): string =>
  LIBRARY_STATUSES.find((s) => s.value === value)?.label ?? value

/** Words for the 1–10 score buttons. */
export const SCORE_WORDS = [
  'Awful',
  'Bad',
  'Poor',
  'Meh',
  'Okay',
  'Decent',
  'Good',
  'Great',
  'Excellent',
  'Masterpiece',
] as const

export const NOTES_MAX = 500

/** Snapshot of a movie for the library, taken from the details response. */
export function movieToLibraryMedia(movie: MovieDetails): LibraryMedia {
  return {
    mediaType: 'movie',
    tmdbId: movie.id,
    title: movie.title,
    posterPath: movie.poster_path,
    year: getYear(movie.release_date),
    genreIds: movie.genres.map((g) => g.id),
    tmdbRating: movie.vote_average || null,
    runtime: movie.runtime || null,
    totalEpisodes: null,
  }
}

export function seriesToLibraryMedia(series: SeriesDetails): LibraryMedia {
  return {
    mediaType: 'tv',
    tmdbId: series.id,
    title: series.name,
    posterPath: series.poster_path,
    year: getYear(series.first_air_date),
    genreIds: series.genres.map((g) => g.id),
    tmdbRating: series.vote_average || null,
    runtime: series.episode_run_time[0] ?? null,
    totalEpisodes: series.number_of_episodes || null,
  }
}

/** A new entry. `now` is passed in, so the function stays pure (and testable). */
export function createEntry(media: LibraryMedia, status: LibraryStatus, now: string): LibraryEntry {
  return {
    ...media,
    key: mediaKey(media.mediaType, media.tmdbId),
    status,
    score: null,
    notes: '',
    progress: null,
    addedAt: now,
    updatedAt: now,
    completedAt: status === 'completed' ? now : null,
  }
}

/**
 * Applies changes immutably. completedAt follows the status: set when an entry becomes
 * completed, kept while it stays completed, cleared when it leaves that status.
 */
export function applyChanges(
  entry: LibraryEntry,
  changes: LibraryChanges,
  now: string,
): LibraryEntry {
  const status = changes.status ?? entry.status
  const completedAt =
    status !== 'completed' ? null : entry.status === 'completed' ? entry.completedAt : now
  return { ...entry, ...changes, updatedAt: now, completedAt }
}

/** 0…1 for series with known episode count and progress, otherwise null. */
export function progressRatio(entry: LibraryEntry): number | null {
  if (!entry.progress || !entry.totalEpisodes) return null
  return Math.min(1, entry.progress.watchedEpisodes / entry.totalEpisodes)
}
