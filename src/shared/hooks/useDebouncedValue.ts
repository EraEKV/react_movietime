import { useEffect, useState } from 'react'

/** Returns `value` once it has stopped changing for `delay` ms. */
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timerId = setTimeout(() => setDebounced(value), delay)
    // A new value before the delay ends cancels the pending update.
    return () => clearTimeout(timerId)
  }, [value, delay])

  return debounced
}
