import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import Button from '../components/Button/Button.jsx'
import Pagination from '../components/Pagination/Pagination.jsx'
import SelectField from '../components/SelectField/SelectField.jsx'
import StatusMessage from '../components/StatusMessage/StatusMessage.jsx'
import StatusTabs from '../components/StatusTabs/StatusTabs.jsx'
import Toast from '../components/Toast/Toast.jsx'
import WatchlistItem from '../components/WatchlistItem/WatchlistItem.jsx'
import { useWatchlist } from '../hooks/useWatchlist.js'
import { filterWatchlist, WATCH_STATUSES, WATCHLIST_SORTS } from '../utils/watchlist.js'
import styles from './WatchlistPage.module.css'

const PAGE_SIZE = 8
const UNDO_MS = 6000

export default function WatchlistPage() {
  const { entries, updateEntry, removeEntry, restoreEntry } = useWatchlist()

  // UI state for this page only — it lives here, not in the provider.
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('added')
  const [page, setPage] = useState(1)
  const [removed, setRemoved] = useState(null) // { entry, index } for "Undo"

  // Hide the undo toast after a while. A new removal restarts the timer (cleanup clears the old one).
  useEffect(() => {
    if (!removed) return
    const timerId = setTimeout(() => setRemoved(null), UNDO_MS)
    return () => clearTimeout(timerId)
  }, [removed])

  // Everything below is derived during render — no extra state to keep in sync.
  const filtered = filterWatchlist(entries, { search, status, sort })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages) // removing the last item of a page
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const tabs = [
    { value: 'all', label: 'All', count: entries.length },
    ...WATCH_STATUSES.map((s) => ({
      ...s,
      count: entries.filter((e) => e.status === s.value).length,
    })),
  ]

  // Both setters run in one event handler, so React batches them into a single re-render.
  function handleSearchChange(value) {
    setSearch(value)
    setPage(1)
  }

  function handleStatusChange(value) {
    setStatus(value)
    setPage(1)
  }

  function handleSortChange(value) {
    setSort(value)
    setPage(1)
  }

  function handleClearFilters() {
    setSearch('')
    setStatus('all')
    setPage(1)
  }

  function handleRemove(id) {
    const index = entries.findIndex((e) => e.id === id)
    setRemoved({ entry: entries[index], index })
    removeEntry(id)
  }

  function handleUndo() {
    restoreEntry(removed.entry, removed.index)
    setRemoved(null)
  }

  return (
    <section>
      <title>Watchlist · Movietime</title>

      <header className={styles.header}>
        <div>
          <h1>My watchlist</h1>
          <p className={styles.subtitle}>Saved in this browser · {entries.length} series</p>
        </div>
        <Link to="/watchlist/new" className={styles.addLink}>
          + Add series
        </Link>
      </header>

      {entries.length === 0 ? (
        <StatusMessage
          title="Your watchlist is empty"
          action={
            <div className={styles.emptyActions}>
              <Link to="/watchlist/new" className={styles.addLink}>
                Add your first series
              </Link>
              <Link to="/" className={styles.secondaryLink}>
                Browse series
              </Link>
            </div>
          }
        >
          Keep track of what you are watching, what you finished and how you rated it.
        </StatusMessage>
      ) : (
        <>
          <div className={styles.toolbar}>
            <StatusTabs
              label="Filter by status"
              tabs={tabs}
              value={status}
              onChange={handleStatusChange}
            />
            <div className={styles.controls}>
              <label className={styles.searchField}>
                <span className={styles.srOnly}>Search your watchlist</span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search your watchlist…"
                />
              </label>
              <SelectField
                label="Sort by"
                value={sort}
                options={WATCHLIST_SORTS}
                onChange={handleSortChange}
              />
            </div>
          </div>

          {visible.length === 0 ? (
            <StatusMessage
              title="Nothing matches"
              action={
                <Button variant="ghost" onClick={handleClearFilters}>
                  Clear search and filters
                </Button>
              }
            >
              No series in your watchlist match the current search and status.
            </StatusMessage>
          ) : (
            <>
              <ul className={styles.list}>
                {visible.map((entry) => (
                  // entry.id is created once with crypto.randomUUID() and never changes.
                  <li key={entry.id}>
                    <WatchlistItem
                      entry={entry}
                      onStatusChange={(id, value) => updateEntry(id, { status: value })}
                      onRemove={handleRemove}
                    />
                  </li>
                ))}
              </ul>
              <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </>
      )}

      {removed && (
        <Toast
          action={
            <Button variant="ghost" onClick={handleUndo}>
              Undo
            </Button>
          }
        >
          Removed “{removed.entry.name}”
        </Toast>
      )}
    </section>
  )
}
