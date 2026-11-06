// Pure helpers for library entries: options, labels, building and changing entries.
import i18n, { translatedOption } from '../i18n'
import type { Option } from '../types/common'
import type { LibraryChanges, LibraryEntry, LibraryMedia, LibraryStatus } from '../types/library'
import type { MovieBase, SeriesBase } from '../types/tmdb'
import { getYear } from './format'
import { mediaKey } from './media'
import type { MediaType } from '../types/media'

export const LIBRARY_STATUSES: Option<LibraryStatus>[] = [
  translatedOption('plan', 'status.plan'),
  translatedOption('watching', 'status.watching'),
  translatedOption('completed', 'status.completed'),
  translatedOption('dropped', 'status.dropped'),
]

export const isLibraryStatus = (value: unknown): value is LibraryStatus =>
  LIBRARY_STATUSES.some((s) => s.value === value)

export const statusLabel = (value: LibraryStatus): string => i18n.t(`status.${value}`)

export const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
export type Score = (typeof SCORES)[number]

/** Word for a 1–10 score button: "Awful" … "Masterpiece". */
export const scoreWord = (score: Score): string => i18n.t(`score.${score}`)

export const NOTES_MAX = 500

/** Snapshot of a movie for the library, taken from the details response. */
export function movieToLibraryMedia(movie: MovieBase): LibraryMedia {
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

export function seriesToLibraryMedia(series: SeriesBase): LibraryMedia {
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

/* ---------- Search, filters, sort (pure, used by the memoized selector) ---------- */

export type LibrarySort = 'updated' | 'score' | 'title' | 'year' | 'rating'

export const LIBRARY_SORTS: Option<LibrarySort>[] = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'score', label: 'Your score' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'year', label: 'Year' },
  { value: 'rating', label: 'TMDB rating' },
]

export type LibraryTypeFilter = 'all' | MediaType

export const LIBRARY_TYPES: Option<LibraryTypeFilter>[] = [
  { value: 'all', label: 'Movies & series' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'Series' },
]

export type StatusFilter = LibraryStatus | 'all'

export interface LibraryQuery {
  search: string
  status: StatusFilter
  type: LibraryTypeFilter
  /** TMDB genre id as a string, '' for any. */
  genre: string
  sort: LibrarySort
}

const byTitle = (a: LibraryEntry, b: LibraryEntry) => a.title.localeCompare(b.title)
const nullableDesc = (a: number | string | null, b: number | string | null) =>
  a === b ? 0 : a === null ? 1 : b === null ? -1 : a < b ? 1 : -1

const SORTERS: Record<LibrarySort, (a: LibraryEntry, b: LibraryEntry) => number> = {
  updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  score: (a, b) => nullableDesc(a.score, b.score) || byTitle(a, b),
  title: byTitle,
  year: (a, b) => nullableDesc(a.year, b.year) || byTitle(a, b),
  rating: (a, b) => nullableDesc(a.tmdbRating, b.tmdbRating) || byTitle(a, b),
}

/** Returns a new array; `entries` is never mutated (toSorted, not sort). */
export function filterLibrary(entries: LibraryEntry[], query: LibraryQuery): LibraryEntry[] {
  const term = query.search.trim().toLowerCase()
  const genre = query.genre ? Number(query.genre) : null
  return entries
    .filter((e) => query.status === 'all' || e.status === query.status)
    .filter((e) => query.type === 'all' || e.mediaType === query.type)
    .filter((e) => genre === null || e.genreIds.includes(genre))
    .filter((e) => !term || e.title.toLowerCase().includes(term))
    .toSorted(SORTERS[query.sort])
}

/** Season sizes of a series, as /tv/{id} lists them. */
export interface SeasonSize {
  season_number: number
  episode_count: number
}

/**
 * Episodes watched up to S{season}E{episode}: all regular seasons before it plus the
 * episode number. Specials (season 0) don't count towards progress.
 */
export function watchedUpTo(seasons: SeasonSize[], season: number, episode: number): number {
  const before = seasons
    .filter((s) => s.season_number > 0 && s.season_number < season)
    .reduce((sum, s) => sum + s.episode_count, 0)
  return before + episode
}
