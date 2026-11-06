import { useEffect, useState } from 'react'

/**
 * A value that clears itself after `ms` — for "Undo" toasts.
 * Showing a new value restarts the timer: the effect's cleanup clears the old one.
 */
export function useTimedState<T>(ms: number): [T | null, (value: T) => void, () => void] {
  const [value, setValue] = useState<T | null>(null)

  useEffect(() => {
    if (value === null) return
    const timerId = setTimeout(() => setValue(null), ms)
    return () => clearTimeout(timerId)
  }, [value, ms])

  return [value, setValue, () => setValue(null)]
}
