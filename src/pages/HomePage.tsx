import { endpoints, MAX_PAGE } from '../api/tmdb'
import Button from '../components/Button/Button'
import EmptyState from '../components/EmptyState/EmptyState'
import ErrorState from '../components/EmptyState/ErrorState'
import FilterBar from '../components/FilterBar/FilterBar'
import Pagination from '../components/Pagination/Pagination'
import SearchBar from '../components/SearchBar/SearchBar'
import SeriesGrid from '../components/SeriesGrid/SeriesGrid'
import SkeletonGrid from '../components/Skeleton/SkeletonGrid'
import { useFetch } from '../hooks/useFetch'
import { useGenres } from '../hooks/useGenres'
import { useSeriesFilters } from '../hooks/useSeriesFilters'
import type { Paginated, SeriesListItem } from '../types/tmdb'
import { toDiscoverParams } from '../utils/filters'
import { formatNumber } from '../utils/format'
import styles from './HomePage.module.css'

export default function HomePage() {
  const { filters, query, page, activeCount, setFilter, setQuery, setPage, resetFilters } =
    useSeriesFilters()
  const { genres, genresById } = useGenres()

  // TMDB can't combine text search with discover filters, so a query switches the endpoint.
  const searchMode = query !== ''
  const path = searchMode
    ? endpoints.searchSeries({ query, page, year: filters.year })
    : endpoints.discoverSeries(toDiscoverParams(filters, page))

  // The path string changes whenever query, filters or page change → useFetch re-runs its
  // effect, and its cleanup aborts the previous request so older results can't win the race.
  const { status, data, error, reload } = useFetch<Paginated<SeriesListItem>>(path)

  const totalPages = data ? Math.min(data.total_pages, MAX_PAGE) : 0

  function handlePageChange(nextPage: number) {
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section className={styles.page} aria-labelledby="catalog-title">
      <header className={styles.header}>
        <h1 id="catalog-title" className={styles.title}>
          {searchMode ? `Results for “${query}”` : 'Series'}
        </h1>
        {/* aria-live: the count is announced when results change after typing or filtering. */}
        <p className={styles.count} aria-live="polite">
          {status === 'success' && data.total_results > 0
            ? `${formatNumber(data.total_results)} series · page ${page} of ${formatNumber(totalPages)}`
            : '\u00a0'}
        </p>
      </header>

      <SearchBar query={query} onSearch={setQuery} />

      <FilterBar
        filters={filters}
        genres={genres}
        activeCount={activeCount}
        searchMode={searchMode}
        onFilterChange={setFilter}
        onReset={resetFilters}
      />

      {(status === 'idle' || status === 'loading') && <SkeletonGrid />}

      {status === 'error' && (
        <ErrorState title="We couldn’t load series" body={error.message} onRetry={reload} />
      )}

      {status === 'success' && data.results.length === 0 && (
        <EmptyResults
          searchMode={searchMode}
          query={query}
          hasFilters={activeCount > 0}
          page={page}
          onClearSearch={() => setQuery('')}
          onResetFilters={resetFilters}
          onFirstPage={() => handlePageChange(1)}
        />
      )}

      {status === 'success' && data.results.length > 0 && (
        <div>
          <SeriesGrid items={data.results} genresById={genresById} label="Series" />
          <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      )}
    </section>
  )
}

interface EmptyResultsProps {
  searchMode: boolean
  query: string
  hasFilters: boolean
  page: number
  onClearSearch: () => void
  onResetFilters: () => void
  onFirstPage: () => void
}

/** Picks the most useful empty-state message and action for the current mode. */
function EmptyResults({
  searchMode,
  query,
  hasFilters,
  page,
  onClearSearch,
  onResetFilters,
  onFirstPage,
}: EmptyResultsProps) {
  if (searchMode) {
    return (
      <EmptyState
        icon="search"
        title={`Nothing found for “${query}”`}
        body="Check the spelling or try the original title."
        actions={<Button onClick={onClearSearch}>Clear search</Button>}
      />
    )
  }

  if (hasFilters) {
    return (
      <EmptyState
        icon="filter"
        title="No series match these filters"
        body="Try a different genre, year or a lower rating."
        actions={<Button onClick={onResetFilters}>Clear all filters</Button>}
      />
    )
  }

  return (
    <EmptyState
      title="No series on this page"
      body="Try another page."
      actions={page > 1 && <Button onClick={onFirstPage}>Back to first page</Button>}
    />
  )
}
