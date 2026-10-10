const BASE_URL = 'https://api.themoviedb.org/3'
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'
const TOKEN = import.meta.env.VITE_TMDB_TOKEN

// TMDB reports more pages than it serves: any page above 500 returns an error.
export const MAX_PAGE = 500

// append_to_response accepts at most 20 sub-requests.
export const MAX_APPEND = 20

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Builds a TMDB path with a query string. Empty values (undefined, null, '')
 * are skipped, so callers can pass optional filters without extra checks.
 * The result is a plain string — handy as a stable effect dependency.
 */
export function buildPath(path, params = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  }
  const qs = query.toString()
  return qs ? `${path}?${qs}` : path
}

export async function tmdbGet(path, { signal } = {}) {
  if (!TOKEN) {
    throw new ApiError('TMDB token is missing. Set VITE_TMDB_TOKEN in .env.local.', 401)
  }

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError('Network error. Check your connection and try again.', 0)
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const message = body?.status_message ?? `Request failed with status ${response.status}`
    throw new ApiError(message, response.status)
  }
  return body
}

export function imageUrl(path, size = 'w342') {
  return path ? `${IMAGE_BASE_URL}/${size}${path}` : null
}

export const endpoints = {
  genres: () => buildPath('/genre/tv/list'),

  discoverSeries: ({
    page = 1,
    sortBy,
    genre,
    year,
    minRating,
    minVotes,
    status,
    airedBefore,
  } = {}) =>
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

  searchSeries: ({ query, page = 1, year } = {}) =>
    buildPath('/search/tv', { query, page, first_air_date_year: year }),

  seriesSummary: (id) => buildPath(`/tv/${id}`),

  seriesDetails: (id) =>
    buildPath(`/tv/${id}`, { append_to_response: 'credits,videos,recommendations' }),

  season: (id, seasonNumber) => buildPath(`/tv/${id}/season/${seasonNumber}`),

  // Up to MAX_APPEND seasons with all their episodes in a single request.
  seasonsBatch: (id, seasonNumbers) =>
    buildPath(`/tv/${id}`, {
      append_to_response: seasonNumbers.map((n) => `season/${n}`).join(','),
    }),
}
