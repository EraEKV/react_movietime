import { useState } from 'react'
import type { Genre } from '../../types/tmdb'
import {
  DEFAULT_SORT,
  RATING_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  YEAR_OPTIONS,
  type FilterKey,
  type SeriesFilters,
} from '../../utils/filters'
import Banner from '../Banner/Banner'
import Button from '../Button/Button'
import FilterChip from '../Chip/FilterChip'
import BottomSheet from '../Dialog/BottomSheet'
import SelectField from '../SelectField/SelectField'
import styles from './FilterBar.module.css'

type ChangeHandler = (key: FilterKey | 'sort', value: string) => void

interface FilterBarProps {
  filters: SeriesFilters
  genres: Genre[]
  activeCount: number
  searchMode?: boolean
  onFilterChange: ChangeHandler
  onReset: () => void
}

/**
 * In search mode TMDB's /search/tv only supports a year filter, so the other
 * controls are disabled (with an explanation) instead of silently doing nothing.
 */
export default function FilterBar({
  filters,
  genres,
  activeCount,
  searchMode = false,
  onFilterChange,
  onReset,
}: FilterBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const genreOptions = [
    { value: '', label: 'All genres' },
    ...genres.map((g) => ({ value: String(g.id), label: g.name })),
  ]

  // Active filters as removable chips. Labels come from the same option lists as the selects.
  const labelOf = (options: { value: string; label: string }[], value: string) =>
    options.find((o) => o.value === value)?.label ?? value
  const chips: { key: FilterKey | 'sort'; label: string; reset: string }[] = [
    filters.genre && { key: 'genre', label: labelOf(genreOptions, filters.genre), reset: '' },
    filters.year && { key: 'year', label: filters.year, reset: '' },
    filters.rating && { key: 'rating', label: `Rating ${filters.rating}+`, reset: '' },
    filters.status && { key: 'status', label: labelOf(STATUS_OPTIONS, filters.status), reset: '' },
    filters.sort !== DEFAULT_SORT && {
      key: 'sort',
      label: labelOf(SORT_OPTIONS, filters.sort),
      reset: DEFAULT_SORT,
    },
  ].filter((chip): chip is { key: FilterKey | 'sort'; label: string; reset: string } =>
    Boolean(chip),
  )

  const fields = (
    <div className={styles.fields}>
      <SelectField
        label="Genre"
        disabled={searchMode}
        value={filters.genre}
        options={genreOptions}
        onChange={(value) => onFilterChange('genre', value)}
      />
      <SelectField
        label="Year"
        value={filters.year}
        options={YEAR_OPTIONS}
        onChange={(value) => onFilterChange('year', value)}
      />
      <SelectField
        label="Rating"
        disabled={searchMode}
        value={filters.rating}
        options={RATING_OPTIONS}
        onChange={(value) => onFilterChange('rating', value)}
      />
      <SelectField
        label="Status"
        disabled={searchMode}
        value={filters.status}
        options={STATUS_OPTIONS}
        onChange={(value) => onFilterChange('status', value)}
      />
      <SelectField
        label="Sort by"
        disabled={searchMode}
        value={filters.sort}
        options={SORT_OPTIONS}
        onChange={(value) => onFilterChange('sort', value)}
      />
    </div>
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
          {activeCount > 0 ? `Filters · ${activeCount}` : 'Filters'}
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
            Clear all
          </button>
        )}
      </div>

      {searchMode && (
        <Banner>
          Search matches titles only. Genre, rating, status and sorting apply when browsing.
        </Banner>
      )}

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filters"
        footer={
          <>
            {activeCount > 0 && (
              <Button variant="ghost" onClick={onReset}>
                Clear all
              </Button>
            )}
            <Button variant="primary" onClick={() => setSheetOpen(false)}>
              Show results
            </Button>
          </>
        }
      >
        {fields}
      </BottomSheet>
    </div>
  )
}
