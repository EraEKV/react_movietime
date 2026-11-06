const BASE_URL = 'https://api.themoviedb.org/3'
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'
const TOKEN = import.meta.env.VITE_TMDB_TOKEN

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

/**
 * GET request to TMDB. The response type is declared by the caller:
 * `tmdbGet<SeriesDetails>(endpoints.seriesDetails(id))`.
 */
export async function tmdbGet<T>(
  path: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<T> {
  if (!TOKEN) {
    throw new ApiError('TMDB token is missing. Set VITE_TMDB_TOKEN in .env.local.', 401)
  }

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
      signal,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ApiError('Network error. Check your connection and try again.', 0)
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

export function imageUrl(path: string | null | undefined, size = 'w342'): string | null {
  return path ? `${IMAGE_BASE_URL}/${size}${path}` : null
}

type Id = number | string

export interface DiscoverSeriesParams {
  page?: number
  sortBy?: string
  genre?: string
  year?: string
  minRating?: string
  minVotes?: number
  status?: string
  airedBefore?: string
}

export const endpoints = {
  genres: () => buildPath('/genre/tv/list'),

  /** The 20 most popular titles of the week; TMDB updates the list daily. */
  trending: (mediaType: 'tv' | 'movie') => buildPath(`/trending/${mediaType}/week`),

  discoverSeries: ({
    page = 1,
    sortBy,
    genre,
    year,
    minRating,
    minVotes,
    status,
    airedBefore,
  }: DiscoverSeriesParams = {}) =>
    buildPath('/discover/tv', {
      page,
      sort_by: sortBy,
      with_genres: genre,
      first_air_date_year: year,
      'vote_average.gte': minRating,
      'vote_count.gte': minVotes,
      with_status: status,
      'first_air_date.lte': airedBefore,
    }),

  searchSeries: ({ query, page = 1, year }: { query: string; page?: number; year?: string }) =>
    buildPath('/search/tv', { query, page, first_air_date_year: year }),

  seriesSummary: (id: Id) => buildPath(`/tv/${id}`),

  seriesDetails: (id: Id) =>
    buildPath(`/tv/${id}`, { append_to_response: 'credits,videos,recommendations' }),

  season: (id: Id, seasonNumber: number) => buildPath(`/tv/${id}/season/${seasonNumber}`),

  // Up to MAX_APPEND seasons with all their episodes in a single request.
  seasonsBatch: (id: Id, seasonNumbers: number[]) =>
    buildPath(`/tv/${id}`, {
      append_to_response: seasonNumbers.map((n) => `season/${n}`).join(','),
    }),
}
