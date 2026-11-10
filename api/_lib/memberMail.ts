import { Resend } from 'resend'
import { bearer, json, readEnv, readDoc, verifyToken, type MailEnv } from './firebase.js'
import { isLocale, type Locale } from './layout.js'
import { siteOrigin } from './site.js'
import type { Role } from './templates.js'

// Shared by the endpoints that mail a member of a list or plan (invite, role change). They
// trust nothing from the request except the caller's Firebase ID token: the list or plan is
// read back with that token (Firestore rules apply), and mail goes out only if the caller
// owns it and the address is currently one of its members. So these endpoints can't be used
// to mail arbitrary people.

const TARGET_ID = /^[A-Za-z0-9_-]{1,64}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface MemberContext {
  locale: Locale
  owner: string
  name: string
  role: Role
  email: string
  /** Where the member goes: sign-up with the email filled in, or the list itself. */
  signupUrl: string
  openUrl: string
}

/**
 * Checks the request and returns who is being told about what, or the Response to send
 * back instead (bad input, not signed in, not the owner, address not a member).
 */
export async function resolveMember(
  request: Request,
): Promise<{ env: MailEnv; context: MemberContext } | Response> {
  const env = readEnv()
  if (!env) return json({ error: 'not-configured' }, 503)

  const idToken = bearer(request)
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

  const caller = await verifyToken(env, idToken)
  if (!caller) return json({ error: 'unauthenticated' }, 401)

  // Not readable (or missing) → not theirs to mail about.
  const document = await readDoc(env, idToken, `${collection}/${id}`)
  if (!document) return json({ error: 'forbidden' }, 403)
  const { fields } = document
  const members = (fields.memberEmails?.arrayValue?.values ?? []).map((v) => v.stringValue)
  if (fields.ownerUid?.stringValue !== caller.uid || !members.includes(email)) {
    return json({ error: 'forbidden' }, 403)
  }

  const origin = siteOrigin(request)
  const signup = new URL('/signup', origin)
  signup.searchParams.set('invite', `${collection}/${id}`)
  signup.searchParams.set('email', email)
  const open = new URL(collection === 'lists' ? `/lists/${id}` : `/planner/${id}`, origin)

  return {
    env,
    context: {
      locale: isLocale(input.locale) ? input.locale : 'en',
      owner: fields.ownerName?.stringValue || '',
      name: fields.name?.stringValue || fields.title?.stringValue || '',
      role: fields.roles?.mapValue?.fields?.[email]?.stringValue === 'editor' ? 'editor' : 'viewer',
      email,
      signupUrl: signup.href,
      openUrl: open.href,
    },
  }
}

export async function sendMemberMail(
  request: Request,
  build: (context: MemberContext) => { subject: string; text: string; html: string },
): Promise<Response> {
  const resolved = await resolveMember(request)
  if (resolved instanceof Response) return resolved
  const { env, context } = resolved
  const { error } = await new Resend(env.resendKey).emails.send({
    from: env.from,
    to: [context.email],
    ...build(context),
  })
  if (error) return json({ error: 'send-failed' }, 502)
  return json({ ok: true })
}
