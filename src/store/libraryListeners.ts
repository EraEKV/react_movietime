import i18n from '../shared/i18n'
import { isAnyOf, TaskAbortError } from '@reduxjs/toolkit'
import {
  clearGuestLibrary,
  LIBRARY_KEY,
  loadGuestLibrary,
  migrateLegacyWatchlist,
  saveGuestLibrary,
} from '../storage/libraryStorage'
import { errorMessage } from '../utils/firebaseErrors'
import { startAppListening } from './listenerMiddleware'
import {
  accountLibraryLoading,
  accountLibrarySynced,
  guestEntryRemoved,
  guestEntrySaved,
  guestLibraryLoaded,
  libraryNoticeShown,
  librarySyncFailed,
  librarySyncRetried,
  selectLibraryEntries,
} from './librarySlice'
import type { AppDispatch, RootState } from './store'

/**
 * Library side effects. Reducers stay pure; everything that talks to Firestore or
 * localStorage happens here.
 */
export function registerLibraryListeners(getState: () => RootState, dispatch: AppDispatch) {
  // The midterm watchlist becomes part of the guest library once, before anything reads it.
  migrateLegacyWatchlist()

  /**
   * Runs when auth settles for the first time and whenever the user changes
   * (guest → user, user → guest, user A → user B). Token refreshes keep the same uid,
   * so they don't restart the subscription. "Try again" after an error restarts it too.
   */
  startAppListening({
    predicate: (action, current, previous) =>
      current.auth.status !== 'loading' &&
      (previous.auth.status === 'loading' ||
        current.auth.user?.uid !== previous.auth.user?.uid ||
        librarySyncRetried.match(action)),
    effect: async (_action, api) => {
      // Like takeLatest: a newer run stops this one's subscription (see the finally block).
      api.cancelActiveListeners()

      const uid = api.getState().auth.user?.uid
      if (!uid) {
        api.dispatch(guestLibraryLoaded(loadGuestLibrary()))
        return
      }

      api.dispatch(accountLibraryLoading())
      let unsubscribe: (() => void) | undefined
      try {
        // pause() rejects if this run gets cancelled while waiting (the user signed out).
        const service = await api.pause(import('../services/libraryService'))

        // First sign-in on this device: titles saved as a guest move into the account.
        const guestEntries = loadGuestLibrary()
        if (guestEntries.length > 0) {
          try {
            const { added } = await api.pause(service.mergeGuestLibrary(uid, guestEntries))
            clearGuestLibrary()
            if (added > 0) {
              api.dispatch(
                libraryNoticeShown({
                  tone: 'success',
                  text: i18n.t('notice.synced', { count: added }),
                }),
              )
            }
          } catch (error) {
            if (error instanceof TaskAbortError) throw error
            // Keep the guest copy, so nothing is lost; the next sign-in tries again.
            console.warn('Could not move the guest library', error)
          }
        }

        unsubscribe = service.watchLibrary(
          uid,
          (entries) => api.dispatch(accountLibrarySynced(entries)),
          (error) => api.dispatch(librarySyncFailed(errorMessage(error))),
        )
        // Keep the subscription open until a newer run cancels this one.
        await api.condition(() => false)
      } catch (error) {
        if (!(error instanceof TaskAbortError)) {
          api.dispatch(librarySyncFailed(errorMessage(error)))
        }
      } finally {
        // Cleanup, like an effect's return function: no snapshots for a signed-out user.
        unsubscribe?.()
      }
    },
  })

  // Guest changes are mirrored to localStorage.
  startAppListening({
    matcher: isAnyOf(guestEntrySaved, guestEntryRemoved),
    effect: (_action, api) => {
      if (api.getState().library.source === 'guest') {
        saveGuestLibrary(selectLibraryEntries(api.getState()))
      }
    },
  })

  // Another tab changed the guest library → load its version. The app lives as long as
  // the page, so this listener is never removed.
  window.addEventListener('storage', (event) => {
    if (event.key === LIBRARY_KEY && getState().library.source === 'guest') {
      dispatch(guestLibraryLoaded(loadGuestLibrary()))
    }
  })
}
