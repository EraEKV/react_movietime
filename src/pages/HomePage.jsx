import { endpoints, MAX_PAGE } from '../api/tmdb.js'
import Button from '../components/Button/Button.jsx'
import FilterBar from '../components/FilterBar/FilterBar.jsx'
import Pagination from '../components/Pagination/Pagination.jsx'
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
  const { filters, page, activeCount, setFilter, setPage, resetFilters } = useSeriesFilters()
  const { genres, genresById } = useGenres()

  // The path string changes whenever filters or page change → useFetch re-runs its effect.
  const { status, data, error, reload } = useFetch(
    endpoints.discoverSeries(toDiscoverParams(filters, page)),
  )

  const totalPages = data ? Math.min(data.total_pages, MAX_PAGE) : 0

  function handlePageChange(nextPage) {
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section>
      <header className={styles.header}>
        <h1>Discover TV series</h1>
        {status === 'success' && data.total_results > 0 && (
          <p className={styles.count}>
            {formatNumber(data.total_results)} series · page {page} of {formatNumber(totalPages)}
          </p>
        )}
      </header>

      <FilterBar
        filters={filters}
        genres={genres}
        activeCount={activeCount}
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
        <StatusMessage
          title={activeCount > 0 ? 'No series match these filters' : 'No series on this page'}
          action={
            activeCount > 0 ? (
              <Button variant="ghost" onClick={resetFilters}>
                Reset filters
              </Button>
            ) : (
              page > 1 && (
                <Button variant="ghost" onClick={() => handlePageChange(1)}>
                  Back to first page
                </Button>
              )
            )
          }
        >
          {activeCount > 0 ? 'Try a different genre, year or a lower rating.' : 'Try another page.'}
        </StatusMessage>
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
