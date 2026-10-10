import { useSearchParams } from 'react-router'
import { endpoints, MAX_PAGE } from '../api/tmdb.js'
import Button from '../components/Button/Button.jsx'
import Pagination from '../components/Pagination/Pagination.jsx'
import SeriesGrid from '../components/SeriesGrid/SeriesGrid.jsx'
import SkeletonGrid from '../components/Skeleton/SkeletonGrid.jsx'
import StatusMessage from '../components/StatusMessage/StatusMessage.jsx'
import { useFetch } from '../hooks/useFetch.js'
import { useGenres } from '../hooks/useGenres.js'
import { formatNumber, parsePage } from '../utils/format.js'
import styles from './HomePage.module.css'

export default function HomePage() {
  // The URL is the source of truth for the page number: back/forward and refresh just work.
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parsePage(searchParams.get('page'), MAX_PAGE)

  const { status, data, error, reload } = useFetch(
    endpoints.discoverSeries({ page, sortBy: 'popularity.desc' }),
  )
  const { genresById } = useGenres()

  const totalPages = data ? Math.min(data.total_pages, MAX_PAGE) : 0

  function handlePageChange(nextPage) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (nextPage === 1) next.delete('page')
      else next.set('page', String(nextPage))
      return next
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section>
      <header className={styles.header}>
        <h1>Discover TV series</h1>
        {status === 'success' && (
          <p className={styles.count}>
            {formatNumber(data.total_results)} series · page {page} of {formatNumber(totalPages)}
          </p>
        )}
      </header>

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
          title="No series here"
          action={
            page > 1 && (
              <Button variant="ghost" onClick={() => handlePageChange(1)}>
                Back to first page
              </Button>
            )
          }
        >
          This page has no results. Try another page.
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
