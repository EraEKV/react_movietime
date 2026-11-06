// Page size math for the catalog. TMDB always returns 20 titles per page; the app offers
// 20, 40 or 60 by loading 1, 2 or 3 consecutive TMDB pages for one app page.
import { MAX_PAGE } from '../shared/api/tmdb'
import type { Option } from '../shared/types/common'
import type { MediaSummary } from '../types/media'
import type { Paginated } from '../types/tmdb'
import { uniqueById } from './media'

const TMDB_PAGE_SIZE = 20

export type PageSize = 20 | 40 | 60
export const DEFAULT_PAGE_SIZE: PageSize = 20
export const PAGE_SIZE_OPTIONS: Option<`${PageSize}`>[] = [
  { value: '20', label: '20' },
  { value: '40', label: '40' },
  { value: '60', label: '60' },
]

export function parsePageSize(value: string | null): PageSize {
  return value === '40' ? 40 : value === '60' ? 60 : DEFAULT_PAGE_SIZE
}

const tmdbPagesPerPage = (size: PageSize) => size / TMDB_PAGE_SIZE

/** Last reachable app page: TMDB serves at most 500 pages. */
export function maxCatalogPage(size: PageSize): number {
  return Math.ceil(MAX_PAGE / tmdbPagesPerPage(size))
}

/** TMDB pages behind one app page: size 40, page 3 → TMDB pages 5 and 6. */
export function tmdbPagesFor(page: number, size: PageSize): number[] {
  const perPage = tmdbPagesPerPage(size)
  const first = (page - 1) * perPage + 1
  return Array.from({ length: perPage }, (_, i) => first + i).filter((p) => p <= MAX_PAGE)
}

/**
 * The app page that still shows the first title of the current one after a size change:
 * title #41 is on page 3 with size 20 and on page 2 with size 40.
 */
export function pageAfterResize(page: number, from: PageSize, to: PageSize): number {
  return Math.floor(((page - 1) * from) / to) + 1
}

export interface CatalogResult {
  items: MediaSummary[]
  /** App pages (already divided by the page size and capped at TMDB's 500). */
  totalPages: number
  totalResults: number
}

/** Joins the TMDB pages of one app page into a single result. */
export function mergeCatalogPages<T>(
  pages: Paginated<T>[],
  normalize: (item: T) => MediaSummary,
  size: PageSize,
): CatalogResult {
  const first = pages[0]
  const tmdbTotalPages = Math.min(first?.total_pages ?? 0, MAX_PAGE)
  return {
    items: uniqueById(pages.flatMap((page) => page.results.map(normalize))),
    totalPages: Math.ceil(tmdbTotalPages / tmdbPagesPerPage(size)),
    totalResults: first?.total_results ?? 0,
  }
}
