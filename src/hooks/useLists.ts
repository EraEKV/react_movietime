import { useMemo } from 'react'
import type * as ListsService from '../services/listsService'
import type { ListAuthor, ListItem, ListRole, TitleList } from '../types/list'
import { roleOf } from '../utils/lists'
import { useAuth } from './useAuth'
import { useSubscription } from './useSubscription'

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
  const { user } = useAuth()
  const list = useSubscription<TitleList | null>(`list:${id}`, async (onData, onError) =>
    (await loadListsService()).watchList(id, onData, onError),
  )
  // Items are read only after the list is known to exist, so a missing list gives one
  // clean "not found" instead of a second permission error from the items query.
  const items = useSubscription<ListItem[]>(
    list.status === 'success' && list.data ? `items:${id}` : null,
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
