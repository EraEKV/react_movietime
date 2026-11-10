import type * as NotificationsService from '../services/notificationsService'
import type { AppNotification } from '../types/notifications'
import { useSubscription } from '../shared/hooks/useSubscription'
import { normalizeEmail } from '../utils/sharing'
import { useAuth } from './useAuth'

/** Loaded on first use, like the other services: keeps Firestore out of the main chunk. */
const loadNotificationsService = (): Promise<typeof NotificationsService> =>
  import('../services/notificationsService')

/**
 * The signed-in user's notifications, live, plus the actions on them. Notifications
 * addressed to an email are watched only for a verified one (the rules answer an unverified
 * token with permission-denied: they belong to whoever proves the email); the ones addressed
 * to the uid need only the sign-in.
 */
export function useNotifications() {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const email = user?.emailVerified && user.email ? normalizeEmail(user.email) : null
  const state = useSubscription<AppNotification[]>(
    uid && `notifications:${uid}:${email ?? ''}`,
    async (onData, onError) => {
      const { watchNotifications } = await loadNotificationsService()
      return watchNotifications({ uid: uid ?? '', email }, onData, onError)
    },
  )
  const items = state.data ?? []

  return {
    status: state.status,
    items,
    unread: items.filter((item) => !item.read).length,
    retry: state.retry,
    markRead: async (id: string) => (await loadNotificationsService()).markRead(id),
    markAllRead: async () =>
      (await loadNotificationsService()).markAllRead(
        items.filter((item) => !item.read).map((item) => item.id),
      ),
    decline: async (notification: AppNotification) => {
      if (!email) throw new Error('Sign in to decline.')
      return (await loadNotificationsService()).decline(notification, email)
    },
  }
}
