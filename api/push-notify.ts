import webPush from 'web-push'
import { adminDb, SUBSCRIPTIONS } from './_lib/admin.js'
import { json } from './_lib/firebase.js'
import { isLocale } from './_lib/layout.js'
import { resolveMember } from './_lib/memberMail.js'
import { pushMessage, type PushKind } from './_lib/pushText.js'

// POST /api/push-notify { collection, id, email, kind: 'shared' | 'role' }: a push to every
// browser the member has subscribed. Same checks as the emails (resolveMember): the caller
// owns the list or plan and the address is one of its members. Text and role come from the
// document and from the language each browser subscribed with, not from the request.
export async function POST(request: Request): Promise<Response> {
  const { VAPID_PRIVATE_KEY, VITE_VAPID_PUBLIC_KEY, VAPID_SUBJECT } = process.env
  const db = adminDb()
  if (!db || !VAPID_PRIVATE_KEY || !VITE_VAPID_PUBLIC_KEY || !VAPID_SUBJECT) {
    return json({ error: 'not-configured' }, 503)
  }

  const copy = request.clone()
  const resolved = await resolveMember(request)
  if (resolved instanceof Response) return resolved
  const { context } = resolved
  const { kind } = (await copy.json().catch(() => ({}))) as { kind?: unknown }
  if (kind !== 'shared' && kind !== 'role') return json({ error: 'bad-request' }, 400)

  webPush.setVapidDetails(VAPID_SUBJECT, VITE_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  const subscriptions = await db
    .collection(SUBSCRIPTIONS)
    .where('email', '==', context.email)
    .limit(10)
    .get()

  const path = new URL(context.openUrl).pathname
  let sent = 0
  await Promise.all(
    subscriptions.docs.map(async (doc) => {
      const stored = doc.get('subscription') as webPush.PushSubscription
      const storedLocale: unknown = doc.get('locale')
      const message = pushMessage(isLocale(storedLocale) ? storedLocale : 'en', kind as PushKind, {
        owner: context.owner,
        name: context.name,
        role: context.role,
        path,
        tag: `${kind}:${path}`,
      })
      try {
        await webPush.sendNotification(stored, JSON.stringify(message), {
          TTL: 24 * 60 * 60,
          timeout: 8000,
        })
        sent += 1
      } catch (error) {
        // 404 / 410: the browser unsubscribed or the subscription expired. Forget it.
        const status = error instanceof webPush.WebPushError ? error.statusCode : 0
        if (status === 404 || status === 410) await doc.ref.delete()
      }
    }),
  )
  return json({ ok: true, sent })
}
