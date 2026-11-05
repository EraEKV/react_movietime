import { useId, useState } from 'react'
import { endpoints, imageUrl } from '../../api/tmdb'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useFetch } from '../../hooks/useFetch'
import { getYear } from '../../utils/format'
import type { Paginated, SeriesListItem } from '../../types/tmdb'
import type { WatchlistSeries } from '../../types/watchlist'
import { toWatchlistSeries } from '../../utils/watchlist'
import Button from '../Button/Button'
import fieldStyles from '../Field/Field.module.css'
import Icon from '../Icon/Icon'
import styles from './SeriesPicker.module.css'

const MAX_SUGGESTIONS = 6
const MIN_QUERY = 2

/**
 * Autocomplete over TMDB search. The typed text is local state; the chosen series
 * is owned by the parent form (`value` / `onChange`), so the form stays the single
 * source of truth for what will be submitted.
 */
interface SeriesPickerProps {
  value: WatchlistSeries | null
  onChange: (series: WatchlistSeries | null) => void
  invalid?: boolean
  errorId?: string
}

export default function SeriesPicker({
  value,
  onChange,
  invalid = false,
  errorId,
}: SeriesPickerProps) {
  const inputId = useId()
  const [text, setText] = useState('')
  const debounced = useDebouncedValue(text.trim())

  const shouldSearch = !value && debounced.length >= MIN_QUERY
  const { status, data } = useFetch<Paginated<SeriesListItem>>(
    shouldSearch ? endpoints.searchSeries({ query: debounced }) : null,
  )
  const suggestions = data?.results.slice(0, MAX_SUGGESTIONS) ?? []

  if (value) {
    const poster = imageUrl(value.posterPath, 'w92')
    return (
      <div className={styles.selected}>
        {poster && <img src={poster} alt="" />}
        <div className={styles.selectedText}>
          <strong>{value.name}</strong>
          <span>{getYear(value.firstAirDate) ?? 'Unknown year'}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
          Change
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.picker}>
      <label htmlFor={inputId} className="sr-only">
        Search series
      </label>
      <div className={fieldStyles.control}>
        <Icon name="search" size={18} className={fieldStyles.leading} />
        <input
          id={inputId}
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Start typing a title, e.g. Severance"
          autoComplete="off"
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
        />
      </div>

      {shouldSearch && (
        <div className={styles.dropdown} role="listbox" aria-label="Matching series">
          {status === 'loading' && <p className={styles.note}>Searching…</p>}
          {status === 'error' && (
            <p className={styles.note}>Search failed. Keep typing to retry.</p>
          )}
          {status === 'success' && suggestions.length === 0 && (
            <p className={styles.note}>No series found for “{debounced}”.</p>
          )}
          {suggestions.map((series) => (
            <button
              key={series.id}
              type="button"
              role="option"
              aria-selected="false"
              className={styles.option}
              onClick={() => {
                onChange(toWatchlistSeries(series))
                setText('')
              }}
            >
              {series.poster_path ? (
                <img src={imageUrl(series.poster_path, 'w92') ?? undefined} alt="" />
              ) : (
                <span className={styles.noPoster} />
              )}
              <span className={styles.optionName}>{series.name}</span>
              <span className={styles.optionYear}>{getYear(series.first_air_date)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
