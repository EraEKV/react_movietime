/** A Firestore write error → a sentence for the user. */
export function listErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null
  if (code === 'permission-denied') return 'You don’t have permission to change this list.'
  if (code === 'not-found') return 'This list no longer exists.'
  return 'We couldn’t save your changes. Check your connection and try again.'
}

/** Writes wait for the server (to show a real result), so refuse early when offline. */
export const OFFLINE_MESSAGE = 'You’re offline. Connect to the internet to save changes.'
