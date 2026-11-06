import i18n, { type TranslationKey } from '../i18n'
import type { AuthError } from '../types/auth'

// Firebase error codes → text a person can act on (keys of the common dictionary).
// Unknown codes fall back to a generic line.
const MESSAGES: Record<string, TranslationKey> = {
  'auth/invalid-credential': 'errors.wrongCredentials',
  'auth/wrong-password': 'errors.wrongCredentials',
  'auth/user-not-found': 'errors.wrongCredentials',
  'auth/invalid-email': 'errors.invalidEmail',
  'auth/email-already-in-use': 'errors.emailInUse',
  'auth/weak-password': 'errors.weakPassword',
  'auth/user-disabled': 'errors.userDisabled',
  'auth/too-many-requests': 'errors.tooManyRequests',
  'auth/network-request-failed': 'errors.noConnection',
  'auth/popup-closed-by-user': 'errors.popupClosed',
  'auth/popup-blocked': 'errors.popupBlocked',
  'auth/unauthorized-domain': 'errors.unauthorizedDomain',
  'auth/account-exists-with-different-credential': 'errors.accountExists',
  'auth/requires-recent-login': 'errors.recentLogin',
  'permission-denied': 'errors.permissionDenied',
  unavailable: 'errors.unavailable',
}

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
  // Translated when the error happens; a message already on screen keeps its language.
  return { code, message: i18n.t(MESSAGES[code] ?? 'errors.fallback') }
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
