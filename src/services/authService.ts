import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onIdTokenChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import type { AuthUser } from '../types/auth'
import { currentEnvironment, markRedirectStarted, shouldRedirect } from '../utils/signInMode'
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
 * Google sign-in. Desktop browsers use a popup. Phones and the installed app use a redirect:
 * a popup there is blocked or opens inside the app (iPhone), without a proper account
 * chooser. A redirect leaves the page, so this resolves to 'redirecting' and the result is
 * picked up on return by `finishGoogleRedirect`. Redirect needs `authDomain` to be the app's
 * own domain (the /__/auth proxy in vercel.json), see docs/FIREBASE_SETUP.md.
 */
export async function signInWithGoogle(): Promise<User | 'redirecting'> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  if (shouldRedirect(currentEnvironment())) return redirectToGoogle(provider)
  try {
    const { user } = await signInWithPopup(auth, provider)
    return user
  } catch (error) {
    // A desktop browser that blocks popups still gets in.
    if (isErrorCode(error, 'auth/popup-blocked')) return redirectToGoogle(provider)
    throw error
  }
}

async function redirectToGoogle(provider: GoogleAuthProvider): Promise<'redirecting'> {
  markRedirectStarted()
  await signInWithRedirect(auth, provider)
  return 'redirecting'
}

const isErrorCode = (error: unknown, code: string) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === code

/** After coming back from Google: the signed-in user, or null when nothing was pending. */
export async function finishGoogleRedirect(): Promise<User | null> {
  const result = await getRedirectResult(auth)
  return result?.user ?? null
}

export function signOutUser(): Promise<void> {
  return signOut(auth)
}

export function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email.trim())
}

/** The Auth side of a new display name (users/{uid} is saved by profileService). */
export async function updateDisplayName(name: string): Promise<void> {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in')
  await updateProfile(user, { displayName: name })
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
