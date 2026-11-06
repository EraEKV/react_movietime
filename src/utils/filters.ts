// Catalog filters for /discover/movie and /discover/tv. Values are strings because they
// live in the URL. Pure functions only: the hook (useCatalogFilters) wires them to React.
import { endpoints } from '../api/tmdb'
import type { Option } from '../types/common'
import type { MediaType } from '../types/media'

const today = () => new Date().toISOString().slice(0, 10)

/* ---------- Sort ---------- */

interface SortParams {
  sortBy: string
  minVotes?: number
  releasedBefore?: string
}

export type SortValue = 'popular' | 'top-rated' | 'most-voted' | 'newest' | 'oldest'

interface SortOption extends Option<SortValue> {
  params: (mediaType: MediaType) => SortParams
}

// TMDB sorts movies by "primary release date" and series by "first air date".
const dateField = (mediaType: MediaType) =>
  mediaType === 'movie' ? 'primary_release_date' : 'first_air_date'

export const SORT_OPTIONS: SortOption[] = [
  { value: 'popular', label: 'Most popular', params: () => ({ sortBy: 'popularity.desc' }) },
  // Without a vote threshold "top rated" is full of titles with a single 10/10 vote.
  {
    value: 'top-rated',
    label: 'Top rated',
    params: () => ({ sortBy: 'vote_average.desc', minVotes: 200 }),
  },
  { value: 'most-voted', label: 'Most voted', params: () => ({ sortBy: 'vote_count.desc' }) },
  // TMDB has announced titles dated years ahead — cap at today and skip unknown ones.
  {
    value: 'newest',
    label: 'Newest',
    params: (mediaType) => ({
      sortBy: `${dateField(mediaType)}.desc`,
      releasedBefore: today(),
      minVotes: 10,
    }),
  },
  {
    value: 'oldest',
    label: 'Oldest',
    params: (mediaType) => ({ sortBy: `${dateField(mediaType)}.asc`, minVotes: 10 }),
  },
]

export const DEFAULT_SORT: SortValue = 'popular'

/* ---------- Filter options ---------- */

export const RATING_OPTIONS: Option[] = [
  { value: '', label: 'Any rating' },
  { value: '9', label: '9+' },
  { value: '8', label: '8+' },
  { value: '7', label: '7+' },
  { value: '6', label: '6+' },
  { value: '5', label: '5+' },
]

// TMDB series status codes for the with_status parameter.
export const STATUS_OPTIONS: Option[] = [
  { value: '', label: 'Any status' },
  { value: '0', label: 'Returning' },
  { value: '2', label: 'In production' },
  { value: '3', label: 'Ended' },
  { value: '4', label: 'Canceled' },
]

// Upper bound in minutes for with_runtime.lte.
export const RUNTIME_OPTIONS: Option[] = [
  { value: '', label: 'Any length' },
  { value: '90', label: 'Under 90 min' },
  { value: '120', label: 'Under 2 h' },
  { value: '150', label: 'Under 2.5 h' },
]

const FIRST_YEAR = 1950
export const YEAR_OPTIONS: Option[] = [
  { value: '', label: 'Any year' },
  ...Array.from({ length: new Date().getFullYear() - FIRST_YEAR + 1 }, (_, i) => {
    const year = String(new Date().getFullYear() - i)
    return { value: year, label: year }
  }),
]

// A short list of original languages instead of TMDB's ~190 from /configuration/languages:
// a select with 190 entries is hard to use. Names come from the browser (Intl.DisplayNames),
// so they need no request and can follow the UI language later.
// prettier-ignore
const LANGUAGE_CODES = [
  'en', 'ru', 'kk', 'ko', 'ja', 'zh', 'hi', 'fr', 'es', 'de', 'it', 'pt', 'tr', 'uk', 'sv', 'da',
]
const languageNames = new Intl.DisplayNames(['en'], { type: 'language' })

