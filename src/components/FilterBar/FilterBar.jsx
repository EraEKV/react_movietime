import { RATING_OPTIONS, SORT_OPTIONS, STATUS_OPTIONS, YEAR_OPTIONS } from '../../utils/filters.js'
import Button from '../Button/Button.jsx'
import SelectField from '../SelectField/SelectField.jsx'
import styles from './FilterBar.module.css'

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
}) {
  const genreOptions = [
    { value: '', label: 'All genres' },
    ...genres.map((g) => ({ value: String(g.id), label: g.name })),
  ]

  return (
    <div className={styles.bar}>
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

      {searchMode && (
        <p className={styles.hint}>
          Search matches titles only — genre, rating, status and sorting apply when browsing.
        </p>
      )}

      {activeCount > 0 && (
        <Button variant="ghost" className={styles.reset} onClick={onReset}>
          Reset ({activeCount})
        </Button>
      )}
    </div>
  )
}
