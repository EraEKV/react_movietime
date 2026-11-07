import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Firebase Admin, used only for push subscriptions (`pushSubscriptions/{id}`): to push to
// someone else the server has to read *their* subscriptions, which no user's own token may
// do. The collection is closed to every client in firestore.rules; only this account reads
// and writes it. Env: FIREBASE_SERVICE_ACCOUNT = the service-account JSON (one line).

export function adminDb() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) return null
  if (getApps().length === 0) {
    initializeApp({ credential: cert(JSON.parse(raw) as Parameters<typeof cert>[0]) })
  }
  return getFirestore()
}

export const SUBSCRIPTIONS = 'pushSubscriptions'
