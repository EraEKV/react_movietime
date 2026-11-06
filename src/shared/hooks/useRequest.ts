import { useCallback, useEffect, useEffectEvent, useState } from 'react'
import { isAbortError } from '../api/tmdb'

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
 * Runs `load` whenever `key` changes and exposes { status, data, error, reload }.
 * `key` is a string that describes the request (usually the TMDB path); `null` skips it.
 *
 * - The effect depends only on `key` (a string) and `attempt`, so it re-runs exactly
 *   when the request changes — not on every render.
 * - `load` is read through an Effect Event: the effect always calls the latest one
 *   without listing it as a dependency (a new function every render would refetch forever).
 * - Cleanup aborts the in-flight request and sets `ignore`, so a slow response for an old
 *   key can never overwrite the result of a newer one (race condition).
 * - "loading" is derived during render: if the stored result belongs to another
 *   request key, the current one is still in flight. No setState(true) in the effect.
 * - The result is a discriminated union: after checking `status === 'success'`,
 *   TypeScript knows `data` is `T` and not null.
 */
export function useRequest<T>(
  key: string | null,
  load: (key: string, signal: AbortSignal) => Promise<T>,
): FetchState<T> {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<StoredResult<T>>({ key: null, data: null, error: null })
  const runLoad = useEffectEvent(load)

  const requestKey = key === null ? null : `${key}#${attempt}`

  useEffect(() => {
    if (key === null) return

    const currentKey = `${key}#${attempt}`
    const controller = new AbortController()
    let ignore = false

    runLoad(key, controller.signal)
      .then((data) => {
        if (!ignore) setResult({ key: currentKey, data, error: null })
      })
      .catch((error: unknown) => {
        if (!ignore && !isAbortError(error)) {
          setResult({ key: currentKey, data: null, error: toError(error) })
        }
      })

    return () => {
      ignore = true
      controller.abort()
    }
  }, [key, attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])

  if (requestKey === null) return { status: 'idle', data: null, error: null, reload }
  if (result.key !== requestKey) return { status: 'loading', data: null, error: null, reload }
  if (result.error) return { status: 'error', data: null, error: result.error, reload }
  return { status: 'success', data: result.data as T, error: null, reload }
}
