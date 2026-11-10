import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Firebase Admin, used only for push subscriptions (`pushSubscriptions/{id}`): to push to
// someone else the server has to read *their* subscriptions, which no user's own token may
// do. The collection is closed to every client in firestore.rules; only this account reads
// and writes it. Env: FIREBASE_SERVICE_ACCOUNT = the service-account JSON (one line).

let projectId = ''

export function adminDb() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) return null
  if (getApps().length === 0) {
    const account = JSON.parse(raw) as Parameters<typeof cert>[0]
    projectId = (account as { project_id?: string }).project_id ?? ''
    initializeApp({ credential: cert(account) })
  }
  return getFirestore()
}

/**
 * The Auth account of `uid` as far as the calendar feed needs it (its email and whether that
 * is verified), or null when it can't be read. Asked through the Identity Toolkit REST API
 * with the service account's token: `firebase-admin/auth` is left out on purpose, because on
 * Vercel its dependency jwks-rsa fails to load (ERR_REQUIRE_ESM for jose) and takes the whole
 * function down. Call adminDb() first, it sets the app up.
 */
export async function accountOf(
  uid: string,
): Promise<{ email: string; emailVerified: boolean } | null> {
  const app = getApps()[0]
  if (!app || !projectId) return null
  const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST
  const base = emulator
    ? `http://${emulator}/identitytoolkit.googleapis.com`
    : 'https://identitytoolkit.googleapis.com'
  const token = emulator ? 'owner' : (await app.options.credential?.getAccessToken())?.access_token
  if (!token) return null
  const response = await fetch(`${base}/v1/projects/${projectId}/accounts:lookup`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ localId: [uid] }),
  })
  if (!response.ok) return null
  const body = (await response.json()) as {
    users?: { email?: string; emailVerified?: boolean }[]
  }
  const user = body.users?.[0]
  return user?.email ? { email: user.email, emailVerified: user.emailVerified === true } : null
}

export const SUBSCRIPTIONS = 'pushSubscriptions'
