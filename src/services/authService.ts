import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onIdTokenChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import type { AuthUser } from '../types/auth'
import { auth } from './firebase'

// Thin wrappers over Firebase Auth. Components never import 'firebase/auth' directly:
// the store's thunks call these, so the SDK stays behind one module.

/** Firebase `User` → plain serializable object for the store. */
export function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    providers: user.providerData.map((p) => p.providerId),
  }
}

export function currentUser(): User | null {
  return auth.currentUser
}

/**
 * onIdTokenChanged, not onAuthStateChanged: it also fires when the ID token is refreshed,
 * e.g. after email verification, so `emailVerified` in the app (and in Firestore rules,
 * which read the token) stays current. It fires once at startup with the restored session.
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onIdTokenChanged(auth, callback)
}

export async function signUpWithEmail(
  displayName: string,
  email: string,
  password: string,
): Promise<User> {
  const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password)
  await updateProfile(user, { displayName: displayName.trim() })
  await sendEmailVerification(user)
  return user
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const { user } = await signInWithEmailAndPassword(auth, email.trim(), password)
  return user
}

/**
 * Popup, not redirect: redirect sign-in needs the auth domain to match the app's domain
 * (third-party storage is blocked on the Vercel domain), the popup works everywhere.
 */
export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const { user } = await signInWithPopup(auth, provider)
  return user
}

export function signOutUser(): Promise<void> {
  return signOut(auth)
}

export function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email.trim())
}

export async function resendVerification(): Promise<void> {
  const user = auth.currentUser
  if (user) await sendEmailVerification(user)
}

/**
 * Picks up a verification done in another tab or on the phone: reload() refreshes the user,
 * getIdToken(true) gets a token with email_verified = true (rules read that one).
 * The new token fires onIdTokenChanged, so the store updates by itself.
 */
export async function refreshUser(): Promise<User | null> {
  const user = auth.currentUser
  if (!user) return null
  await reload(user)
  await user.getIdToken(true)
  return user
}
