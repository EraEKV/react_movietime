import { auth } from './firebase'

// Emails are sent by Vercel functions (api/, Resend); the browser only asks. Each endpoint
// checks the caller's ID token itself (see api/_lib), so nothing here is trusted.

type Collection = 'lists' | 'plans'

async function post(endpoint: string, body: object): Promise<Record<string, unknown>> {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('unauthenticated')
  const response = await fetch(`/api/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'send-failed')
  return data ?? {}
}

/** Emails the invite link. The owner must have added the address already. */
export async function sendInviteEmail(
  collection: Collection,
  id: string,
  email: string,
  locale: string,
): Promise<void> {
  await post('send-invite', { collection, id, email, locale })
}

/** Tells a member their role changed (the server reads the new role from the list). */
export async function sendRoleChangeEmail(
  collection: Collection,
  id: string,
  email: string,
  locale: string,
): Promise<void> {
  await post('send-role-change', { collection, id, email, locale })
}

/**
 * The welcome email, once per account. Resolves to `true` when it was sent or had been sent
 * before (nothing more to do), `false` when the profile isn't there yet (try again later).
 */
export async function sendWelcomeEmail(locale: string): Promise<boolean> {
  const data = await post('send-welcome', { locale })
  return data.reason !== 'no-profile'
}

/** Pushes "shared with you" / "your role changed" to the member's subscribed browsers. */
export async function sendPushNotice(
  collection: Collection,
  id: string,
  email: string,
  kind: 'shared' | 'role',
): Promise<void> {
  await post('push-notify', { collection, id, email, kind })
}
