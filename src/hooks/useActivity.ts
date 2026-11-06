import type { ActivityItem } from '../types/activity'
import { useAuth } from './useAuth'
import { useSubscription } from './useSubscription'

/** How many records the profile shows. */
export const FEED_SIZE = 20

/**
 * The signed-in user's newest activity, live. Idle for guests: they have no feed
 * (nothing is recorded without an account). The service loads lazily with Firestore.
 */
export function useActivity() {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  return useSubscription<ActivityItem[]>(uid && `activity:${uid}`, async (onData, onError) => {
    const { watchActivity } = await import('../services/activityService')
    return watchActivity(uid ?? '', FEED_SIZE, onData, onError)
  })
}
