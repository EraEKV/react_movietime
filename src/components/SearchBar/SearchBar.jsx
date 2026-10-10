import { useEffect, useEffectEvent, useId, useState } from 'react'
import styles from './SearchBar.module.css'

const DEBOUNCE_MS = 400

/**
 * Controlled search input with a debounced commit.
 *
 * `value` is what the user types (updates on every keystroke).
 * `query` is the committed search that lives in the URL (updates after a pause).
 */
export default function SearchBar({ query, onSearch, placeholder = 'Search TV series…' }) {
  const id = useId()
  const [value, setValue] = useState(query)

  // The last query this input knows about — either received from the URL or committed by us.
  // If the URL changes to something else (back button, a link), it came from outside:
  // adjust the input during render instead of in an effect, so it never shows a stale value.
  const [lastQuery, setLastQuery] = useState(query)
  if (query !== lastQuery) {
    setLastQuery(query)
    setValue(query)
  }

  function commit(nextQuery) {
    setLastQuery(nextQuery)
    onSearch(nextQuery)
  }

  // An Effect Event always sees the latest onSearch, without becoming an effect dependency —
  // otherwise every parent re-render (e.g. results arriving) would restart the debounce timer.
  const onDebounced = useEffectEvent((nextQuery) => commit(nextQuery))

  useEffect(() => {
    const nextQuery = value.trim()
    if (nextQuery === query) return

    const timerId = setTimeout(() => onDebounced(nextQuery), DEBOUNCE_MS)
    // Cleanup runs before the next keystroke's effect: only the last pause triggers a search.
    return () => clearTimeout(timerId)
  }, [value, query])

  function handleSubmit(e) {
    e.preventDefault()
    // Enter searches immediately instead of waiting for the debounce.
    const nextQuery = value.trim()
    if (nextQuery !== query) commit(nextQuery)
  }

  function handleClear() {
    setValue('')
    commit('')
  }

  return (
    <form role="search" className={styles.form} onSubmit={handleSubmit}>
      <label htmlFor={id} className={styles.srOnly}>
        Search TV series
      </label>
      <span className={styles.icon} aria-hidden="true">
        ⌕
      </span>
      <input
        id={id}
        type="search"
        className={styles.input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck="false"
      />
      {value && (
        <button
          type="button"
          className={styles.clear}
          onClick={handleClear}
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </form>
  )
}
