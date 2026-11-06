import type * as SharingService from '../services/sharingService'
import type { MemberRole, Shareable, SharedCollection, Visibility } from '../types/sharing'
import { shareUrl } from '../utils/sharing'
import { useAuth } from './useAuth'

/** Loaded on first use, like the lists service: keeps Firestore out of the main chunk. */
const loadSharingService = (): Promise<typeof SharingService> =>
  import('../services/sharingService')

/**
 * Sharing actions for one list or plan, bound to the signed-in user. Written for both
 * collections; only lists have a UI so far. Each action resolves when the server accepts
 * the write and rejects with the Firestore error (permission-denied, offline…).
 */
export function useSharing(
  collection: SharedCollection,
  shared: Shareable | null,
  title: string,
) {
  const { user } = useAuth()
  const ownEmail = user?.email ?? null
  // `null` while the page is still loading: hooks can't be called after an early return.
  const id = shared?.id ?? ''
  const roles = shared?.roles ?? {}

  return {
    url: shareUrl(collection, id),
    setVisibility: async (visibility: Visibility) =>
      (await loadSharingService()).setVisibility(collection, id, visibility),
    invite: async (email: string, role: MemberRole) =>
      (await loadSharingService()).addMember(collection, id, roles, email, role, {
        ownEmail,
        ownerUid: shared?.ownerUid ?? '',
        ownerName: shared?.ownerName ?? '',
        title,
      }),
    changeRole: async (email: string, role: MemberRole) =>
      (await loadSharingService()).changeRole(collection, id, email, role),
    remove: async (email: string) =>
      (await loadSharingService()).removeMember(collection, id, email),
    leave: async () => {
      if (!ownEmail) throw new Error('Sign in to leave.')
      return (await loadSharingService()).leave(collection, id, ownEmail)
    },
  }
}
