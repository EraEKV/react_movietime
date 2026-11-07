import { Resend } from 'resend'
import { inviteEmail, isLocale } from './_lib/inviteEmail'

// POST /api/send-invite: emails an invite link through Resend. The browser can't hold the
// Resend key, so this runs on Vercel. It trusts nothing from the request except the
// caller's Firebase ID token: the list or plan is read back with that token (Firestore
// rules apply), and the mail is sent only if the caller owns it and the address is already
// one of its members. So the endpoint can't be used to mail arbitrary people.
//
// Env (Vercel): RESEND_API_KEY, RESEND_FROM ("Movietime <invites@your-domain>"),
// VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID (already set for the build).

const TARGET_ID = /^[A-Za-z0-9_-]{1,64}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const json = (body: object, status = 200) => Response.json(body, { status })

interface Field {
  stringValue?: string
  arrayValue?: { values?: Field[] }
  mapValue?: { fields?: Record<string, Field> }
}

export async function POST(request: Request): Promise<Response> {
  const { RESEND_API_KEY, RESEND_FROM } = process.env
  const apiKey = process.env.VITE_FIREBASE_API_KEY
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID
  if (!RESEND_API_KEY || !RESEND_FROM || !apiKey || !projectId) {
    return json({ error: 'not-configured' }, 503)
  }

  const idToken = request.headers.get('authorization')?.replace(/^Bearer /, '')
  if (!idToken) return json({ error: 'unauthenticated' }, 401)

  let input: { collection?: unknown; id?: unknown; email?: unknown; locale?: unknown }
  try {
    input = (await request.json()) as typeof input
  } catch {
    return json({ error: 'bad-request' }, 400)
  }
  const { collection, id } = input
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
  if (
    (collection !== 'lists' && collection !== 'plans') ||
    typeof id !== 'string' ||
    !TARGET_ID.test(id) ||
    !EMAIL.test(email) ||
    email.length > 254
  ) {
    return json({ error: 'bad-request' }, 400)
  }

  // Who is calling: Firebase checks the token's signature and expiry.
  const lookup = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken }),
    },
  )
  if (!lookup.ok) return json({ error: 'unauthenticated' }, 401)
  const { users } = (await lookup.json()) as { users?: { localId: string }[] }
  const uid = users?.[0]?.localId
  if (!uid) return json({ error: 'unauthenticated' }, 401)

  // The document, read as that user. Not readable (or missing) → not theirs to invite to.
  const document = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${id}`,
    { headers: { authorization: `Bearer ${idToken}` } },
  )
  if (!document.ok) return json({ error: 'forbidden' }, 403)
  const { fields = {} } = (await document.json()) as { fields?: Record<string, Field> }
  const members = (fields.memberEmails?.arrayValue?.values ?? []).map((v) => v.stringValue)
  if (fields.ownerUid?.stringValue !== uid || !members.includes(email)) {
    return json({ error: 'forbidden' }, 403)
  }

  const origin = new URL(request.url).origin
  const link = new URL('/signup', origin)
  link.searchParams.set('invite', `${collection}/${id}`)
  link.searchParams.set('email', email)

  const role =
    fields.roles?.mapValue?.fields?.[email]?.stringValue === 'editor' ? 'editor' : 'viewer'
  const message = inviteEmail(isLocale(input.locale) ? input.locale : 'en', {
    role,
    owner: fields.ownerName?.stringValue || '',
    name: fields.name?.stringValue || fields.title?.stringValue || '',
    url: link.href,
  })
  const resend = new Resend(RESEND_API_KEY)
  const { error } = await resend.emails.send({ from: RESEND_FROM, to: [email], ...message })
  if (error) return json({ error: 'send-failed' }, 502)
  return json({ ok: true })
}
