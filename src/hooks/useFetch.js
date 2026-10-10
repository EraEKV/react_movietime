import { useCallback, useEffect, useState } from 'react'
import { tmdbGet } from '../api/tmdb.js'

const EMPTY = { key: null, data: null, error: null }

/**
 * Loads a TMDB path and exposes { status, data, error, reload }.
 *
 * - The effect depends only on `path` (a string) and `attempt`, so it re-runs
 *   exactly when the request changes.
 * - Cleanup aborts the in-flight request and sets `ignore`, so a slow response
 *   for an old path can never overwrite the result of a newer one (race condition).
 * - "loading" is derived during render: if the stored result belongs to another
 *   request key, the current one is still in flight. No setState(true) in the effect.
 * - Pass `null` as path to skip fetching.
 */
export function useFetch(path) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(EMPTY)

  const key = path === null ? null : `${path}#${attempt}`

  useEffect(() => {
    if (path === null) return

    const requestKey = `${path}#${attempt}`
    const controller = new AbortController()
    let ignore = false

    tmdbGet(path, { signal: controller.signal })
      .then((data) => {
        if (!ignore) setResult({ key: requestKey, data, error: null })
      })
      .catch((error) => {
        if (!ignore && error.name !== 'AbortError') {
          setResult({ key: requestKey, data: null, error })
        }
      })

    return () => {
      ignore = true
      controller.abort()
    }
  }, [path, attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])

  if (key === null) return { status: 'idle', data: null, error: null, reload }
  if (result.key !== key) return { status: 'loading', data: null, error: null, reload }
  if (result.error) return { status: 'error', data: null, error: result.error, reload }
  return { status: 'success', data: result.data, error: null, reload }
}
