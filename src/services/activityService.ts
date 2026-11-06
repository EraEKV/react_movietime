import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentData,
  type Unsubscribe,
  type WriteBatch,
} from 'firebase/firestore'
import type { ActivityDraft, ActivityItem, ActivityMeta, ActivityType } from '../types/activity'
import { isLibraryStatus } from '../utils/library'
import { parseMediaKey } from '../utils/media'
import { db } from './firestore'

// users/{uid}/activity/{id}: an append-only log for the profile feed (docs/DATA_MODEL.md).
const activityCol = (uid: string) => collection(db, 'users', uid, 'activity')

/** Same limit as the rules; TMDB titles are far shorter, this is only a guard. */
const MAX_TITLE = 200

export const ACTIVITY_TYPES: readonly ActivityType[] = [
  'library.add',
  'library.status',
  'list.create',
  'plan.create',
  'session.done',
  'plan.done',
]

const isActivityType = (value: unknown): value is ActivityType =>
  ACTIVITY_TYPES.some((type) => type === value)

/** Only defined keys: Firestore rejects `undefined` values. */
function toDocument(draft: ActivityDraft) {
  return {
    type: draft.type,
    title: draft.title.slice(0, MAX_TITLE),
    ...(draft.mediaKey && { mediaKey: draft.mediaKey }),
    ...(draft.refId && { refId: draft.refId }),
    ...(draft.meta && { meta: draft.meta }),
    createdAt: serverTimestamp(),
  }
}

/** Adds an activity record to a batch, so it is saved together with the change it describes. */
export function addActivity(batch: WriteBatch, uid: string, draft: ActivityDraft): void {
  batch.set(doc(activityCol(uid)), toDocument(draft))
}

/**
 * Records an activity on its own, fire-and-forget: the caller does not await it, and a
 * failure (offline for long, rules not deployed) is only logged. The feed is a nice extra;
 * it must never make adding a title or creating a list fail.
 */
export function logActivity(uid: string, draft: ActivityDraft): void {
  setDoc(doc(activityCol(uid)), toDocument(draft)).catch((error: unknown) => {
    console.warn('Could not record the activity', error)
  })
}

function toMeta(value: unknown): ActivityMeta | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const { status, units, sessions } = value as Record<string, unknown>
  return {
    ...(isLibraryStatus(status) && { status }),
    ...(typeof units === 'string' && { units }),
    ...(typeof sessions === 'number' && { sessions }),
  }
}

function toItem(id: string, data: DocumentData): ActivityItem | null {
  if (!isActivityType(data.type)) return null
  const key = typeof data.mediaKey === 'string' ? parseMediaKey(data.mediaKey) : null
  const meta = toMeta(data.meta)
  return {
    id,
    type: data.type,
    title: String(data.title ?? ''),
    ...(key && { mediaKey: `${key.mediaType}_${key.id}` as const }),
    ...(typeof data.refId === 'string' && { refId: data.refId }),
    ...(meta && { meta }),
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : new Date().toISOString(),
  }
}

/**
 * The newest `count` records, live. One orderBy on a single field needs no composite
 * index (Firestore indexes every field on its own automatically).
 */
export function watchActivity(
  uid: string,
  count: number,
  onData: (items: ActivityItem[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(activityCol(uid), orderBy('createdAt', 'desc'), limit(count))
  return onSnapshot(
    q,
    (snapshot) =>
      onData(
        snapshot.docs
          // 'estimate': a record written a moment ago gets local time instead of null.
          .map((d) => toItem(d.id, d.data({ serverTimestamps: 'estimate' })))
          .filter((item): item is ActivityItem => item !== null),
      ),
    onError,
  )
}
