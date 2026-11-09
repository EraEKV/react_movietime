import { FieldValue } from 'firebase-admin/firestore'
import { calendarContext } from '../_lib/gcalAuth.js'
import { json } from '../_lib/firebase.js'
import { GrantRevokedError } from '../_lib/gcalGoogle.js'
import { isTimeZone, LINKS, syncCalendar, type Link, type SyncScope } from '../_lib/gcalSync.js'

// POST /api/google-calendar/sync { planId | "all", timeZone }: makes the person's Google
// Calendar match the plans (pending sessions, next 90 days). Safe to repeat. The browser
// calls it after every change to a plan and once when the app opens.

const PLAN_ID = /^[A-Za-z0-9_-]{1,64}$/

export async function POST(request: Request): Promise<Response> {
  const context = await calendarContext(request)
  if (context instanceof Response) return context
  const { db, config, caller } = context

  const body = (await request.json().catch(() => null)) as {
    planId?: unknown
    timeZone?: unknown
  } | null
  const scope: SyncScope | null =
    body?.planId === 'all'
      ? 'all'
      : typeof body?.planId === 'string' && PLAN_ID.test(body.planId)
        ? { planId: body.planId }
        : null
  if (!scope || !isTimeZone(body?.timeZone)) return json({ error: 'bad-request' }, 400)

  const ref = db.collection(LINKS).doc(caller.uid)
  const snap = await ref.get()
  if (!snap.exists) return json({ error: 'not-connected' }, 409)
  const link = snap.data() as Link
  if (link.status === 'revoked') return json({ error: 'revoked' }, 409)

  try {
    const result = await syncCalendar(
      db,
      config,
      link,
      { uid: caller.uid, email: caller.emailVerified ? caller.email : '' },
      scope,
      body.timeZone,
      new URL(request.url).origin,
    )
    await ref.update({ lastSyncAt: FieldValue.serverTimestamp(), timeZone: body.timeZone })
    return json({ ok: true, ...result })
  } catch (error) {
    if (error instanceof GrantRevokedError) {
      await ref.update({ status: 'revoked' })
      return json({ error: 'revoked' }, 409)
    }
    return json({ error: 'sync-failed' }, 502)
  }
}
