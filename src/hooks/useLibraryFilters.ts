import { useSearchParams } from 'react-router'
import type { Option } from '../types/common'
import {
  isLibraryStatus,
  LIBRARY_SORTS,
  LIBRARY_TYPES,
  type LibraryQuery,
  type LibrarySort,
  type LibraryTypeFilter,
  type StatusFilter,
} from '../utils/library'
import { parsePage } from '../utils/format'

export type LibraryView = 'rows' | 'grid'

// Defaults are removed from the URL, so a clean library is just "/library".
const DEFAULTS: Record<string, string> = {
  status: 'all',
  type: 'all',
  sort: 'updated',
  view: 'rows',
}

const isOption = <V extends string>(options: Option<V>[], value: string): value is V =>
  options.some((o) => o.value === value)

/**
 * Library search, filters, sort, page and view in the URL, like the catalog:
 * the dashboard (phase 9) links straight to "/library?status=completed".
 * Text search replaces the history entry, so Back doesn't step through every letter.
 */
export function useLibraryFilters() {
  const [params, setParams] = useSearchParams()

  const statusParam = params.get('status') ?? ''
  const typeParam = params.get('type') ?? ''
  const sortParam = params.get('sort') ?? ''
  const genreParam = params.get('genre') ?? ''

  const query: LibraryQuery = {
    search: params.get('q') ?? '',
    status: isLibraryStatus(statusParam) ? statusParam : 'all',
    type: isOption(LIBRARY_TYPES, typeParam) ? typeParam : 'all',
    genre: /^\d+$/.test(genreParam) ? genreParam : '',
    sort: isOption(LIBRARY_SORTS, sortParam) ? sortParam : 'updated',
  }
  const page = parsePage(params.get('page'), Number.MAX_SAFE_INTEGER)
  const view: LibraryView = params.get('view') === 'grid' ? 'grid' : 'rows'

  function update(changes: Record<string, string | number>, replace = false) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(changes)) {
          const text = String(value)
          if (text === '' || text === DEFAULTS[key] || (key === 'page' && text === '1')) {
            next.delete(key)
          } else next.set(key, text)
        }
        return next
      },
      { replace },
    )
  }

  return {
    query,
    page,
    view,
    setSearch: (search: string) => update({ q: search, page: 1 }, true),
    setStatus: (status: StatusFilter) => update({ status, page: 1 }),
    setType: (type: LibraryTypeFilter) => update({ type, genre: '', page: 1 }),
    setGenre: (genre: string) => update({ genre, page: 1 }),
    setSort: (sort: LibrarySort) => update({ sort, page: 1 }),
    setPage: (next: number) => update({ page: next }),
    setView: (next: LibraryView) => update({ view: next }),
    clearFilters: () => update({ q: '', status: 'all', type: 'all', genre: '', page: 1 }),
  }
}
