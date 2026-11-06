import { useCallback, useEffect, useEffectEvent, useState } from 'react'

type Unsubscribe = () => void

/** Starts a realtime listener; may be async because the Firestore service loads lazily. */
export type Subscribe<T> = (
  onData: (data: T) => void,
  onError: (error: Error) => void,
) => Unsubscribe | Promise<Unsubscribe>

export type SubscriptionState<T> =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: null; error: null }
  | { status: 'error'; data: null; error: Error }
  | { status: 'success'; data: T; error: null }

interface Stored<T> {
  key: string | null
  data: T | null
  error: Error | null
}

/**
 * Keeps a realtime subscription (Firestore onSnapshot) open while `key` stays the same,
 * and exposes the latest snapshot as { status, data, error }. `null` key = no subscription.
 *
 * The same ideas as useRequest, for a stream instead of one response:
 * - cleanup unsubscribes, so leaving the page or changing the key never leaks a listener;
 * - if the component unmounts before the async subscribe() resolves, the listener is
 *   closed as soon as it exists (`cancelled`), and late snapshots are ignored;
 * - "loading" is derived: data stored for another key means the new one hasn't arrived.
 */
export function useSubscription<T>(
  baseKey: string | null,
  subscribe: Subscribe<T>,
): SubscriptionState<T> & { retry: () => void } {
  const [attempt, setAttempt] = useState(0)
  const [stored, setStored] = useState<Stored<T>>({ key: null, data: null, error: null })
  const start = useEffectEvent(subscribe)
  // A listener that failed is closed by Firestore; "Try again" opens a new one.
  const key = baseKey === null ? null : `${baseKey}#${attempt}`
  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  useEffect(() => {
    if (key === null) return
    let cancelled = false
    let unsubscribe: Unsubscribe | null = null

    const result = start(
      (data) => {
        if (!cancelled) setStored({ key, data, error: null })
      },
      (error) => {
        if (!cancelled) setStored({ key, data: null, error })
      },
    )
    Promise.resolve(result).then(
      (unsub) => {
        if (cancelled) unsub()
        else unsubscribe = unsub
      },
      (error: unknown) => {
        // The service chunk failed to load (offline on first visit, for example).
        if (!cancelled) setStored({ key, data: null, error: toError(error) })
      },
    )

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [key])

  return { ...toState(key, stored), retry }
}

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error))

function toState<T>(key: string | null, stored: Stored<T>): SubscriptionState<T> {
  if (key === null) return { status: 'idle', data: null, error: null }
  if (stored.key !== key) return { status: 'loading', data: null, error: null }
  if (stored.error) return { status: 'error', data: null, error: stored.error }
  return { status: 'success', data: stored.data as T, error: null }
}
