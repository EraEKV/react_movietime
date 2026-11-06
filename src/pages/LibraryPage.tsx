import { useMemo } from 'react'
import Banner from '../components/Banner/Banner'
import Button from '../components/Button/Button'
import ButtonLink from '../components/ButtonLink/ButtonLink'
import EmptyState from '../components/EmptyState/EmptyState'
import ErrorState from '../components/EmptyState/ErrorState'
import LibraryGrid from '../components/Library/LibraryGrid'
import LibrarySkeleton from '../components/Library/LibrarySkeleton'
import LibraryItem from '../components/LibraryItem/LibraryItem'
import Pagination from '../components/Pagination/Pagination'
import SegmentedControl from '../components/SegmentedControl/SegmentedControl'
import SelectField from '../components/SelectField/SelectField'
import Tabs, { type TabItem } from '../components/Tabs/Tabs'
import TextField from '../components/TextField/TextField'
import Toast from '../components/Toast/Toast'
import { useGenres } from '../hooks/useGenres'
import { useLibrary } from '../hooks/useLibrary'
import { useLibraryFilters } from '../hooks/useLibraryFilters'
import { useTimedState } from '../hooks/useTimedState'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  librarySyncRetried,
  selectFilteredLibrary,
  selectLibraryCounts,
} from '../store/librarySlice'
import type { Option } from '../types/common'
import type { LibraryEntry, LibraryStatus } from '../types/library'
import { LIBRARY_SORTS, LIBRARY_STATUSES, LIBRARY_TYPES, type StatusFilter } from '../utils/library'
import styles from './LibraryPage.module.css'

const PAGE_SIZE = 10
const UNDO_MS = 6000

interface UndoToast {
  text: string
  undo: () => void
}

