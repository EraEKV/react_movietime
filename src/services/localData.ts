// What a signed-in user leaves on the device, and how it is removed on sign-out.
//
// Firestore keeps a persistent cache in IndexedDB (src/services/firestore.ts): the profile
// (name, email), the library, lists, plans and notifications read so far. Firebase Auth
// drops its own session on signOut, but this cache is not touched by it, so on a shared
// computer the next person could read the previous user's data from the browser's storage.

/** Per-account flag written by the welcome-email listener (store/listeners.ts). */
const WELCOMED_PREFIX = 'movietime.welcomed.'

/**
 * Deletes the Firestore cache of this browser. The SDK allows it only while it is stopped,
 * so Firestore is terminated first: it cannot be used again until the page is reloaded
 * (the caller reloads). Best effort: another open tab may hold the database, and a failure
 * must not stop the sign-out.
 */
export async function clearAccountData(): Promise<void> {
  try {
    const { terminate, clearIndexedDbPersistence } = await import('firebase/firestore')
    const { db } = await import('./firestore')
    await terminate(db)
    await clearIndexedDbPersistence(db)
  } catch (error) {
    console.warn('Could not clear the local copy of the account data', error)
  }
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(WELCOMED_PREFIX)) localStorage.removeItem(key)
    }
  } catch {
    // Storage is unavailable: there is nothing stored to remove.
  }
}
