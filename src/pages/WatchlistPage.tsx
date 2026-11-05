import { useEffect, useState } from 'react'
import Button from '../components/Button/Button'
import ButtonLink from '../components/ButtonLink/ButtonLink'
import EmptyState from '../components/EmptyState/EmptyState'
import Pagination from '../components/Pagination/Pagination'
import SelectField from '../components/SelectField/SelectField'
import Tabs, { type TabItem } from '../components/Tabs/Tabs'
import TextField from '../components/TextField/TextField'
import Toast from '../components/Toast/Toast'
import WatchlistItem from '../components/WatchlistItem/WatchlistItem'
import { useWatchlist } from '../hooks/useWatchlist'
import type { WatchlistEntry } from '../types/watchlist'
import {
  filterWatchlist,
  WATCH_STATUSES,
  WATCHLIST_SORTS,
  type StatusFilter,
  type WatchlistSort,
} from '../utils/watchlist'
import styles from './WatchlistPage.module.css'

const PAGE_SIZE = 8
const UNDO_MS = 6000

export default function WatchlistPage() {
  const { entries, updateEntry, removeEntry, restoreEntry } = useWatchlist()

  // UI state for this page only — it lives here, not in the provider.
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<WatchlistSort>('added')
  const [page, setPage] = useState(1)
  // The last removed entry and its position, for "Undo".
  const [removed, setRemoved] = useState<{ entry: WatchlistEntry; index: number } | null>(null)

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

  const tabs: TabItem<StatusFilter>[] = [
    { value: 'all', label: 'All', count: entries.length },
    ...WATCH_STATUSES.map((s) => ({
      ...s,
      count: entries.filter((e) => e.status === s.value).length,
    })),
  ]

  // Both setters run in one event handler, so React batches them into a single re-render.
  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleStatusChange(value: StatusFilter) {
    setStatus(value)
    setPage(1)
  }

  function handleSortChange(value: WatchlistSort) {
    setSort(value)
    setPage(1)
  }

  function handleClearFilters() {
    setSearch('')
    setStatus('all')
    setPage(1)
  }

  function handleRemove(id: string) {
    const index = entries.findIndex((e) => e.id === id)
    const entry = entries[index]
    if (!entry) return
    setRemoved({ entry, index })
    removeEntry(id)
  }

  function handleUndo() {
    if (!removed) return
    restoreEntry(removed.entry, removed.index)
    setRemoved(null)
  }

  return (
    <section className={styles.page}>
      <title>Library · Movietime</title>

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Library</h1>
          <p className={styles.subtitle}>Saved on this device · {entries.length} series</p>
        </div>
        <ButtonLink to="/watchlist/new" variant="primary" icon="plus">
          Add series
        </ButtonLink>
      </header>

      {entries.length === 0 ? (
        <EmptyState
          icon="bookmark"
          title="Your library is empty"
          body="Series you add appear here with your status, score and notes."
          actions={
            <ButtonLink to="/" variant="primary" icon="compass">
              Discover series
            </ButtonLink>
          }
        />
      ) : (
        <>
          <div className={styles.toolbar}>
            <Tabs
              label="Filter by status"
              items={tabs}
              value={status}
              onChange={handleStatusChange}
              panelId="library-results"
            />
            <div className={styles.controls}>
              <TextField
                label="Search your library"
                hideLabel
                type="search"
                icon="search"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search your library"
                autoComplete="off"
              />
              <SelectField
                label="Sort by"
                value={sort}
                options={WATCHLIST_SORTS}
                onChange={handleSortChange}
              />
            </div>
          </div>

          <div id="library-results" role="tabpanel">
            {visible.length === 0 ? (
              <EmptyState
                icon="search"
                title="Nothing matches"
                body="No series in your library match the current search and status."
                actions={<Button onClick={handleClearFilters}>Clear search and filters</Button>}
              />
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
          </div>
        </>
      )}

      {removed && (
        <Toast actionLabel="Undo" onAction={handleUndo}>
          Removed “{removed.entry.name}”
        </Toast>
      )}
    </section>
  )
}
