import type { User } from 'firebase/auth'
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore'
import type { UserProfile } from '../types/auth'
import type { Preferences } from '../types/preferences'
import { isLanguage, isTheme } from '../storage/preferencesStorage'
import { db } from './firestore'

const profileRef = (uid: string) => doc(db, 'users', uid)

function toIso(value: unknown): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null
}

/** Firestore data → app type; Timestamps become ISO strings so the result is serializable. */
function toProfile(data: DocumentData): UserProfile {
  return {
    displayName: String(data.displayName ?? ''),
    email: String(data.email ?? ''),
    photoURL: typeof data.photoURL === 'string' ? data.photoURL : null,
    providers: Array.isArray(data.providers) ? data.providers.map(String) : [],
    settings: isSettings(data.settings) ? (data.settings as Preferences) : null,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  }
}

/** Same limit as the rules and the settings form. */
export const MAX_NAME = 40

function fallbackName(user: User): string {
  const name = user.displayName?.trim() || user.email?.split('@')[0] || 'Movie fan'
  return name.slice(0, MAX_NAME)
}

const isSettings = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  isTheme((value as Record<string, unknown>).theme) &&
  isLanguage((value as Record<string, unknown>).language)

/**
 * Creates `users/{uid}` on the first sign-in; on later sign-ins refreshes the fields that come
 * from the auth provider (a Google photo can change). Name and settings stay the user's own:
 * `settings` (this device's choice) is written only when the account has none yet —
 * otherwise the account wins and the preferences listener applies it on this device.
 */
export async function ensureProfile(user: User, settings: Preferences): Promise<void> {
  const ref = profileRef(user.uid)
  const fromAuth = {
    email: (user.email ?? '').toLowerCase(),
    photoURL: user.photoURL,
    providers: user.providerData.map((p) => p.providerId),
    updatedAt: serverTimestamp(),
  }

  const snapshot = await getDoc(ref)
  const data = snapshot.data()
  if (data) {
    const name = typeof data.displayName === 'string' ? data.displayName.trim() : ''
    await updateDoc(ref, {
      ...fromAuth,
      // Older documents may lack settings or carry a name the rules no longer accept.
      ...(!isSettings(data.settings) && { settings }),
      ...((name.length < 1 || name.length > MAX_NAME) && { displayName: fallbackName(user) }),
    })
    return
  }
  await setDoc(ref, {
    ...fromAuth,
    displayName: fallbackName(user),
    settings,
    createdAt: serverTimestamp(),
  })
}

/** Live profile. Returns the unsubscribe function: call it in an effect cleanup. */
export function watchProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError: (error: unknown) => void,
): () => void {
  return onSnapshot(
    profileRef(uid),
    (snapshot) => {
      // 'estimate' fills a just-written serverTimestamp() with local time instead of null.
      const data = snapshot.data({ serverTimestamps: 'estimate' })
      onData(data ? toProfile(data) : null)
    },
    onError,
  )
}

/** Saves the name or the settings. Resolves when the server has accepted the change. */
export async function updateUserProfile(
  uid: string,
  changes: { displayName?: string; settings?: Preferences },
): Promise<void> {
  await updateDoc(profileRef(uid), { ...changes, updatedAt: serverTimestamp() })
}
