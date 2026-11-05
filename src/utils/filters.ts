// Filter and sort options for /discover/tv. Values are strings because they live in the URL.
import type { DiscoverSeriesParams } from '../api/tmdb'
import type { Option } from '../types/common'

const today = () => new Date().toISOString().slice(0, 10)

interface SortParams {
  sortBy: string
  minVotes?: number
  airedBefore?: string
}

export type SortValue = 'popular' | 'top-rated' | 'most-voted' | 'newest' | 'oldest'

interface SortOption extends Option<SortValue> {
  params: () => SortParams
}

export const SORT_OPTIONS: SortOption[] = [
  { value: 'popular', label: 'Most popular', params: () => ({ sortBy: 'popularity.desc' }) },
  // Without a vote threshold "top rated" is full of shows with a single 10/10 vote.
  {
    value: 'top-rated',
    label: 'Top rated',
    params: () => ({ sortBy: 'vote_average.desc', minVotes: 200 }),
  },
  { value: 'most-voted', label: 'Most voted', params: () => ({ sortBy: 'vote_count.desc' }) },
  // TMDB has announced shows dated years ahead — cap at today and skip unknown ones.
  {
    value: 'newest',
    label: 'Newest',
    params: () => ({ sortBy: 'first_air_date.desc', airedBefore: today(), minVotes: 10 }),
  },
  {
    value: 'oldest',
    label: 'Oldest',
    params: () => ({ sortBy: 'first_air_date.asc', minVotes: 10 }),
  },
]

export const DEFAULT_SORT: SortValue = 'popular'

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

const FIRST_YEAR = 1950
export const YEAR_OPTIONS: Option[] = [
  { value: '', label: 'Any year' },
  ...Array.from({ length: new Date().getFullYear() - FIRST_YEAR + 1 }, (_, i) => {
    const year = String(new Date().getFullYear() - i)
    return { value: year, label: year }
  }),
]

export const FILTER_KEYS = ['genre', 'year', 'rating', 'status'] as const
export type FilterKey = (typeof FILTER_KEYS)[number]

export type SeriesFilters = Record<FilterKey, string> & { sort: SortValue }

const isOption = <V extends string>(options: Option<V>[], value: string): value is V =>
  options.some((o) => o.value === value)

/** Reads filters from URL params, dropping anything that isn't a known option. */
export function parseFilters(searchParams: URLSearchParams): SeriesFilters {
  const genre = searchParams.get('genre') ?? ''
  const year = searchParams.get('year') ?? ''
  const rating = searchParams.get('rating') ?? ''
  const status = searchParams.get('status') ?? ''
  const sort = searchParams.get('sort') ?? DEFAULT_SORT

  return {
    genre: /^\d+$/.test(genre) ? genre : '',
    year: isOption(YEAR_OPTIONS, year) ? year : '',
    rating: isOption(RATING_OPTIONS, rating) ? rating : '',
    status: isOption(STATUS_OPTIONS, status) ? status : '',
    sort: isOption(SORT_OPTIONS, sort) ? sort : DEFAULT_SORT,
  }
}

/** Turns UI filters into arguments for endpoints.discoverSeries. */
export function toDiscoverParams(filters: SeriesFilters, page: number): DiscoverSeriesParams {
  const sortOption = SORT_OPTIONS.find((o) => o.value === filters.sort) ?? SORT_OPTIONS[0]!
  const sort = sortOption.params()
  // A minimum rating means little with a handful of votes, so require some.
  const ratingVotes = filters.rating ? 50 : 0

  return {
    page,
    sortBy: sort.sortBy,
    airedBefore: sort.airedBefore,
    minVotes: Math.max(sort.minVotes ?? 0, ratingVotes) || undefined,
    genre: filters.genre,
    year: filters.year,
    minRating: filters.rating,
    status: filters.status,
  }
}
