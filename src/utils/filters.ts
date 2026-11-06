import i18n, { currentLocale, translatedOption } from '../i18n'
import { languageNameWith } from '../i18n/intl'
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
  {
    ...translatedOption('popular', 'catalog:sort.popular'),
    params: () => ({ sortBy: 'popularity.desc' }),
  },
  // Without a vote threshold "top rated" is full of titles with a single 10/10 vote.
  {
    ...translatedOption('top-rated', 'catalog:sort.topRated'),
    params: () => ({ sortBy: 'vote_average.desc', minVotes: 200 }),
  },
  {
    ...translatedOption('most-voted', 'catalog:sort.mostVoted'),
    params: () => ({ sortBy: 'vote_count.desc' }),
  },
  // TMDB has announced titles dated years ahead — cap at today and skip unknown ones.
  {
    ...translatedOption('newest', 'catalog:sort.newest'),
    params: (mediaType) => ({
      sortBy: `${dateField(mediaType)}.desc`,
      releasedBefore: today(),
      minVotes: 10,
    }),
  },
  {
    ...translatedOption('oldest', 'catalog:sort.oldest'),
    params: (mediaType) => ({ sortBy: `${dateField(mediaType)}.asc`, minVotes: 10 }),
  },
]

export const DEFAULT_SORT: SortValue = 'popular'

/* ---------- Filter options ---------- */

export const RATING_OPTIONS: Option[] = [
  translatedOption('', 'catalog:filters.anyRating'),
  { value: '9', label: '9+' },
  { value: '8', label: '8+' },
  { value: '7', label: '7+' },
  { value: '6', label: '6+' },
  { value: '5', label: '5+' },
]

// TMDB series status codes for the with_status parameter.
export const STATUS_OPTIONS: Option[] = [
  translatedOption('', 'catalog:filters.anyStatus'),
  translatedOption('0', 'catalog:status.returning'),
  translatedOption('2', 'catalog:status.inProduction'),
  translatedOption('3', 'catalog:status.ended'),
  translatedOption('4', 'catalog:status.canceled'),
]

// Upper bound in minutes for with_runtime.lte.
export const RUNTIME_OPTIONS: Option[] = [
  translatedOption('', 'catalog:filters.anyLength'),
  translatedOption('90', 'catalog:filters.under90'),
  translatedOption('120', 'catalog:filters.under120'),
  translatedOption('150', 'catalog:filters.under150'),
]

const FIRST_YEAR = 1950
export const YEAR_OPTIONS: Option[] = [
  translatedOption('', 'catalog:filters.anyYear'),
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

/** "Korean" / "корейский" / "корей тілі": names in the interface language, sorted in it. */
export function languageOptions(locale = currentLocale()): Option[] {
  return [
    { value: '', label: i18n.t('catalog:filters.anyLanguage') },
    ...LANGUAGE_CODES.map((code) => ({ value: code, label: languageName(code, locale) })).sort(
      (a, b) => a.label.localeCompare(b.label, locale),
    ),
  ]
}

/** Language name for a code, in the interface language: "en" → "English" / "английский". */
export const languageName = (code: string, locale = currentLocale()) =>
  languageNameWith(code, locale)

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
    lang: LANGUAGE_CODES.includes(get('lang')) ? get('lang') : '',
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
