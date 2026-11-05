import { useCallback, useEffect, useState } from 'react'
import { isAbortError, tmdbGet } from '../api/tmdb'

interface StoredResult<T> {
  key: string | null
  data: T | null
  error: Error | null
}

export type FetchState<T> =
  | { status: 'idle'; data: null; error: null; reload: () => void }
  | { status: 'loading'; data: null; error: null; reload: () => void }
  | { status: 'error'; data: null; error: Error; reload: () => void }
  | { status: 'success'; data: T; error: null; reload: () => void }

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error))

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
 * - The result is a discriminated union: after checking `status === 'success'`,
 *   TypeScript knows `data` is `T` and not null.
 */
export function useFetch<T>(path: string | null): FetchState<T> {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<StoredResult<T>>({ key: null, data: null, error: null })

  const key = path === null ? null : `${path}#${attempt}`

  useEffect(() => {
    if (path === null) return

    const requestKey = `${path}#${attempt}`
    const controller = new AbortController()
    let ignore = false

    tmdbGet<T>(path, { signal: controller.signal })
      .then((data) => {
        if (!ignore) setResult({ key: requestKey, data, error: null })
      })
      .catch((error: unknown) => {
        if (!ignore && !isAbortError(error)) {
          setResult({ key: requestKey, data: null, error: toError(error) })
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
  return { status: 'success', data: result.data as T, error: null, reload }
}
