import { useEffect, useState } from 'react'

/** Returns `value` once it has stopped changing for `delay` ms. */
export function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timerId = setTimeout(() => setDebounced(value), delay)
    // A new value before the delay ends cancels the pending update.
    return () => clearTimeout(timerId)
  }, [value, delay])

  return debounced
}
