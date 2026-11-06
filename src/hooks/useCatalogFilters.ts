import { useSearchParams, type NavigateOptions } from 'react-router'
import type { MediaType } from '../types/media'
import {
  maxCatalogPage,
  pageAfterResize,
  parsePageSize,
  DEFAULT_PAGE_SIZE,
  type PageSize,
} from '../utils/catalog'
import {
  countActiveFilters,
  DEFAULT_SORT,
  filterKeys,
  parseFilters,
  type CatalogFilters,
  type FilterKey,
} from '../utils/filters'
import { parsePage } from '../shared/lib/format'

type ParamValue = string | number | null

/**
 * Filters, sort, page and page size live in the URL instead of useState:
 * links are shareable, refresh keeps them, and back/forward walks through them.
 * Every update creates a new URLSearchParams — the previous one is never mutated.
 */
export function useCatalogFilters(mediaType: MediaType) {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters: CatalogFilters = parseFilters(searchParams, mediaType)
  const query = (searchParams.get('q') ?? '').trim()
  const size = parsePageSize(searchParams.get('size'))
  const page = parsePage(searchParams.get('page'), maxCatalogPage(size))
  const activeCount = countActiveFilters(filters, mediaType)

  function update(changes: Record<string, ParamValue>, options?: NavigateOptions) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(changes)) {
        if (value === '' || value === null) next.delete(key)
        else next.set(key, String(value))
      }
      return next
    }, options)
  }

  // Any filter change sends the user back to page 1 — page 7 of the old results means nothing now.
  function setFilter(key: FilterKey | 'sort', value: string) {
    update({ [key]: key === 'sort' && value === DEFAULT_SORT ? '' : value, page: '' })
  }

  function setPage(nextPage: number) {
    update({ page: nextPage === 1 ? '' : nextPage })
  }

  // A new page size keeps the first visible title on screen instead of jumping to page 1.
  function setSize(nextSize: PageSize) {
    const nextPage = pageAfterResize(page, size, nextSize)
    update({
      size: nextSize === DEFAULT_PAGE_SIZE ? '' : nextSize,
      page: nextPage === 1 ? '' : nextPage,
    })
  }

  // Starting a search adds one history entry (Back returns to browsing);
  // refining it replaces that entry instead of adding one per debounced query.
  function setQuery(nextQuery: string) {
    update({ q: nextQuery, page: '' }, { replace: query !== '' })
  }

  // Clears filters and sort but keeps the search query and page size: they are separate controls.
  function resetFilters() {
    const cleared = Object.fromEntries(filterKeys(mediaType).map((key) => [key, '']))
    update({ ...cleared, sort: '', page: '' })
  }

  return {
    filters,
    query,
    page,
    size,
    activeCount,
    setFilter,
    setQuery,
    setPage,
    setSize,
    resetFilters,
  }
}
