import type { Firestore } from 'firebase-admin/firestore'
import { decrypt } from './gcalCrypto.js'
import {
  buildEvent,
  inWindow,
  reconcile,
  type DesiredEvent,
  type SyncPlan,
  type SyncSession,
  type SyncUnit,
} from './gcalEvents.js'
import {
  accessTokenFor,
  deleteEvent,
  insertEvent,
  listAppEvents,
  patchEvent,
  type GoogleConfig,
} from './gcalGoogle.js'

// One-way sync: Avleron's plans → events in the person's primary Google Calendar.
// The calendar is compared with the plans every time (nothing is remembered between runs
// except the refresh token), so a retry, a second tab or a missed call just converges.

export const LINKS = 'calendarLinks'

export interface Link {
  refreshToken: string
  status: 'ok' | 'revoked'
  timeZone: string | null
}

export type SyncScope = { planId: string } | 'all'

export interface SyncResult {
  inserted: number
  updated: number
  removed: number
}

export const isTimeZone = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length > 64) return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return true
  } catch {
    return false
  }
}

/** Today in the person's zone as "YYYY-MM-DD". */
export const todayIn = (timeZone: string, now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)

/** A plan the person can see: they own it or are a member (verified address only). */
function canSee(data: FirebaseFirestore.DocumentData, uid: string, email: string): boolean {
  if (data.ownerUid === uid) return true
  return !!email && Array.isArray(data.memberEmails) && data.memberEmails.includes(email)
}

async function plansFor(db: Firestore, scope: SyncScope, uid: string, email: string) {
  const plans = new Map<string, FirebaseFirestore.DocumentData>()
  if (scope !== 'all') {
    const snap = await db.collection('plans').doc(scope.planId).get()
    const data = snap.data()
    if (data && canSee(data, uid, email)) plans.set(snap.id, data)
    return plans
  }
  const queries = [db.collection('plans').where('ownerUid', '==', uid).get()]
  if (email)
    queries.push(db.collection('plans').where('memberEmails', 'array-contains', email).get())
  for (const snap of await Promise.all(queries)) {
    for (const doc of snap.docs) plans.set(doc.id, doc.data())
  }
  return plans
}

async function desiredEvents(
  db: Firestore,
  plans: Map<string, FirebaseFirestore.DocumentData>,
  uid: string,
  timeZone: string,
  appUrl: string,
): Promise<DesiredEvent[]> {
  const today = todayIn(timeZone)
  const lists = await Promise.all(
    [...plans]
      .filter(([, data]) => data.status === 'active')
      .map(async ([id, data]) => {
        const plan: SyncPlan = { id, title: String(data.title ?? ''), kind: data.kind }
        const snap = await db
          .collection('plans')
          .doc(id)
          .collection('sessions')
          .where('status', '==', 'pending')
          .get()
        return snap.docs.flatMap((doc): DesiredEvent[] => {
          const s = doc.data()
          if (typeof s.date !== 'string' || typeof s.time !== 'string' || !inWindow(s.date, today))
            return []
          const session: SyncSession = {
            id: doc.id,
            date: s.date,
            time: s.time,
            minutes: Number(s.minutes) || 60,
            units: (s.units ?? []) as SyncUnit[],
          }
          return [buildEvent(uid, plan, session, timeZone, appUrl)]
        })
      }),
  )
  return lists.flat()
}

/** Runs `task` over `items`, `size` at a time. */
async function inBatches<T>(items: T[], size: number, task: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(task))
  }
}

export async function syncCalendar(
  db: Firestore,
  config: GoogleConfig,
  link: Link,
  caller: { uid: string; email: string },
  scope: SyncScope,
  timeZone: string,
  appUrl: string,
): Promise<SyncResult> {
  const refreshToken = decrypt(link.refreshToken, config.key)
  if (!refreshToken) throw new Error('The stored token cannot be read')
  const accessToken = await accessTokenFor(config, refreshToken)

  const plans = await plansFor(db, scope, caller.uid, caller.email)
  const desired = await desiredEvents(db, plans, caller.uid, timeZone, appUrl)
  const existing = await listAppEvents(accessToken, scope === 'all' ? undefined : scope.planId)
  const changes = reconcile(desired, existing)

  await inBatches(changes.insert, 4, (e) => insertEvent(accessToken, e))
  await inBatches(changes.patch, 4, (e) => patchEvent(accessToken, e))
  await inBatches(changes.remove, 4, (e) => deleteEvent(accessToken, e.id))
  return {
    inserted: changes.insert.length,
    updated: changes.patch.length,
    removed: changes.remove.length,
  }
}

/** Removes every event the app made (on disconnect). */
export async function clearCalendar(accessToken: string): Promise<number> {
  const existing = await listAppEvents(accessToken)
  await inBatches(existing, 4, (e) => deleteEvent(accessToken, e.id))
  return existing.length
}
