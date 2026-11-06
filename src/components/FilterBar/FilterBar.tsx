import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import type { Option } from '../../types/common'
import type { MediaType } from '../../types/media'
import type { Genre } from '../../types/tmdb'
import {
  DEFAULT_SORT,
  languageOptions,
  RATING_OPTIONS,
  RUNTIME_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  YEAR_OPTIONS,
  type CatalogFilters,
  type FilterKey,
} from '../../utils/filters'
import Banner from '../Banner/Banner'
import Button from '../Button/Button'
import FilterChip from '../Chip/FilterChip'
import BottomSheet from '../Dialog/BottomSheet'
import SelectField from '../SelectField/SelectField'
import styles from './FilterBar.module.css'

type ChangeKey = FilterKey | 'sort'

interface FilterBarProps {
  mediaType: MediaType
  filters: CatalogFilters
  genres: Genre[]
  activeCount: number
  /** Total results of the current request; null while loading or on error. */
  resultCount: number | null
  searchMode?: boolean
  onFilterChange: (key: ChangeKey, value: string) => void
  onReset: () => void
}

interface FilterChipData {
  key: ChangeKey
  label: string
  reset: string
}

const labelOf = (options: Option[], value: string) =>
  options.find((o) => o.value === value)?.label ?? value

/**
 * Five filters + sort: inline from tablet up, in a bottom sheet on phones.
 * Filters apply immediately (they live in the URL), so the sheet's button only closes it
 * and shows the live result count.
 *
 * In search mode TMDB's /search only supports a year filter, so the other controls are
 * disabled (with an explanation) instead of silently doing nothing.
 */
export default function FilterBar({
  mediaType,
  filters,
  genres,
  activeCount,
  resultCount,
  searchMode = false,
  onFilterChange,
  onReset,
}: FilterBarProps) {
  const { t } = useTranslation('catalog')
  const [sheetOpen, setSheetOpen] = useState(false)
  const isMovie = mediaType === 'movie'
  const languages = languageOptions()

  const genreOptions: Option[] = [
    { value: '', label: t('filters.allGenres') },
    ...genres.map((g) => ({ value: String(g.id), label: g.name })),
  ]

  // Active filters as removable chips. Labels come from the same option lists as the selects.
  const chips = [
    filters.genre && { key: 'genre', label: labelOf(genreOptions, filters.genre), reset: '' },
    filters.year && { key: 'year', label: filters.year, reset: '' },
    filters.rating && {
      key: 'rating',
      label: t('filters.ratingChip', { value: filters.rating }),
      reset: '',
    },
    filters.lang && { key: 'lang', label: labelOf(languages, filters.lang), reset: '' },
    filters.status && { key: 'status', label: labelOf(STATUS_OPTIONS, filters.status), reset: '' },
    filters.runtime && {
      key: 'runtime',
      label: labelOf(RUNTIME_OPTIONS, filters.runtime),
      reset: '',
    },
    filters.sort !== DEFAULT_SORT && {
      key: 'sort',
      label: labelOf(SORT_OPTIONS, filters.sort),
      reset: DEFAULT_SORT,
    },
  ]
    .filter((chip): chip is FilterChipData => Boolean(chip))
    // While searching only the year is applied, so other chips would claim a filter that isn't.
    .filter((chip) => !searchMode || chip.key === 'year')
  const shownCount = searchMode ? chips.length : activeCount

  const resultLabel = resultCount === null ? null : t('filters.results', { count: resultCount })

  const fields = (
    <div className={styles.fields}>
      <SelectField
        label={t('filters.genre')}
        disabled={searchMode}
        value={filters.genre}
        options={genreOptions}
        onChange={(value) => onFilterChange('genre', value)}
      />
      <SelectField
        label={t('filters.year')}
        value={filters.year}
        options={YEAR_OPTIONS}
        onChange={(value) => onFilterChange('year', value)}
      />
      <SelectField
        label={t('filters.rating')}
        disabled={searchMode}
        value={filters.rating}
        options={RATING_OPTIONS}
        onChange={(value) => onFilterChange('rating', value)}
      />
      <SelectField
        label={t('filters.language')}
        disabled={searchMode}
        value={filters.lang}
        options={languages}
        onChange={(value) => onFilterChange('lang', value)}
      />
      {isMovie ? (
        <SelectField
          label={t('filters.runtime')}
          disabled={searchMode}
          value={filters.runtime}
          options={RUNTIME_OPTIONS}
          onChange={(value) => onFilterChange('runtime', value)}
        />
      ) : (
        <SelectField
          label={t('filters.status')}
          disabled={searchMode}
          value={filters.status}
          options={STATUS_OPTIONS}
          onChange={(value) => onFilterChange('status', value)}
        />
      )}
      <SelectField
        label={t('filters.sort')}
        disabled={searchMode}
        value={filters.sort}
        options={SORT_OPTIONS}
        onChange={(value) => onFilterChange('sort', value)}
      />
    </div>
  )

  const searchBanner = searchMode && (
    <Banner>{t(isMovie ? 'filters.searchBannerMovie' : 'filters.searchBannerTv')}</Banner>
  )

  return (
    <div className={styles.bar}>
      <div className={styles.inline}>{fields}</div>

      <div className={styles.summary}>
        <Button
          icon="filter"
          className={styles.sheetButton}
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
        >
          {shownCount > 0 ? t('filters.withCount', { count: shownCount }) : t('filters.title')}
        </Button>
        {chips.map((chip) => (
          <FilterChip
            key={chip.key}
            label={chip.label}
            onRemove={() => onFilterChange(chip.key, chip.reset)}
          />
        ))}
        {chips.length > 1 && (
          <button type="button" className={styles.clear} onClick={onReset}>
            {t('filters.clearAll')}
          </button>
        )}
        {/* aria-live: the count is announced when results change after typing or filtering. */}
        <p className={styles.count} aria-live="polite">
          {resultLabel}
        </p>
      </div>

      {searchBanner}

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t('filters.title')}
        footer={
          <>
            {activeCount > 0 && (
              <Button variant="ghost" onClick={onReset}>
                {t('filters.clearAll')}
              </Button>
            )}
            <Button variant="primary" className={styles.apply} onClick={() => setSheetOpen(false)}>
              {resultLabel ? t('filters.show', { results: resultLabel }) : t('filters.showResults')}
            </Button>
          </>
        }
      >
        {searchBanner}
        {fields}
      </BottomSheet>
    </div>
  )
}
