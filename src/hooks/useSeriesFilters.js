import { useSearchParams } from 'react-router'
import { MAX_PAGE } from '../api/tmdb.js'
import { DEFAULT_SORT, FILTER_KEYS, parseFilters } from '../utils/filters.js'
import { parsePage } from '../utils/format.js'

/**
 * Filters, sort and page live in the URL instead of useState:
 * links are shareable, refresh keeps them, and back/forward walks through them.
 * Every update creates a new URLSearchParams — the previous one is never mutated.
 */
export function useSeriesFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = parseFilters(searchParams)
  const query = (searchParams.get('q') ?? '').trim()
  const page = parsePage(searchParams.get('page'), MAX_PAGE)
  const activeCount =
    FILTER_KEYS.filter((key) => filters[key] !== '').length + Number(filters.sort !== DEFAULT_SORT)

  function update(changes, options) {
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
  function setFilter(key, value) {
    update({ [key]: key === 'sort' && value === DEFAULT_SORT ? '' : value, page: '' })
  }

  function setPage(nextPage) {
    update({ page: nextPage === 1 ? '' : nextPage })
  }

  // Starting a search adds one history entry (Back returns to browsing);
  // refining it replaces that entry instead of adding one per debounced query.
  function setQuery(nextQuery) {
    update({ q: nextQuery, page: '' }, { replace: query !== '' })
  }

  // Clears filters and sort but keeps the search query: they are separate controls.
  function resetFilters() {
    update({ ...Object.fromEntries(FILTER_KEYS.map((key) => [key, ''])), sort: '', page: '' })
  }

  return { filters, query, page, activeCount, setFilter, setQuery, setPage, resetFilters }
}
