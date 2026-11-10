import { accountOf, adminDb } from './_lib/admin.js'
import { buildFeed, tokenFrom, type FeedPlan, type FeedSession } from './_lib/feed.js'
import { validTimeZone } from './_lib/ics.js'

// GET /api/calendar/<token>.ics (vercel.json → /api/ics?file=<token>.ics): a calendar
// subscription with every pending session of the plans of whoever owns the token. Google
// Calendar and the like fetch it without signing in, so the token in the address is the
// only credential: it is written by the app into the user's profile (`icsToken`, 192
// random bits) and replaced to cancel the link. Read-only, and only pending sessions.

/** More than this and a feed would take too long to build; no real account comes near. */
const MAX_PLANS = 100

const notFound = () => new Response('Not found', { status: 404 })

export async function GET(request: Request): Promise<Response> {
  const db = adminDb()
  if (!db) return Response.json({ error: 'not-configured' }, { status: 503 })

  const url = new URL(request.url)
  const token = tokenFrom(url)
  if (!token) return notFound()

  const owners = await db.collection('users').where('icsToken', '==', token).limit(1).get()
  const profile = owners.docs[0]
  if (!profile) return notFound()
  const uid = profile.id
  const zone: unknown = profile.get('icsTimeZone')

  // Plans shared with the user's email count only once that email is verified, like the
  // security rules say for the app itself.
  const account = await accountOf(uid).catch(() => null)
  const email = account?.emailVerified ? account.email.toLowerCase() : null

  const [owned, shared] = await Promise.all([
    db.collection('plans').where('ownerUid', '==', uid).limit(MAX_PLANS).get(),
    email
      ? db.collection('plans').where('memberEmails', 'array-contains', email).limit(MAX_PLANS).get()
      : null,
  ])
  const docs = new Map(
    [...owned.docs, ...(shared?.docs ?? [])]
      .filter((doc) => doc.get('status') !== 'archived')
      .map((doc) => [doc.id, doc]),
  )

  const plans: FeedPlan[] = [...docs.values()].map((doc) => ({
    id: doc.id,
    title: String(doc.get('title') ?? ''),
    mediaTitle: (doc.get('media.title') as string | undefined) ?? null,
  }))
  const perPlan = await Promise.all(
    plans.map(async (plan) => {
      const snap = await db
        .collection('plans')
        .doc(plan.id)
        .collection('sessions')
        .where('status', '==', 'pending')
        .get()
      return snap.docs.map((doc): FeedSession => ({
        id: doc.id,
        planId: plan.id,
        date: String(doc.get('date')),
        time: String(doc.get('time')),
        minutes: Number(doc.get('minutes') ?? 0),
        units: (doc.get('units') as FeedSession['units'] | undefined) ?? [],
      }))
    }),
  )

  const body = buildFeed(
    plans,
    perPlan.flat(),
    url.origin,
    validTimeZone(zone) ? zone : 'UTC',
    new Date(),
  )
  return new Response(body, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'inline; filename="avleron.ics"',
      // A private, secret-addressed file: nobody in between may keep a copy.
      'cache-control': 'private, no-store',
    },
  })
}

// Some calendar apps check an address with HEAD first: answer it like GET (the runtime drops the body).
export const HEAD = GET
