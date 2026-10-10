import { endpoints, MAX_PAGE } from '../api/tmdb.js'
import Button from '../components/Button/Button.jsx'
import FilterBar from '../components/FilterBar/FilterBar.jsx'
import Pagination from '../components/Pagination/Pagination.jsx'
import SearchBar from '../components/SearchBar/SearchBar.jsx'
import SeriesGrid from '../components/SeriesGrid/SeriesGrid.jsx'
import SkeletonGrid from '../components/Skeleton/SkeletonGrid.jsx'
import StatusMessage from '../components/StatusMessage/StatusMessage.jsx'
import { useFetch } from '../hooks/useFetch.js'
import { useGenres } from '../hooks/useGenres.js'
import { useSeriesFilters } from '../hooks/useSeriesFilters.js'
import { toDiscoverParams } from '../utils/filters.js'
import { formatNumber } from '../utils/format.js'
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
  const { status, data, error, reload } = useFetch(path)

  const totalPages = data ? Math.min(data.total_pages, MAX_PAGE) : 0

  function handlePageChange(nextPage) {
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section>
      <header className={styles.header}>
        <h1>{searchMode ? `Results for “${query}”` : 'Discover TV series'}</h1>
        {status === 'success' && data.total_results > 0 && (
          <p className={styles.count}>
            {formatNumber(data.total_results)} series · page {page} of {formatNumber(totalPages)}
          </p>
        )}
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

      {status === 'loading' && <SkeletonGrid />}

      {status === 'error' && (
        <StatusMessage
          tone="error"
          title="Couldn't load series"
          action={<Button onClick={reload}>Try again</Button>}
        >
          {error.message}
        </StatusMessage>
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
        <>
          <SeriesGrid items={data.results} genresById={genresById} />
          <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </>
      )}
    </section>
  )
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
}) {
  if (searchMode) {
    return (
      <StatusMessage
        title={`Nothing found for “${query}”`}
        action={
          <Button variant="ghost" onClick={onClearSearch}>
            Clear search
          </Button>
        }
      >
        Check the spelling or try the original title.
      </StatusMessage>
    )
  }

  if (hasFilters) {
    return (
      <StatusMessage
        title="No series match these filters"
        action={
          <Button variant="ghost" onClick={onResetFilters}>
            Reset filters
          </Button>
        }
      >
        Try a different genre, year or a lower rating.
      </StatusMessage>
    )
  }

  return (
    <StatusMessage
      title="No series on this page"
      action={
        page > 1 && (
          <Button variant="ghost" onClick={onFirstPage}>
            Back to first page
          </Button>
        )
      }
    >
      Try another page.
    </StatusMessage>
  )
}
