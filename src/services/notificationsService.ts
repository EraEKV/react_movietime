import {
  arrayRemove,
  collection,
  deleteDoc,
  deleteField,
  doc,
  FieldPath,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
  type WriteBatch,
} from 'firebase/firestore'
import type { AppNotification } from '../types/notifications'
import type { MemberRole, SharedCollection } from '../types/sharing'
import { normalizeEmail } from '../utils/sharing'
import { db } from './firestore'

// notifications/{id}, keyed by the recipient's lowercase email, or by uid for marathon
// suggestions (docs/DATA_MODEL.md). The
// owner writes one in the same batch as the sharing change; the rules accept it only if
// that change really adds the email. Nothing here checks that an account exists.
const notificationsCol = collection(db, 'notifications')

/** How many notifications the bell keeps. */
export const NOTIFICATIONS_LIMIT = 30

export interface SharedNotice {
  toEmail: string
  collection: SharedCollection
  targetId: string
  targetTitle: string
  role: MemberRole
  fromUid: string
  fromName: string
}

/** Adds the "you were given access" notice to a batch that also changes the sharing. */
export function addSharedNotice(batch: WriteBatch, notice: SharedNotice): void {
  batch.set(doc(notificationsCol), {
    toEmail: normalizeEmail(notice.toEmail),
    type: 'shared',
    collection: notice.collection,
    targetId: notice.targetId,
    targetTitle: notice.targetTitle.slice(0, 120),
    role: notice.role,
    fromUid: notice.fromUid,
    fromName: notice.fromName.slice(0, 80),
    createdAt: serverTimestamp(),
    readAt: null,
  })
}

export interface SuggestionNotice {
  toUid: string
  type: 'proposal' | 'answer'
  planId: string
  proposalId: string
  planTitle: string
  /** The suggested film, exactly as the suggestion holds it (the rules compare them). */
  film: string
  /** Only on an answer. */
  decision?: 'accepted' | 'rejected'
  fromUid: string
  fromName: string
}

/** Adds a suggestion notice to the batch that writes the suggestion or its answer. */
export function addSuggestionNotice(batch: WriteBatch, notice: SuggestionNotice): void {
  batch.set(doc(notificationsCol), {
    toUid: notice.toUid,
    type: notice.type,
    collection: 'plans',
    targetId: notice.planId,
    proposalId: notice.proposalId,
    targetTitle: notice.planTitle,
    film: notice.film,
    ...(notice.decision && { decision: notice.decision }),
    fromUid: notice.fromUid,
    fromName: notice.fromName.slice(0, 80),
    createdAt: serverTimestamp(),
    readAt: null,
  })
}

function toNotification(id: string, data: DocumentData): AppNotification | null {
  const base = {
    id,
    targetId: String(data.targetId ?? ''),
    targetTitle: String(data.targetTitle ?? ''),
    fromName: String(data.fromName ?? ''),
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : new Date().toISOString(),
    read: data.readAt != null,
  }
  if (data.type === 'proposal' || data.type === 'answer') {
    if (data.collection !== 'plans') return null
    return {
      ...base,
      type: data.type,
      collection: 'plans',
      film: String(data.film ?? ''),
      decision: data.decision === 'accepted' || data.decision === 'rejected' ? data.decision : null,
    }
  }
  if (data.type !== 'shared') return null
  if (data.collection !== 'lists' && data.collection !== 'plans') return null
  if (data.role !== 'editor' && data.role !== 'viewer') return null
  return { ...base, type: 'shared', collection: data.collection, role: data.role }
}

/**
 * The newest notifications for the signed-in user, live: the ones addressed to a verified
 * email ("shared") and the ones addressed to the uid (marathon suggestions), merged, newest
 * first. Needs the (toEmail, createdAt) and (toUid, createdAt) indexes. 'estimate': a notice
 * written a moment ago gets local time instead of null.
 */
export function watchNotifications(
  who: { uid: string; email: string | null },
  onData: (items: AppNotification[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const sources = who.email ? 2 : 1
  const found: AppNotification[][] = []
  let answered = 0
  const listen = (field: 'toEmail' | 'toUid', value: string, slot: number) =>
    onSnapshot(
      query(
        notificationsCol,
        where(field, '==', value),
        orderBy('createdAt', 'desc'),
        limit(NOTIFICATIONS_LIMIT),
      ),
      (snapshot) => {
        if (found[slot] === undefined) answered += 1
        found[slot] = snapshot.docs
          .map((d) => toNotification(d.id, d.data({ serverTimestamps: 'estimate' })))
          .filter((item): item is AppNotification => item !== null)
        // One list once every source has answered, so the bell doesn't flash half of it.
        if (answered < sources) return
        onData(
          found
            .flat()
            .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, NOTIFICATIONS_LIMIT),
        )
      },
      onError,
    )
  const stops = [listen('toUid', who.uid, 0)]
  if (who.email) stops.push(listen('toEmail', normalizeEmail(who.email), 1))
  return () => stops.forEach((stop) => stop())
}

/** Only readAt changes (rules: null → now). */
export function markRead(id: string): Promise<void> {
  return updateDoc(doc(db, 'notifications', id), { readAt: serverTimestamp() })
}

/** One batch, so a double click or a retry can't fail half-way. */
export async function markAllRead(ids: string[]): Promise<void> {
  const batch = writeBatch(db)
  for (const id of ids) batch.update(doc(db, 'notifications', id), { readAt: serverTimestamp() })
  await batch.commit()
}

/**
 * Decline = leave the list or plan and drop the notification in one batch. If the access
 * is already gone (the owner removed us, or deleted the list) the leave can't be written;
 * then only the notification is removed.
 */
export async function decline(notification: AppNotification, ownEmail: string): Promise<void> {
  if (notification.type !== 'shared') {
    // A suggestion notice has no access to give up: it is only removed.
    return deleteDoc(doc(db, 'notifications', notification.id))
  }
  const email = normalizeEmail(ownEmail)
  const target = doc(db, notification.collection, notification.targetId)
  const batch = writeBatch(db)
  batch.update(
    target,
    new FieldPath('roles', email),
    deleteField(),
    'memberEmails',
    arrayRemove(email),
    'updatedAt',
    serverTimestamp(),
  )
  batch.delete(doc(db, 'notifications', notification.id))
  try {
    await batch.commit()
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null
    if (code !== 'permission-denied' && code !== 'not-found') throw error
    await deleteDoc(doc(db, 'notifications', notification.id))
  }
}
