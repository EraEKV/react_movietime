import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import AddToListDialog from '../components/AddToList/AddToListDialog'
import Button from '../shared/ui/Button/Button'
import EmptyState from '../shared/ui/EmptyState/EmptyState'
import ErrorState from '../shared/ui/EmptyState/ErrorState'
import FilterBar from '../components/FilterBar/FilterBar'
import IconButton from '../shared/ui/IconButton/IconButton'
import MediaGrid from '../components/MediaGrid/MediaGrid'
import Pagination from '../shared/ui/Pagination/Pagination'
import SearchBar from '../shared/ui/SearchBar/SearchBar'
import SegmentedControl from '../shared/ui/SegmentedControl/SegmentedControl'
import SkeletonGrid from '../components/PosterCard/SkeletonGrid'
import { useAuth } from '../hooks/useAuth'
import { useCatalog } from '../hooks/useCatalog'
import { useCatalogFilters } from '../hooks/useCatalogFilters'
import { useGenres } from '../hooks/useGenres'
import type { MediaSummary, MediaType } from '../types/media'
import { PAGE_SIZE_OPTIONS, parsePageSize } from '../utils/catalog'
import { sharedCatalogParams } from '../utils/filters'
import { summaryToListMedia } from '../utils/lists'
import styles from './CatalogPage.module.css'

/** Router state is untyped (any page can push anything), so check its shape before trusting it. */
function wantsSearchFocus(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    'focusSearch' in state &&
    state.focusSearch === true
  )
}

const PATHS = { movie: '/movies', tv: '/series' } as const

/**
 * Serves both /movies and /series; the route passes the media type.
 * App renders it with key={mediaType}, so switching catalogs mounts a fresh page
 * instead of carrying over local state (like the search input) from the other one.
 */
export default function CatalogPage({ mediaType }: { mediaType: MediaType }) {
  const { t } = useTranslation('catalog')
  const {
    filters,
    query,
    page,
    size,
    activeCount,
    setFilter,
    setQuery,
    setPage,
    setSize,
    resetFilters,
  } = useCatalogFilters(mediaType)
  const { genres, genresById } = useGenres(mediaType)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  // The header's mobile search button navigates here with { focusSearch: true }.
  const location = useLocation()
  const focusSearch = wantsSearchFocus(location.state)
  const { isAuthenticated } = useAuth()
  // One dialog for the whole grid: the card only says which title was picked.
  const [listFor, setListFor] = useState<MediaSummary | null>(null)

  // TMDB can't combine text search with discover filters, so a query switches the endpoint.
  const searchMode = query !== ''

  // The request key changes whenever query, filters, page or size change → the hook
  // re-runs its effect, and its cleanup aborts the previous request so older results can't win.
  const { status, data, error, reload } = useCatalog({ mediaType, filters, query, page, size })

  function handlePageChange(nextPage: number) {
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Movies ⇄ Series keeps what makes sense on both sides (query, year, rating, language…).
  function switchCatalog(next: MediaType) {
    const search = sharedCatalogParams(searchParams).toString()
    navigate({ pathname: PATHS[next], search: search ? `?${search}` : '' })
  }

  return (
    <section className={styles.page} aria-labelledby="catalog-title">
      <header className={styles.header}>
        <h1 id="catalog-title" className={styles.title}>
          {searchMode ? t('resultsFor', { query }) : t(`type.${mediaType}.title`)}
        </h1>
        <SegmentedControl
          label={t('catalogType')}
          value={mediaType}
          onChange={switchCatalog}
          options={[
            { value: 'movie', label: t('type.movie.title'), icon: 'film' },
            { value: 'tv', label: t('type.tv.title'), icon: 'tv' },
          ]}
        />
      </header>

      <SearchBar
        query={query}
        onSearch={setQuery}
        label={t(`type.${mediaType}.search`)}
        placeholder={t(`type.${mediaType}.placeholder`)}
        autoFocus={focusSearch}
      />

      <FilterBar
        mediaType={mediaType}
        filters={filters}
        genres={genres}
        activeCount={activeCount}
        resultCount={status === 'success' ? data.totalResults : null}
        searchMode={searchMode}
        onFilterChange={setFilter}
        onReset={resetFilters}
      />

      {(status === 'idle' || status === 'loading') && (
        <SkeletonGrid count={size} label={t(`type.${mediaType}.loading`)} />
      )}

      {status === 'error' && (
        <ErrorState
          title={t(`type.${mediaType}.error`)}
          body={t('errorKept', { message: error.message })}
          onRetry={reload}
        />
      )}

      {status === 'success' && data.items.length === 0 && (
        <EmptyResults
          mediaType={mediaType}
          searchMode={searchMode}
          query={query}
          hasFilters={activeCount > 0}
          page={page}
          onClearSearch={() => setQuery('')}
          onResetFilters={resetFilters}
          onFirstPage={() => handlePageChange(1)}
        />
      )}

      {status === 'success' && data.items.length > 0 && (
        <div>
          <h2 className="sr-only">{t('results')}</h2>
          <MediaGrid
            items={data.items}
            genresById={genresById}
            label={t(`type.${mediaType}.title`)}
            renderActions={
              // Lists need an account; guests use the title page's "Add to list" (→ sign in).
              isAuthenticated
                ? (item) => (
                    <IconButton
                      icon="list"
                      label={t('addToList', { title: item.title })}
                      variant="secondary"
                      size="sm"
                      onClick={() => setListFor(item)}
                    />
                  )
                : undefined
            }
          />
          <Pagination
            page={page}
            totalPages={data.totalPages}
            onPageChange={handlePageChange}
            pageSize={{
              value: `${size}`,
              options: PAGE_SIZE_OPTIONS,
              onChange: (value) => setSize(parsePageSize(value)),
            }}
          />
        </div>
      )}

      {listFor && (
        <AddToListDialog media={summaryToListMedia(listFor)} onClose={() => setListFor(null)} />
      )}
    </section>
  )
}

interface EmptyResultsProps {
  mediaType: MediaType
  searchMode: boolean
  query: string
  hasFilters: boolean
  page: number
  onClearSearch: () => void
  onResetFilters: () => void
  onFirstPage: () => void
}

/** Picks the most useful empty-state message and action for the current mode. */
function EmptyResults({
  mediaType,
  searchMode,
  query,
  hasFilters,
  page,
  onClearSearch,
  onResetFilters,
  onFirstPage,
}: EmptyResultsProps) {
  const { t } = useTranslation('catalog')
  if (searchMode) {
    return (
      <EmptyState
        icon="search"
        title={t('empty.searchTitle', { query })}
        body={t('empty.searchBody')}
        actions={<Button onClick={onClearSearch}>{t('empty.clearSearch')}</Button>}
      />
    )
  }

  if (hasFilters) {
    return (
      <EmptyState
        icon="filter"
        title={t(`type.${mediaType}.noMatch`)}
        body={t('empty.filtersBody')}
        actions={
          <Button variant="primary" onClick={onResetFilters}>
            {t('empty.clearFilters')}
          </Button>
        }
      />
    )
  }

  return (
    <EmptyState
      title={t(`type.${mediaType}.nonePage`)}
      body={t('empty.pageBody')}
      actions={page > 1 && <Button onClick={onFirstPage}>{t('empty.firstPage')}</Button>}
    />
  )
}
