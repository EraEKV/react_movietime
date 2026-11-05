import { useNavigate, useParams } from 'react-router'
import BackButton from '../components/BackButton/BackButton'
import ButtonLink from '../components/ButtonLink/ButtonLink'
import EmptyState from '../components/EmptyState/EmptyState'
import WatchlistForm from '../components/WatchlistForm/WatchlistForm'
import { useWatchlist } from '../hooks/useWatchlist'
import type { NewWatchlistEntry } from '../types/watchlist'
import styles from './WatchlistFormPage.module.css'

export default function WatchlistEditPage() {
  const { entryId: idParam } = useParams()
  const navigate = useNavigate()
  const { entries, updateEntry } = useWatchlist()
  const entry = entries.find((e) => e.id === idParam)

  if (!entry) {
    return (
      <section className={styles.page}>
        <BackButton />
        <EmptyState
          icon="bookmark"
          title="This entry isn’t in your library"
          body="It may have been removed, possibly in another tab."
          actions={
            <ButtonLink to="/watchlist" variant="primary" icon="bookmark">
              Go to library
            </ButtonLink>
          }
        />
      </section>
    )
  }

  // `entry` is defined here (checked above); capture the id for the handler.
  const entryId = entry.id

  function handleSubmit({ status, score, notes }: NewWatchlistEntry) {
    updateEntry(entryId, { status, score, notes })
    navigate('/watchlist')
  }

  return (
    <section className={styles.page}>
      <title>{`Edit ${entry.name} · Movietime`}</title>
      <BackButton />
      <h1 className={styles.title}>Edit “{entry.name}”</h1>
      <WatchlistForm
        key={entry.id}
        mode="edit"
        initialValues={{
          series: entry,
          status: entry.status,
          score: entry.score ? String(entry.score) : '',
          notes: entry.notes,
        }}
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
      />
    </section>
  )
}
