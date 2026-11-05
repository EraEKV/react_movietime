import { useNavigate, useSearchParams } from 'react-router'
import { endpoints } from '../api/tmdb'
import BackButton from '../components/BackButton/BackButton'
import ErrorState from '../components/EmptyState/ErrorState'
import Skeleton from '../components/Skeleton/Skeleton'
import WatchlistForm from '../components/WatchlistForm/WatchlistForm'
import { useFetch } from '../hooks/useFetch'
import { useWatchlist } from '../hooks/useWatchlist'
import type { SeriesSummary } from '../types/tmdb'
import type { NewWatchlistEntry, WatchlistFormValues } from '../types/watchlist'
import { toWatchlistSeries } from '../utils/watchlist'
import styles from './WatchlistFormPage.module.css'

const EMPTY_VALUES: WatchlistFormValues = { series: null, status: 'plan', score: '', notes: '' }

export default function WatchlistAddPage() {
  const navigate = useNavigate()
  const { entries, addEntry } = useWatchlist()

  // "Add to watchlist" on a series page links here with ?series=<id> to preselect it.
  const [searchParams] = useSearchParams()
  const seriesParam = searchParams.get('series')
  const presetId = /^\d+$/.test(seriesParam ?? '') ? seriesParam : null
  const preset = useFetch<SeriesSummary>(presetId ? endpoints.seriesSummary(presetId) : null)

  function handleSubmit(data: NewWatchlistEntry) {
    addEntry(data)
    navigate('/watchlist')
  }

  let content
  if (preset.status === 'loading') {
    content = (
      <div className={styles.loading} aria-busy="true" aria-label="Loading series">
        <Skeleton width={80} height={20} />
        <Skeleton height={72} radius="md" />
        <Skeleton height={56} radius="md" />
      </div>
    )
  } else if (preset.status === 'error') {
    content = (
      <ErrorState
        title="We couldn’t load that series"
        body={preset.error.message}
        onRetry={preset.reload}
      />
    )
  } else {
    const series = preset.data ? toWatchlistSeries(preset.data) : null
    content = (
      // The form reads initialValues only on mount. The key gives a preselected series
      // its own form instance, so the preset can't be ignored by an already-mounted form.
      <WatchlistForm
        key={series?.seriesId ?? 'blank'}
        initialValues={{ ...EMPTY_VALUES, series }}
        isDuplicate={(seriesId) => entries.some((e) => e.seriesId === seriesId)}
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
      />
    )
  }

  return (
    <section className={styles.page}>
      <title>Add to library · Movietime</title>
      <BackButton />
      <h1 className={styles.title}>Add to library</h1>
      {content}
    </section>
  )
}
