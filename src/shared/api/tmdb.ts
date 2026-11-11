import i18n from '../i18n'
import { languageInfo } from '../i18n/languages'
import type { Language } from '../types/preferences'

// Our own proxy (api/tmdb on Vercel, a Vite proxy in dev) adds the token on the server, so
// the app works where api.themoviedb.org itself is blocked and no secret ships to browsers.
const BASE_URL = '/api/tmdb'
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'

// TMDB reports more pages than it serves: any page above 500 returns an error.
export const MAX_PAGE = 500

// append_to_response accepts at most 20 sub-requests.
export const MAX_APPEND = 20

export class ApiError extends Error {
  /** HTTP status, or 0 for a network failure. */
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type QueryValue = string | number | boolean | null | undefined

/**
 * Builds a TMDB path with a query string. Empty values (undefined, null, '')
 * are skipped, so callers can pass optional filters without extra checks.
 * The result is a plain string — handy as a stable effect dependency.
 */
export function buildPath(path: string, params: Record<string, QueryValue> = {}): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  }
  const qs = query.toString()
  return qs ? `${path}?${qs}` : path
}

/** True for a request cancelled through AbortController: not an error to show. */
export const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError'

/** TMDB's code for the current interface language: titles, overviews and genres follow it. */
export const tmdbLanguage = () => languageInfo(i18n.language as Language).tmdb

/** Adds `language=` to a path; hooks use the result as their request key. */
export function withLanguage(path: string, language = tmdbLanguage()): string {
  return `${path}${path.includes('?') ? '&' : '?'}language=${language}`
}

/**
 * GET request to TMDB. The response type is declared by the caller:
 * `tmdbGet<SeriesDetails>(endpoints.seriesDetails(id))`. Every request carries the
 * interface language (`language=ru-RU`), unless the path already names one.
 */
export async function tmdbGet<T>(
  path: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<T> {
  const url = `${BASE_URL}${/[?&]language=/.test(path) ? path : withLanguage(path)}`

  let response: Response
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ApiError(i18n.t('errors.network'), 0)
  }

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const statusMessage = (body as { status_message?: string } | null)?.status_message
    throw new ApiError(
      statusMessage ?? `Request failed with status ${response.status}`,
      response.status,
    )
  }
  return body as T
}

/**
 * Several GET requests in parallel. Promise.all keeps the order of `paths` and rejects
 * as soon as one fails; the shared signal cancels all of them together.
 */
export function tmdbGetAll<T>(paths: string[], { signal }: { signal?: AbortSignal } = {}) {
  return Promise.all(paths.map((path) => tmdbGet<T>(path, { signal })))
}

export function imageUrl(path: string | null | undefined, size = 'w342'): string | null {
  return path ? `${IMAGE_BASE_URL}/${size}${path}` : null
}

type Id = number | string

/** "ru-RU" → "ru,en,null": videos in the interface language, English, or without one. */
const videoLanguages = (language: string) =>
  [...new Set([language.slice(0, 2), 'en']), 'null'].join(',')
type MediaType = 'movie' | 'tv'

/** Filters both /discover endpoints understand; each builder maps them to its own names. */
interface DiscoverParams {
  page?: number
  sortBy?: string
  genre?: string
  year?: string
  minRating?: string
  minVotes?: number
  /** ISO 639-1 code of the original language: "en", "ko"… */
  originalLanguage?: string
  /** Hides titles dated after this day (TMDB lists announced ones years ahead). */
  releasedBefore?: string
}

export interface DiscoverSeriesParams extends DiscoverParams {
  status?: string
}

export interface DiscoverMoviesParams extends DiscoverParams {
  /** Minutes. */
  maxRuntime?: string
}

export interface SearchParams {
  query: string
  page?: number
  year?: string
}

export const endpoints = {
  genres: (mediaType: MediaType) => buildPath(`/genre/${mediaType}/list`),

  /** The 20 most popular titles of the week; TMDB updates the list daily. */
  trending: (mediaType: MediaType) => buildPath(`/trending/${mediaType}/week`),

  discoverSeries: ({ page = 1, status, ...params }: DiscoverSeriesParams = {}) =>
    buildPath('/discover/tv', {
      page,
      sort_by: params.sortBy,
      with_genres: params.genre,
      first_air_date_year: params.year,
      'vote_average.gte': params.minRating,
      'vote_count.gte': params.minVotes,
      with_original_language: params.originalLanguage,
      with_status: status,
      'first_air_date.lte': params.releasedBefore,
    }),

  // Same filters, but movies have a "primary release" date instead of a first air date.
  discoverMovies: ({ page = 1, maxRuntime, ...params }: DiscoverMoviesParams = {}) =>
    buildPath('/discover/movie', {
      page,
      sort_by: params.sortBy,
      with_genres: params.genre,
      primary_release_year: params.year,
      'vote_average.gte': params.minRating,
      'vote_count.gte': params.minVotes,
      with_original_language: params.originalLanguage,
      'with_runtime.lte': maxRuntime,
      'primary_release_date.lte': params.releasedBefore,
    }),

  searchSeries: ({ query, page = 1, year }: SearchParams) =>
    buildPath('/search/tv', { query, page, first_air_date_year: year }),

  searchMovies: ({ query, page = 1, year }: SearchParams) =>
    buildPath('/search/movie', { query, page, primary_release_year: year }),

  searchPeople: ({ query, page = 1 }: SearchParams) => buildPath('/search/person', { query, page }),

  searchCollections: ({ query, page = 1 }: SearchParams) =>
    buildPath('/search/collection', { query, page }),

  seriesSummary: (id: Id) => buildPath(`/tv/${id}`),

  // translations: the English overview, shown when TMDB has none in the current language.
  // Videos are filtered by `language` too, so English (and language-less) trailers are added.
  // aggregate_credits: the whole cast and crew over all seasons (`credits` is show-level only).
  seriesDetails: (id: Id, language: string) =>
    buildPath(`/tv/${id}`, {
      append_to_response:
        'credits,aggregate_credits,videos,recommendations,translations,watch/providers',
      include_video_language: videoLanguages(language),
    }),

  /** Where one title can be watched, without the rest of its details (the plan page). */
  watchProviders: (mediaType: MediaType, id: Id) =>
    buildPath(`/${mediaType}/${id}`, { append_to_response: 'watch/providers' }),

  /** Just the movie (runtime, genres): the planner needs one per list item. */
  movieSummary: (id: Id) => buildPath(`/movie/${id}`),

  movieDetails: (id: Id, language: string) =>
    buildPath(`/movie/${id}`, {
      append_to_response: 'credits,videos,recommendations,translations,watch/providers',
      include_video_language: videoLanguages(language),
    }),

  // Biography, birth data and the whole filmography in one request. `translations` gives the
  // English biography when TMDB has none in the current language.
  person: (id: Id) =>
    buildPath(`/person/${id}`, { append_to_response: 'combined_credits,translations' }),

  /** A franchise: its name, cover, overview and every film (`parts`). */
  collection: (id: Id) => buildPath(`/collection/${id}`),

  season: (id: Id, seasonNumber: number) => buildPath(`/tv/${id}/season/${seasonNumber}`),

  // Up to MAX_APPEND seasons with all their episodes in a single request.
  seasonsBatch: (id: Id, seasonNumbers: number[]) =>
    buildPath(`/tv/${id}`, {
      append_to_response: seasonNumbers.map((n) => `season/${n}`).join(','),
    }),
}
