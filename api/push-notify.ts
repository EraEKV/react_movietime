import type { QueryDocumentSnapshot } from 'firebase-admin/firestore'
import * as webPush from 'web-push'
import { adminDb, SUBSCRIPTIONS } from './_lib/admin.js'
import { json } from './_lib/firebase.js'
import { isLocale, type Locale } from './_lib/layout.js'
import { resolveMember } from './_lib/memberMail.js'
import { pushMessage, suggestionMessage, type PushKind } from './_lib/pushText.js'
import { resolveSuggestion } from './_lib/suggestion.js'

// POST /api/push-notify { collection, id, email, kind: 'shared' | 'role' }: a push to every
// browser the member has subscribed. Same checks as the emails (resolveMember): the caller
// owns the list or plan and the address is one of its members. Text and role come from the
// document and from the language each browser subscribed with, not from the request.
// Also { collection: 'plans', id, proposalId, kind: 'proposal' | 'answer' }: a film suggestion
// in a movie marathon, to the owner or to the suggestion's author (see _lib/suggestion.ts).
export async function POST(request: Request): Promise<Response> {
  const { VAPID_PRIVATE_KEY, VITE_VAPID_PUBLIC_KEY, VAPID_SUBJECT } = process.env
  const db = adminDb()
  if (!db || !VAPID_PRIVATE_KEY || !VITE_VAPID_PUBLIC_KEY || !VAPID_SUBJECT) {
    return json({ error: 'not-configured' }, 503)
  }

  const copy = request.clone()
  const input = (await copy.json().catch(() => ({}))) as {
    kind?: unknown
    id?: unknown
    proposalId?: unknown
  }
  webPush.setVapidDetails(VAPID_SUBJECT, VITE_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

  if (input.kind === 'proposal' || input.kind === 'answer') {
    const push = await resolveSuggestion(request, input.kind, input)
    if (push instanceof Response) return push
    const subscriptions = await db
      .collection(SUBSCRIPTIONS)
      .where('uid', '==', push.uid)
      .limit(10)
      .get()
    return deliver(subscriptions.docs, (locale) => suggestionMessage(locale, push.kind, push))
  }

  const resolved = await resolveMember(request)
  if (resolved instanceof Response) return resolved
  const { context } = resolved
  const { kind } = input
  if (kind !== 'shared' && kind !== 'role') return json({ error: 'bad-request' }, 400)

  const subscriptions = await db
    .collection(SUBSCRIPTIONS)
    .where('email', '==', context.email)
    .limit(10)
    .get()
  const path = new URL(context.openUrl).pathname
  return deliver(subscriptions.docs, (locale) =>
    pushMessage(locale, kind as PushKind, {
      owner: context.owner,
      name: context.name,
      role: context.role,
      path,
      tag: `${kind}:${path}`,
    }),
  )
}

/** Sends one message per subscribed browser, in the language it subscribed with. */
async function deliver(
  docs: QueryDocumentSnapshot[],
  build: (locale: Locale) => object,
): Promise<Response> {
  let sent = 0
  await Promise.all(
    docs.map(async (doc) => {
      const stored = doc.get('subscription') as webPush.PushSubscription
      const storedLocale: unknown = doc.get('locale')
      const message = build(isLocale(storedLocale) ? storedLocale : 'en')
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
