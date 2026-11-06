import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { app, useEmulators } from './firebase'

// A separate module from ./firebase on purpose: the Firestore SDK is large, and only
// lazy-loaded pages and the sign-in profile sync import it, so it gets its own chunk
// instead of slowing down the first paint.

// Persistent cache (IndexedDB): data read once stays available offline, writes made offline
// are queued and sent on reconnect. The multi-tab manager lets several tabs share one cache.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

if (useEmulators) connectFirestoreEmulator(db, '127.0.0.1', 8180)
