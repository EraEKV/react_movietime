import { useId, useState } from 'react'
import { endpoints, imageUrl } from '../../api/tmdb.js'
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js'
import { useFetch } from '../../hooks/useFetch.js'
import { getYear } from '../../utils/format.js'
import { toWatchlistSeries } from '../../utils/watchlist.js'
import styles from './SeriesPicker.module.css'

const MAX_SUGGESTIONS = 6
const MIN_QUERY = 2

/**
 * Autocomplete over TMDB search. The typed text is local state; the chosen series
 * is owned by the parent form (`value` / `onChange`), so the form stays the single
 * source of truth for what will be submitted.
 */
export default function SeriesPicker({ value, onChange, invalid = false, errorId }) {
  const inputId = useId()
  const [text, setText] = useState('')
  const debounced = useDebouncedValue(text.trim())

  const shouldSearch = !value && debounced.length >= MIN_QUERY
  const { status, data } = useFetch(
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
        <button type="button" className={styles.change} onClick={() => onChange(null)}>
          Change
        </button>
      </div>
    )
  }

  return (
    <div className={styles.picker}>
      <label htmlFor={inputId} className={styles.srOnly}>
        Search series
      </label>
      <input
        id={inputId}
        type="search"
        className={styles.input}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Start typing a title, e.g. Severance"
        autoComplete="off"
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
      />

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
                <img src={imageUrl(series.poster_path, 'w92')} alt="" />
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
