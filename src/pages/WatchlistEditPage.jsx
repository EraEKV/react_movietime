import { Link, useNavigate, useParams } from 'react-router'
import BackButton from '../components/BackButton/BackButton.jsx'
import StatusMessage from '../components/StatusMessage/StatusMessage.jsx'
import WatchlistForm from '../components/WatchlistForm/WatchlistForm.jsx'
import { useWatchlist } from '../hooks/useWatchlist.js'
import styles from './WatchlistFormPage.module.css'

export default function WatchlistEditPage() {
  const { entryId } = useParams()
  const navigate = useNavigate()
  const { entries, updateEntry } = useWatchlist()
  const entry = entries.find((e) => e.id === entryId)

  if (!entry) {
    return (
      <section>
        <BackButton />
        <StatusMessage
          title="Entry not found"
          action={
            <Link to="/watchlist" className={styles.link}>
              Open watchlist
            </Link>
          }
        >
          It may have been removed, possibly in another tab.
        </StatusMessage>
      </section>
    )
  }

  function handleSubmit({ status, score, notes }) {
    updateEntry(entry.id, { status, score, notes })
    navigate('/watchlist')
  }

  return (
    <section>
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