export const LANGUAGE_OPTIONS: Option[] = [
  { value: '', label: 'Any language' },
  ...LANGUAGE_CODES.map((code) => ({ value: code, label: languageNames.of(code) ?? code })).sort(
    (a, b) => a.label.localeCompare(b.label),
  ),
]

/* ---------- Parsing ---------- */

export type FilterKey = 'genre' | 'year' | 'rating' | 'lang' | 'status' | 'runtime'

/** Five filters per catalog: the fifth is status for series and max runtime for movies. */
export function filterKeys(mediaType: MediaType): FilterKey[] {
  return ['genre', 'year', 'rating', 'lang', mediaType === 'tv' ? 'status' : 'runtime']
}

/** Every key is always present; a filter that doesn't apply to the media type stays ''. */
export type CatalogFilters = Record<FilterKey, string> & { sort: SortValue }

const isOption = <V extends string>(options: Option<V>[], value: string): value is V =>
  options.some((o) => o.value === value)

/** Reads filters from URL params, dropping anything that isn't a known option. */
export function parseFilters(searchParams: URLSearchParams, mediaType: MediaType): CatalogFilters {
  const get = (key: string) => searchParams.get(key) ?? ''
  const sort = get('sort')

  return {
    // Genre ids come from TMDB, so only the format is checked here.
    genre: /^\d+$/.test(get('genre')) ? get('genre') : '',
    year: isOption(YEAR_OPTIONS, get('year')) ? get('year') : '',
    rating: isOption(RATING_OPTIONS, get('rating')) ? get('rating') : '',
    lang: isOption(LANGUAGE_OPTIONS, get('lang')) ? get('lang') : '',
    status: mediaType === 'tv' && isOption(STATUS_OPTIONS, get('status')) ? get('status') : '',
    runtime:
      mediaType === 'movie' && isOption(RUNTIME_OPTIONS, get('runtime')) ? get('runtime') : '',
    sort: isOption(SORT_OPTIONS, sort) ? sort : DEFAULT_SORT,
  }
}

/** How many filters differ from the defaults — shown on the mobile Filters button. */
export function countActiveFilters(filters: CatalogFilters, mediaType: MediaType): number {
  const active = filterKeys(mediaType).filter((key) => filters[key] !== '').length
  return active + Number(filters.sort !== DEFAULT_SORT)
}

/* ---------- Request ---------- */

/**
 * TMDB path for one TMDB page of the catalog. A text query switches to /search, which
 * can't combine with discover filters — only the year is passed there.
 */
export function catalogPath(
  mediaType: MediaType,
  filters: CatalogFilters,
  query: string,
  tmdbPage: number,
): string {
  if (query) {
    const params = { query, page: tmdbPage, year: filters.year }
    return mediaType === 'movie' ? endpoints.searchMovies(params) : endpoints.searchSeries(params)
  }

  const sortOption = SORT_OPTIONS.find((o) => o.value === filters.sort) ?? SORT_OPTIONS[0]!
  const sort = sortOption.params(mediaType)
  // A minimum rating means little with a handful of votes, so require some.
  const ratingVotes = filters.rating ? 50 : 0

  const params = {
    page: tmdbPage,
    sortBy: sort.sortBy,
    releasedBefore: sort.releasedBefore,
    minVotes: Math.max(sort.minVotes ?? 0, ratingVotes) || undefined,
    genre: filters.genre,
    year: filters.year,
    minRating: filters.rating,
    originalLanguage: filters.lang,
  }
  return mediaType === 'movie'
    ? endpoints.discoverMovies({ ...params, maxRuntime: filters.runtime })
    : endpoints.discoverSeries({ ...params, status: filters.status })
}

/**
 * Params worth keeping when switching between Movies and Series. Genres (different id
 * lists), status and runtime don't exist on the other side; the page starts over.
 */
const SHARED_PARAMS = ['q', 'year', 'rating', 'lang', 'sort', 'size']

export function sharedCatalogParams(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams()
  for (const key of SHARED_PARAMS) {
    const value = searchParams.get(key)
    if (value) next.set(key, value)
  }
  return next
}