export default function LibraryPage() {
  const dispatch = useAppDispatch()
  const { entries, status, error, isGuest, update, remove, restore } = useLibrary()
  const filters = useLibraryFilters()
  const { query, view } = filters
  // Memoized selectors: counts and the filtered list are recomputed only when entries or
  // one of the query values change, not on every render of this page.
  const counts = useAppSelector(selectLibraryCounts)
  const filtered = useAppSelector((state) => selectFilteredLibrary(state, query))
  const [toast, showToast, hideToast] = useTimedState<UndoToast>(UNDO_MS)

  // Movie and TV genres are two TMDB lists; the filter offers only genres that occur
  // in the library, named from both lists.
  const movieGenres = useGenres('movie').genresById
  const tvGenres = useGenres('tv').genresById
  const genreOptions = useMemo(() => {
    const names = new Map([...tvGenres, ...movieGenres])
    const ids = new Set(
      entries
        .filter((e) => query.type === 'all' || e.mediaType === query.type)
        .flatMap((e) => e.genreIds),
    )
    const options: Option[] = [...ids]
      .filter((id) => names.has(id))
      .map((id) => ({ value: String(id), label: names.get(id) ?? '' }))
      .sort((a, b) => a.label.localeCompare(b.label))
    return [{ value: '', label: 'All genres' }, ...options]
  }, [entries, query.type, movieGenres, tvGenres])

  // Derived during render: no state to keep in sync.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(filters.page, totalPages) // e.g. after removing the last item of a page
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const tabs: TabItem<StatusFilter>[] = [
    { value: 'all', label: 'All', count: counts.all },
    ...LIBRARY_STATUSES.map((s) => ({ ...s, count: counts[s.value] })),
  ]

  function handleStatusChange(entry: LibraryEntry, next: LibraryStatus) {
    const previous = entry.status
    void update(entry.key, { status: next })
    showToast({
      text: `“${entry.title}” moved to ${LIBRARY_STATUSES.find((s) => s.value === next)?.label}`,
      undo: () => void update(entry.key, { status: previous }),
    })
  }

  function handleRemove(entry: LibraryEntry) {
    void remove(entry.key).then((removed) => {
      if (removed) {
        showToast({ text: `Removed “${entry.title}”`, undo: () => void restore(removed) })
      }
    })
  }

  function handlePageChange(next: number) {
    filters.setPage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  let body
  if (status === 'loading') {
    body = <LibrarySkeleton />
  } else if (status === 'error') {
    body = (
      <ErrorState
        title="We couldn’t sync your library"
        body={`${error ?? ''} Nothing is shown rather than something out of date.`}
        onRetry={() => dispatch(librarySyncRetried())}
      />
    )
  } else if (entries.length === 0) {
    body = (
      <EmptyState
        icon="bookmark"
        title="Your library is empty"
        body="Add movies and series you want to watch, are watching or finished. They show up here with your status, score and progress."
        actions={
          <ButtonLink to="/series" variant="primary" icon="compass">
            Discover titles
          </ButtonLink>
        }
      />
    )
  } else if (filtered.length === 0) {
    body = (
      <EmptyState
        icon="search"
        title="Nothing matches"
        body="No titles in your library match this search and these filters."
        actions={<Button onClick={filters.clearFilters}>Clear search and filters</Button>}
      />
    )
  } else {
    body = (
      <>
        {view === 'grid' ? (
          <LibraryGrid entries={visible} />
        ) : (
          <ul className={styles.list}>
            {visible.map((entry) => (
              // The media key is unique per title and never changes.
              <li key={entry.key}>
                <LibraryItem
                  entry={entry}
                  onStatusChange={handleStatusChange}
                  onRemove={handleRemove}
                />
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
      </>
    )
  }

  return (
    <section className={styles.page} aria-labelledby="library-title">
      <title>Library · Movietime</title>

      <header>
        <h1 id="library-title" className={styles.title}>
          Library
        </h1>
        <p className={styles.subtitle}>
          {status === 'ready' ? `${counts.all} ${counts.all === 1 ? 'title' : 'titles'}` : ' '}
        </p>
      </header>

      {isGuest && status === 'ready' && (
        <Banner
          action={
            <ButtonLink to="/login?redirect=/library" variant="primary" size="sm">
              Sign in
            </ButtonLink>
          }
        >
          Saved on this device. Sign in to sync across your phone and laptop.
        </Banner>
      )}

      {status === 'ready' && entries.length > 0 && (
        <div className={styles.toolbar}>
          <Tabs
            label="Filter by status"
            items={tabs}
            value={query.status}
            onChange={filters.setStatus}
            panelId="library-results"
          />
          <div className={styles.controls}>
            <div className={styles.search}>
              <TextField
                label="Search your library"
                hideLabel
                type="search"
                icon="search"
                value={query.search}
                onChange={filters.setSearch}
                placeholder="Search your library"
                autoComplete="off"
              />
            </div>
            <SelectField
              label="Type"
              value={query.type}
              options={LIBRARY_TYPES}
              onChange={filters.setType}
            />
            <SelectField
              label="Genre"
              value={query.genre}
              options={genreOptions}
              onChange={filters.setGenre}
            />
            <SelectField
              label="Sort by"
              value={query.sort}
              options={LIBRARY_SORTS}
              onChange={filters.setSort}
              className={styles.sort}
            />
            <div className={styles.view}>
              <SegmentedControl
                label="View"
                value={view}
                onChange={filters.setView}
                options={[
                  { value: 'rows', label: 'Rows', icon: 'rows', hideLabel: true },
                  { value: 'grid', label: 'Grid', icon: 'grid', hideLabel: true },
                ]}
              />
            </div>
          </div>
        </div>
      )}

      <div id="library-results" role="tabpanel" aria-labelledby="library-title">
        {body}
      </div>

      {toast && (
        <Toast
          actionLabel="Undo"
          actionIcon="undo"
          onAction={() => {
            toast.undo()
            hideToast()
          }}
        >
          {toast.text}
        </Toast>
      )}
    </section>
  )
}
