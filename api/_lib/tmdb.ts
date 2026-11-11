// The TMDB proxy: the browser asks our own domain, the server adds the token and asks TMDB.
// That keeps working on networks that block api.themoviedb.org, and the token stays out of
// the client bundle.
//
// The proxy is public and the token is ours, so it answers only the requests the app itself
// makes: a list of path shapes, a list of query parameters with a shape for each value.
// Anything else is refused, and unknown parameters are dropped, so `?x=1`, `?x=2`… can't be
// used to dodge the cache or to spend the TMDB quota.

export const TMDB_UPSTREAM = 'https://api.themoviedb.org/3'
const PREFIX = '/api/tmdb'

const MEDIA = '(?:movie|tv)'
const DISCOVER = [
  'page',
  'sort_by',
  'with_genres',
  'with_status',
  'with_original_language',
  'first_air_date_year',
  'primary_release_year',
  'first_air_date.lte',
  'primary_release_date.lte',
  'vote_average.gte',
  'vote_count.gte',
  'with_runtime.lte',
]
const TITLE = ['append_to_response', 'include_video_language']

/**
 * The only paths the app uses (see `endpoints` in src/shared/api/tmdb.ts), the query
 * parameters each one takes (others are dropped) and how long its answer may be cached.
 */
const PATHS: {
  pattern: RegExp
  params: string[]
  edgeSeconds: number
  browserSeconds: number
}[] = [
  // Genre names change about never.
  {
    pattern: new RegExp(`^/genre/${MEDIA}/list$`),
    params: [],
    edgeSeconds: 7 * 86400,
    browserSeconds: 86400,
  },
  // Charts and catalogue pages move during the day.
  {
    pattern: new RegExp(`^/trending/${MEDIA}/week$`),
    params: [],
    edgeSeconds: 3600,
    browserSeconds: 600,
  },
  {
    pattern: new RegExp(`^/discover/${MEDIA}$`),
    params: DISCOVER,
    edgeSeconds: 3600,
    browserSeconds: 600,
  },
  // Search text is varied and a new title should show up soon.
  {
    pattern: /^\/search\/(?:movie|tv|person|collection)$/,
    params: ['page', 'query', 'first_air_date_year', 'primary_release_year'],
    edgeSeconds: 600,
    browserSeconds: 300,
  },
  // One title, person or collection (with its appended credits, seasons…).
  {
    pattern: new RegExp(`^/${MEDIA}/\\d{1,9}$`),
    params: TITLE,
    edgeSeconds: 6 * 3600,
    browserSeconds: 600,
  },
  {
    pattern: /^\/tv\/\d{1,9}\/season\/\d{1,3}$/,
    params: [],
    edgeSeconds: 6 * 3600,
    browserSeconds: 600,
  },
  {
    pattern: /^\/(?:person|collection)\/\d{1,9}$/,
    params: ['append_to_response'],
    edgeSeconds: 6 * 3600,
    browserSeconds: 600,
  },
]

/** Words TMDB accepts in `append_to_response` and that the app asks for. */
const APPENDABLE = new Set([
  'credits',
  'aggregate_credits',
  'videos',
  'recommendations',
  'translations',
  'watch/providers',
  'combined_credits',
])

const SIMPLE = /^[A-Za-z0-9_.,|:-]{1,100}$/
const NUMBER = /^\d{1,9}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const RATING = /^\d{1,2}(?:\.\d{1,2})?$/
const LANGUAGE = /^[a-z]{2}(?:-[A-Z]{2})?$/

/** Query parameters the app sends; the function says whether a value is acceptable. */
const PARAMS: Record<string, (value: string) => boolean> = {
  language: (v) => LANGUAGE.test(v),
  page: (v) => NUMBER.test(v) && Number(v) >= 1 && Number(v) <= 500,
  query: (v) => v.length >= 1 && v.length <= 100,
  sort_by: (v) => SIMPLE.test(v),
  with_genres: (v) => SIMPLE.test(v),
  with_status: (v) => SIMPLE.test(v),
  with_original_language: (v) => /^[a-z]{2,3}$/.test(v),
  first_air_date_year: (v) => /^\d{4}$/.test(v),
  primary_release_year: (v) => /^\d{4}$/.test(v),
  'first_air_date.lte': (v) => DATE.test(v),
  'primary_release_date.lte': (v) => DATE.test(v),
  'vote_average.gte': (v) => RATING.test(v),
  'vote_count.gte': (v) => NUMBER.test(v),
  'with_runtime.lte': (v) => NUMBER.test(v),
  include_video_language: (v) => SIMPLE.test(v),
  append_to_response: (v) => {
    const parts = v.split(',')
    return (
      parts.length <= 20 &&
      parts.every((p) => APPENDABLE.has(p) || /^season\/\d{1,3}$/.test(p)) &&
      new Set(parts).size === parts.length
    )
  },
}

export interface TmdbRequest {
  /** The TMDB URL to fetch. */
  upstream: string
  /** Path plus sorted query: the same for every spelling of the same request. */
  key: string
  /** How long a shared (edge) cache may keep the answer. */
  edgeSeconds: number
  /** How long a browser may reuse it. */
  browserSeconds: number
}

/**
 * `/api/tmdb/movie/550?language=en-US` → what to fetch and how to cache it, or null when the
 * request is not one the app makes: other paths, `.`/`%`/`@`/`\` in the path (no escaping
 * the /3 prefix or reaching another host), a value of the wrong shape. Parameters the app
 * does not use are dropped, the rest are sorted, so equal requests share one cache entry.
 */
export function parseTmdbRequest(pathname: string, search: string): TmdbRequest | null {
  if (!pathname.startsWith(`${PREFIX}/`)) return null
  const path = pathname.slice(PREFIX.length)
  if (!/^\/[A-Za-z0-9/_-]+$/.test(path) || path.includes('//')) return null
  const rule = PATHS.find((p) => p.pattern.test(path))
  if (!rule) return null

  const input = new URLSearchParams(search)
  const kept = new URLSearchParams()
  for (const name of [...new Set(input.keys())].sort()) {
    const check = PARAMS[name]
    if (!check || (name !== 'language' && !rule.params.includes(name))) continue
    const values = input.getAll(name)
    const value = values[0] ?? ''
    // A repeated parameter is never sent by the app.
    if (values.length !== 1 || !check(value)) return null
    kept.set(name, value)
  }

  const query = kept.toString()
  const key = query ? `${path}?${query}` : path
  return {
    upstream: `${TMDB_UPSTREAM}${key}`,
    key,
    edgeSeconds: rule.edgeSeconds,
    browserSeconds: rule.browserSeconds,
  }
}

/** The request URL → the proxied request, or null. */
export function proxyTarget(requestUrl: string): TmdbRequest | null {
  const url = new URL(requestUrl)
  return parseTmdbRequest(url.pathname, url.search)
}

/** The token lives in the Worker's secrets: TMDB_TOKEN, or the VITE_TMDB_TOKEN of old setups. */
export const tmdbToken = (): string | undefined =>
  process.env.TMDB_TOKEN ?? process.env.VITE_TMDB_TOKEN
