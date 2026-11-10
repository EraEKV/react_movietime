import { Resend } from 'resend'
import { bearer, json, markWelcomed, readDoc, readEnv, verifyToken } from './_lib/firebase.js'
import { isLocale } from './_lib/layout.js'
import { siteOrigin } from './_lib/site.js'
import { welcomeEmail } from './_lib/templates.js'

// POST /api/send-welcome { locale }: the welcome email, once per account. It goes only to
// the address on the caller's own verified token, so it can't be aimed at anyone else.
// `users/{uid}.welcomedAt` is the "already sent" mark; it is claimed before sending, with a
// precondition on the document version, so two tabs can't both send it.
export async function POST(request: Request): Promise<Response> {
  const env = readEnv()
  if (!env) return json({ error: 'not-configured' }, 503)

  const idToken = bearer(request)
  if (!idToken) return json({ error: 'unauthenticated' }, 401)
  const caller = await verifyToken(env, idToken)
  if (!caller) return json({ error: 'unauthenticated' }, 401)
  if (!caller.emailVerified || !caller.email) return json({ error: 'unverified' }, 403)

  let locale: unknown
  try {
    locale = ((await request.json()) as { locale?: unknown }).locale
  } catch {
    locale = undefined
  }

  const profile = await readDoc(env, idToken, `users/${caller.uid}`)
  if (!profile) return json({ ok: false, reason: 'no-profile' })
  if (profile.fields.welcomedAt) return json({ ok: false, reason: 'already-sent' })
  if (!(await markWelcomed(env, idToken, caller.uid, profile))) {
    return json({ ok: false, reason: 'already-sent' })
  }

  const name = profile.fields.displayName?.stringValue || caller.displayName
  const message = welcomeEmail(isLocale(locale) ? locale : 'en', {
    name,
    url: `${siteOrigin(request)}/`,
  })
  const { error } = await new Resend(env.resendKey).emails.send({
    from: env.from,
    to: [caller.email],
    ...message,
  })
  if (error) {
    // Give the claim back so the next sign-in tries again.
    const fresh = await readDoc(env, idToken, `users/${caller.uid}`)
    if (fresh) await markWelcomed(env, idToken, caller.uid, fresh, true)
    return json({ error: 'send-failed' }, 502)
  }
  return json({ ok: true })
}
