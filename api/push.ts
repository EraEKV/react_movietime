import { createHash } from 'node:crypto'
import { adminDb, SUBSCRIPTIONS } from './_lib/admin.js'
import { bearer, json, readEnv, readJson, verifyToken } from './_lib/firebase.js'
import { isLocale } from './_lib/layout.js'

// POST /api/push { subscription, locale }: remember this browser for push notifications.
// DELETE /api/push { endpoint }: forget it. A subscription is stored under the hash of its
// endpoint, together with the verified email of the signed-in user, so one browser is one
// document and the sender can find a recipient by email.

interface Subscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

const isSubscription = (value: unknown): value is Subscription => {
  const s = value as Partial<Subscription> | null
  return (
    typeof s?.endpoint === 'string' &&
    s.endpoint.startsWith('https://') &&
    s.endpoint.length < 1000 &&
    typeof s.keys?.p256dh === 'string' &&
    typeof s.keys.auth === 'string'
  )
}

/** Browsers one account may subscribe. */
const MAX_BROWSERS = 10

const docId = (endpoint: string) => createHash('sha256').update(endpoint).digest('hex')

async function signedIn(request: Request) {
  const env = readEnv()
  const db = adminDb()
  if (!env || !db) return json({ error: 'not-configured' }, 503)
  const token = bearer(request)
  const caller = token ? await verifyToken(env, token) : null
  if (!caller) return json({ error: 'unauthenticated' }, 401)
  return { db, caller }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await signedIn(request)
  if (auth instanceof Response) return auth
  const { db, caller } = auth
  // Same rule as for sharing: only a verified address can receive anything about it.
  if (!caller.emailVerified || !caller.email) return json({ error: 'unverified' }, 403)

  const body = (await readJson(request)) as {
    subscription?: unknown
    locale?: unknown
  } | null
  if (!isSubscription(body?.subscription)) return json({ error: 'bad-request' }, 400)

  const { endpoint, keys } = body.subscription
  // A person has a few browsers; more subscriptions from one account is somebody filling
  // the table. A browser that is already stored may always renew itself.
  const own = await db
    .collection(SUBSCRIPTIONS)
    .where('uid', '==', caller.uid)
    .limit(MAX_BROWSERS + 1)
    .get()
  const known = own.docs.some((doc) => doc.id === docId(endpoint))
  if (!known && own.docs.length >= MAX_BROWSERS) return json({ error: 'too-many' }, 429)

  await db
    .collection(SUBSCRIPTIONS)
    .doc(docId(endpoint))
    .set({
      uid: caller.uid,
      email: caller.email,
      locale: isLocale(body.locale) ? body.locale : 'en',
      subscription: { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
      createdAt: new Date(),
    })
  return json({ ok: true })
}

export async function DELETE(request: Request): Promise<Response> {
  const auth = await signedIn(request)
  if (auth instanceof Response) return auth
  const { db, caller } = auth

  const body = (await readJson(request)) as { endpoint?: unknown } | null
  if (typeof body?.endpoint !== 'string') return json({ error: 'bad-request' }, 400)

  const ref = db.collection(SUBSCRIPTIONS).doc(docId(body.endpoint))
  const snapshot = await ref.get()
  // Only the account that saved it may remove it.
  if (snapshot.exists && snapshot.get('uid') === caller.uid) await ref.delete()
  return json({ ok: true })
}
