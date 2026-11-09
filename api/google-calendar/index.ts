import { calendarContext } from '../_lib/gcalAuth.js'
import { signState } from '../_lib/gcalCrypto.js'
import { accessTokenFor, authUrl, revoke } from '../_lib/gcalGoogle.js'
import { clearCalendar, LINKS, type Link } from '../_lib/gcalSync.js'
import { decrypt } from '../_lib/gcalCrypto.js'
import { json } from '../_lib/firebase.js'

// /api/google-calendar: the connection itself.
//   GET     → { configured, connected, status, lastSyncAt }
//   POST    → { url }: where to send the person to allow access (Google's consent screen)
//   DELETE  → removes the events the app made, revokes the grant at Google, forgets it
// Tokens live in `calendarLinks/{uid}` (closed to every client in firestore.rules).

const STATE_MINUTES = 10

export async function GET(request: Request): Promise<Response> {
  const context = await calendarContext(request)
  if (context instanceof Response) {
    // Not configured is an answer, not an error: the Settings card hides itself.
    return context.status === 503 ? json({ configured: false, connected: false }) : context
  }
  const snap = await context.db.collection(LINKS).doc(context.caller.uid).get()
  if (!snap.exists) return json({ configured: true, connected: false })
  const lastSyncAt = snap.get('lastSyncAt') as { toMillis(): number } | undefined
  return json({
    configured: true,
    connected: true,
    status: snap.get('status') === 'revoked' ? 'revoked' : 'ok',
    lastSyncAt: lastSyncAt?.toMillis() ?? null,
  })
}

export async function POST(request: Request): Promise<Response> {
  const context = await calendarContext(request)
  if (context instanceof Response) return context
  const { config, caller } = context
  const state = signState({ uid: caller.uid, exp: Date.now() + STATE_MINUTES * 60_000 }, config.key)
  return json({ url: authUrl(config, request.url, state) })
}

export async function DELETE(request: Request): Promise<Response> {
  const context = await calendarContext(request)
  if (context instanceof Response) return context
  const { db, config, caller } = context
  const ref = db.collection(LINKS).doc(caller.uid)
  const snap = await ref.get()
  if (!snap.exists) return json({ ok: true, removed: 0 })

  const link = snap.data() as Link
  const refreshToken = decrypt(link.refreshToken, config.key)
  let removed = 0
  if (refreshToken) {
    try {
      removed = await clearCalendar(await accessTokenFor(config, refreshToken))
    } catch {
      // The grant is already gone or Google is down: there is nothing more we can clean.
    }
    await revoke(refreshToken)
  }
  await ref.delete()
  return json({ ok: true, removed })
}
