import { auth } from './firebase'

/**
 * Asks the server (api/send-invite, Resend) to email the invite link. The server checks
 * the ID token and that the caller owns the list or plan and has already added the address.
 * Rejects with an Error whose message is the server's error code.
 */
export async function sendInviteEmail(
  collection: 'lists' | 'plans',
  id: string,
  email: string,
  locale: string,
): Promise<void> {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('unauthenticated')
  const response = await fetch('/api/send-invite', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ collection, id, email, locale }),
  })
  if (response.ok) return
  const body = (await response.json().catch(() => null)) as { error?: string } | null
  throw new Error(body?.error ?? 'send-failed')
}
