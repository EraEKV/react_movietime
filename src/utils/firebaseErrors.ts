import type { AuthError } from '../types/auth'

// Firebase error codes → text a person can act on. Unknown codes fall back to a generic line.
const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Wrong email or password. Check both and try again.',
  'auth/wrong-password': 'Wrong email or password. Check both and try again.',
  'auth/user-not-found': 'Wrong email or password. Check both and try again.',
  'auth/invalid-email': 'Enter an email like name@example.com.',
  'auth/email-already-in-use':
    'An account with this email already exists. Sign in instead, or use another email.',
  'auth/weak-password': 'Use 8+ characters with a number and a special character.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/popup-closed-by-user':
    'The Google window was closed before you finished. Try again, or use email instead.',
  'auth/popup-blocked': 'Your browser blocked the Google window. Allow pop-ups and try again.',
  'auth/unauthorized-domain': 'Sign-in isn’t enabled for this site address yet.',
  'auth/account-exists-with-different-credential':
    'This email is already registered with another sign-in method. Use that one.',
  'auth/requires-recent-login': 'Sign in again to continue.',
  'permission-denied': 'You don’t have access to this.',
  unavailable: 'The server can’t be reached. Check your connection and try again.',
}

const FALLBACK = 'Something went wrong. Try again.'

/** Firebase errors carry a string `code`; anything else is unknown to us. */
function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code } = error
    if (typeof code === 'string') return code
  }
  return 'unknown'
}

export function toAuthError(error: unknown): AuthError {
  const code = errorCode(error)
  return { code, message: MESSAGES[code] ?? FALLBACK }
}

/** Which form field an error belongs to; null → show it in a banner above the form. */
export function errorField(code: string): 'email' | 'password' | null {
  switch (code) {
    case 'auth/invalid-email':
    case 'auth/email-already-in-use':
    case 'auth/user-disabled':
      return 'email'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/weak-password':
      return 'password'
    default:
      return null
  }
}

/** The user closed the popup themselves: worth a gentle note, not an error tone. */
export function isPopupDismissed(code: string): boolean {
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request'
}

/** Just the text, for errors that are shown in a toast (Firestore writes, sync failures). */
export function errorMessage(error: unknown): string {
  return toAuthError(error).message
}
