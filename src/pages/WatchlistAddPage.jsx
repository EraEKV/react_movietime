import { useNavigate, useSearchParams } from 'react-router'
import { endpoints } from '../api/tmdb.js'
import BackButton from '../components/BackButton/BackButton.jsx'
import Button from '../components/Button/Button.jsx'
import StatusMessage from '../components/StatusMessage/StatusMessage.jsx'
import WatchlistForm from '../components/WatchlistForm/WatchlistForm.jsx'
import { useFetch } from '../hooks/useFetch.js'
import { useWatchlist } from '../hooks/useWatchlist.js'
import { toWatchlistSeries } from '../utils/watchlist.js'
import styles from './WatchlistFormPage.module.css'

const EMPTY_VALUES = { series: null, status: 'plan', score: '', notes: '' }

export default function WatchlistAddPage() {
  const navigate = useNavigate()
  const { entries, addEntry } = useWatchlist()

  // "Add to watchlist" on a series page links here with ?series=<id> to preselect it.
  const [searchParams] = useSearchParams()
  const seriesParam = searchParams.get('series')
  const presetId = /^\d+$/.test(seriesParam ?? '') ? seriesParam : null
  const preset = useFetch(presetId ? endpoints.seriesSummary(presetId) : null)

  function handleSubmit(data) {
    addEntry(data)
    navigate('/watchlist')
  }

  let content
  if (preset.status === 'loading') {
    content = <p className={styles.loading}>Loading series…</p>
  } else if (preset.status === 'error') {
    content = (
      <StatusMessage
        tone="error"
        title="Couldn't load that series"
        action={<Button onClick={preset.reload}>Try again</Button>}
      >
        {preset.error.message}
      </StatusMessage>
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
    <section>
      <title>Add to watchlist · Movietime</title>
      <BackButton />
      <h1 className={styles.title}>Add to watchlist</h1>
      {content}
    </section>
  )
}
