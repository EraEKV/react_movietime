import { useMemo } from 'react'
import type * as ListsService from '../services/listsService'
import type { ListAuthor, ListItem, ListRole, TitleList } from '../types/list'
import { normalizeEmail, roleOf } from '../utils/sharing'
import { useAuth } from './useAuth'
import { useSubscription } from '../shared/hooks/useSubscription'

// Lists are loaded per page (not kept in Redux): only the page that shows them needs them,
// and a Firestore listener closes when that page unmounts.

/**
 * The service and the Firestore SDK load on first use. The type-only import above keeps
 * them out of the main chunk, even for components that are part of it.
 */
export const loadListsService = (): Promise<typeof ListsService> =>
  import('../services/listsService')

/** The signed-in user as the author of lists and items. */
export function useListAuthor(): ListAuthor | null {
  const { user } = useAuth()
  return useMemo(
    () =>
      user
        ? { uid: user.uid, name: user.displayName || user.email?.split('@')[0] || 'Someone' }
        : null,
    [user],
  )
}

/** The signed-in user's lists, live. Idle for guests. */
export function useMyLists() {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  return useSubscription<TitleList[]>(uid && `my-lists:${uid}`, async (onData, onError) => {
    const service = await loadListsService()
    return service.watchMyLists(uid ?? '', onData, onError)
  })
}

/**
 * Lists other people shared with the signed-in user, live. Idle for guests and for
 * unverified emails: the rules grant member access only to verified emails, so the query
 * would be rejected anyway. `needsVerification` lets the page explain that.
 */
export function useSharedLists() {
  const { user } = useAuth()
  const email = user?.emailVerified && user.email ? normalizeEmail(user.email) : null
  const lists = useSubscription<TitleList[]>(
    email && `shared-lists:${email}`,
    async (onData, onError) =>
      (await loadListsService()).watchSharedLists(email ?? '', onData, onError),
  )
  return { ...lists, email, needsVerification: Boolean(user && !user.emailVerified) }
}

export type ListState =
  | { status: 'loading'; retry: () => void }
  | { status: 'error'; error: Error; retry: () => void }
  /** Missing, deleted or not readable by this user: the page shows "not found" for all three. */
  | { status: 'missing'; retry: () => void }
  | {
      status: 'ready'
      list: TitleList
      items: ListItem[] | null
      itemsError: Error | null
      role: ListRole
      retry: () => void
    }

const isPermissionDenied = (error: Error) =>
  'code' in error && (error as { code: unknown }).code === 'permission-denied'

/**
 * One list and its items, both live, plus the current user's role. Two listeners: the
 * header renders as soon as the list arrives, items fill in after.
 */
export function useList(id: string): ListState {
  const { user, status } = useAuth()
  // The page is public (link visitors), so it opens before Firebase restores the session.
  // Waiting for auth and keying by who is reading avoids a wrong "not found" for a member
  // and reopens the listener with the new credentials after sign-in or email verification.
  const reader = user ? `${user.uid}:${user.emailVerified ? 'v' : 'u'}` : 'guest'
  const list = useSubscription<TitleList | null>(
    status === 'loading' ? null : `list:${id}:${reader}`,
    async (onData, onError) => (await loadListsService()).watchList(id, onData, onError),
  )
  // Items are read only after the list is known to exist, so a missing list gives one
  // clean "not found" instead of a second permission error from the items query.
  const items = useSubscription<ListItem[]>(
    list.status === 'success' && list.data ? `items:${id}:${reader}` : null,
    async (onData, onError) => (await loadListsService()).watchListItems(id, onData, onError),
  )

  const retry = () => {
    list.retry()
    items.retry()
  }

  if (list.status === 'idle' || list.status === 'loading') return { status: 'loading', retry }
  if (list.status === 'error') {
    // Rules deny reading a list you have no access to — the same answer as "doesn't exist",
    // so a stranger can't tell private lists apart from wrong links.
    return isPermissionDenied(list.error)
      ? { status: 'missing', retry }
      : { status: 'error', error: list.error, retry }
  }
  const role = list.data ? roleOf(list.data, user) : null
  if (!list.data || !role) return { status: 'missing', retry }

  return {
    status: 'ready',
    list: list.data,
    items: items.status === 'success' ? items.data : null,
    itemsError: items.status === 'error' ? items.error : null,
    role,
    retry,
  }
}
