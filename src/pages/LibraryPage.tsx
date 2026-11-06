import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import Banner from '../shared/ui/Banner/Banner'
import Button from '../shared/ui/Button/Button'
import ButtonLink from '../shared/ui/ButtonLink/ButtonLink'
import EmptyState from '../shared/ui/EmptyState/EmptyState'
import ErrorState from '../shared/ui/EmptyState/ErrorState'
import LibraryGrid from '../components/Library/LibraryGrid'
import LibrarySkeleton from '../components/Library/LibrarySkeleton'
import LibraryItem from '../components/LibraryItem/LibraryItem'
import Pagination from '../shared/ui/Pagination/Pagination'
import SegmentedControl from '../shared/ui/SegmentedControl/SegmentedControl'
import SelectField from '../shared/ui/SelectField/SelectField'
import Tabs, { type TabItem } from '../shared/ui/Tabs/Tabs'
import TextField from '../shared/ui/TextField/TextField'
import Toast from '../shared/ui/Toast/Toast'
import { useGenres } from '../hooks/useGenres'
import { useLibrary } from '../hooks/useLibrary'
import { useLibraryFilters } from '../hooks/useLibraryFilters'
import { useTimedState } from '../shared/hooks/useTimedState'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  librarySyncRetried,
  selectFilteredLibrary,
  selectLibraryCounts,
} from '../store/librarySlice'
import type { Option } from '../shared/types/common'
import type { LibraryEntry, LibraryStatus } from '../types/library'
import {
  LIBRARY_SORTS,
  LIBRARY_STATUSES,
  LIBRARY_TYPES,
  statusLabel,
  type StatusFilter,
} from '../utils/library'
import styles from './LibraryPage.module.css'

const PAGE_SIZE = 10
const UNDO_MS = 6000

interface UndoToast {
  text: string
  undo: () => void
}

export default function LibraryPage() {
  const { t } = useTranslation(['library', 'common'])
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
    return [{ value: '', label: t('allGenres') }, ...options]
  }, [entries, query.type, movieGenres, tvGenres, t])

  // Derived during render: no state to keep in sync.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(filters.page, totalPages) // e.g. after removing the last item of a page
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const tabs: TabItem<StatusFilter>[] = [
    { value: 'all', label: t('all'), count: counts.all },
    ...LIBRARY_STATUSES.map((s) => ({ ...s, count: counts[s.value] })),
  ]

  function handleStatusChange(entry: LibraryEntry, next: LibraryStatus) {
    const previous = entry.status
    void update(entry.key, { status: next })
    showToast({
      text: t('movedTo', { title: entry.title, status: statusLabel(next) }),
      undo: () => void update(entry.key, { status: previous }),
    })
  }

  function handleRemove(entry: LibraryEntry) {
    void remove(entry.key).then((removed) => {
      if (removed) {
        showToast({
          text: t('removedTitle', { title: entry.title }),
          undo: () => void restore(removed),
        })
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
        title={t('syncError')}
        body={t('syncErrorBody', { message: error ?? '' })}
        onRetry={() => dispatch(librarySyncRetried())}
      />
    )
  } else if (entries.length === 0) {
    body = (
      <EmptyState
        icon="bookmark"
        title={t('emptyTitle')}
        body={t('emptyBody')}
        actions={
          <ButtonLink to="/series" variant="primary" icon="compass">
            {t('discover')}
          </ButtonLink>
        }
      />
    )
  } else if (filtered.length === 0) {
    body = (
      <EmptyState
        icon="search"
        title={t('noMatchTitle')}
        body={t('noMatchBody')}
        actions={<Button onClick={filters.clearFilters}>{t('clearAll')}</Button>}
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
      <title>{t('pageTitle')}</title>

      <header>
        <h1 id="library-title" className={styles.title}>
          {t('title')}
        </h1>
        <p className={styles.subtitle}>
          {status === 'ready' ? t('common:count.titles', { count: counts.all }) : ' '}
        </p>
      </header>

      {isGuest && status === 'ready' && (
        <Banner
          action={
            <ButtonLink to="/login?redirect=/library" variant="primary" size="sm">
              {t('signIn')}
            </ButtonLink>
          }
        >
          {t('guestBanner')}
        </Banner>
      )}

      {status === 'ready' && entries.length > 0 && (
        <div className={styles.toolbar}>
          <Tabs
            label={t('filterByStatus')}
            items={tabs}
            value={query.status}
            onChange={filters.setStatus}
            panelId="library-results"
          />
          <div className={styles.controls}>
            <div className={styles.search}>
              <TextField
                label={t('search')}
                hideLabel
                type="search"
                icon="search"
                value={query.search}
                onChange={filters.setSearch}
                placeholder={t('search')}
                autoComplete="off"
              />
            </div>
            <SelectField
              label={t('type')}
              value={query.type}
              options={LIBRARY_TYPES}
              onChange={filters.setType}
            />
            <SelectField
              label={t('genre')}
              value={query.genre}
              options={genreOptions}
              onChange={filters.setGenre}
            />
            <SelectField
              label={t('sortBy')}
              value={query.sort}
              options={LIBRARY_SORTS}
              onChange={filters.setSort}
              className={styles.sort}
            />
            <div className={styles.view}>
              <SegmentedControl
                label={t('view')}
                value={view}
                onChange={filters.setView}
                options={[
                  { value: 'rows', label: t('rows'), icon: 'rows', hideLabel: true },
                  { value: 'grid', label: t('grid'), icon: 'grid', hideLabel: true },
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
          actionLabel={t('common:actions.undo')}
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
