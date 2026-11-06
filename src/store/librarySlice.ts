import {
  createEntityAdapter,
  createSelector,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import type * as LibraryService from '../services/libraryService'
import type { LibraryChanges, LibraryEntry, LibraryMedia, LibraryStatus } from '../types/library'
import type { MediaKey } from '../types/media'
import { errorMessage } from '../utils/firebaseErrors'
import { applyChanges, createEntry, filterLibrary, type LibraryQuery } from '../utils/library'
import type { AppThunk, RootState } from './store'

/**
 * Entries are stored normalized: { ids: [...], entities: { tv_1396: {...} } }.
 * Lookup by key is O(1) (title pages ask "is this in my library?"), and `ids`
 * stays sorted by the comparer, most recently changed first.
 */
const libraryAdapter = createEntityAdapter({
  selectId: (entry: LibraryEntry) => entry.key,
  sortComparer: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
})

/** Where the entries come from: nobody yet (auth unknown), this device, or Firestore. */
export type LibrarySource = 'none' | 'guest' | 'account'

export interface LibraryNotice {
  tone: 'success' | 'error'
  text: string
}

const initialState = libraryAdapter.getInitialState({
  source: 'none' as LibrarySource,
  status: 'loading' as 'loading' | 'ready' | 'error',
  error: null as string | null,
  /** A one-off message for a toast: "3 titles synced", "Couldn't save…". */
  notice: null as LibraryNotice | null,
})

const librarySlice = createSlice({
  name: 'library',
  initialState,
  reducers: {
    guestLibraryLoaded(state, action: PayloadAction<LibraryEntry[]>) {
      libraryAdapter.setAll(state, action.payload)
      state.source = 'guest'
      state.status = 'ready'
      state.error = null
    },
    accountLibraryLoading(state) {
      // The previous user's (or the guest's) entries must not flash on screen.
      libraryAdapter.removeAll(state)
      state.source = 'account'
      state.status = 'loading'
      state.error = null
    },
    /** Every Firestore snapshot replaces the whole set: the server copy is the truth. */
    accountLibrarySynced(state, action: PayloadAction<LibraryEntry[]>) {
      libraryAdapter.setAll(state, action.payload)
      state.status = 'ready'
      state.error = null
    },
    librarySyncFailed(state, action: PayloadAction<string>) {
      state.status = 'error'
      state.error = action.payload
    },
    /** "Try again" after a sync error: the listener restarts the subscription. */
    librarySyncRetried() {},
    // Guest writes change the store directly; a listener mirrors them to localStorage.
    guestEntrySaved: libraryAdapter.setOne,
    guestEntryRemoved: libraryAdapter.removeOne,
    libraryNoticeShown(state, action: PayloadAction<LibraryNotice>) {
      state.notice = action.payload
    },
    libraryNoticeDismissed(state) {
      state.notice = null
    },
  },
})

export const {
  guestLibraryLoaded,
  accountLibraryLoading,
  accountLibrarySynced,
  librarySyncFailed,
  librarySyncRetried,
  guestEntrySaved,
  guestEntryRemoved,
  libraryNoticeShown,
  libraryNoticeDismissed,
} = librarySlice.actions

/* ---------- Selectors ---------- */

const selectors = libraryAdapter.getSelectors((state: RootState) => state.library)

export const selectLibraryEntries = selectors.selectAll
export const selectLibraryEntry = (state: RootState, key: MediaKey) =>
  selectors.selectById(state, key)
export const selectLibraryStatus = (state: RootState) => state.library.status
export const selectLibraryError = (state: RootState) => state.library.error
export const selectLibrarySource = (state: RootState) => state.library.source
export const selectLibraryNotice = (state: RootState) => state.library.notice

/** Counts per status for the tabs. Memoized: recomputed only when the entries change. */
export const selectLibraryCounts = createSelector([selectLibraryEntries], (entries) => {
  const counts: Record<LibraryStatus | 'all', number> = {
    all: entries.length,
    plan: 0,
    watching: 0,
    completed: 0,
    dropped: 0,
  }
  for (const entry of entries) counts[entry.status] += 1
  return counts
})

/**
 * Search + filters + sort. Each input selector returns a primitive (or the same entries
 * array), so the result is reused while nothing changed — even if the caller passes
 * a new query object on every render.
 */
export const selectFilteredLibrary = createSelector(
  [
    selectLibraryEntries,
    (_state: RootState, query: LibraryQuery) => query.search,
    (_state: RootState, query: LibraryQuery) => query.status,
    (_state: RootState, query: LibraryQuery) => query.type,
    (_state: RootState, query: LibraryQuery) => query.genre,
    (_state: RootState, query: LibraryQuery) => query.sort,
  ],
  (entries, search, status, type, genre, sort) =>
    filterLibrary(entries, { search, status, type, genre, sort }),
)

/* ---------- Thunks ---------- */

/**
 * Guests: the store is updated right away and mirrored to localStorage.
 * Signed in: the change goes to Firestore. Its local cache fires the snapshot immediately,
 * so the UI updates without waiting for the server; the write promise is not awaited
 * (offline it would wait until reconnect), and a rejection becomes an error toast.
 */
function persist(
  guestChange: () => void,
  // A type-only import: the Firestore code itself is loaded lazily below.
  accountWrite: (service: typeof LibraryService, uid: string) => Promise<void>,
): AppThunk {
  return async (dispatch, getState) => {
    const { library, auth } = getState()
    if (library.source !== 'account' || !auth.user) {
      guestChange()
      return
    }
    const uid = auth.user.uid
    const service = await import('../services/libraryService')
    accountWrite(service, uid).catch((error: unknown) => {
      dispatch(libraryNoticeShown({ tone: 'error', text: errorMessage(error) }))
    })
  }
}

export const addToLibrary =
  (media: LibraryMedia, status: LibraryStatus = 'plan'): AppThunk =>
  (dispatch) => {
    const entry = createEntry(media, status, new Date().toISOString())
    return dispatch(
      persist(
        () => dispatch(guestEntrySaved(entry)),
        (service, uid) => service.addEntry(uid, entry),
      ),
    )
  }

export const updateLibraryEntry =
  (key: MediaKey, changes: LibraryChanges): AppThunk =>
  (dispatch, getState) => {
    const entry = selectLibraryEntry(getState(), key)
    if (!entry) return Promise.resolve()

    const next = applyChanges(entry, changes, new Date().toISOString())
    const completed =
      next.status === 'completed' && entry.status !== 'completed'
        ? 'set'
        : next.status !== 'completed' && entry.status === 'completed'
          ? 'clear'
          : 'keep'

    return dispatch(
      persist(
        () => dispatch(guestEntrySaved(next)),
        (service, uid) => service.updateEntry(uid, key, changes, completed),
      ),
    )
  }

/** Removes an entry and returns it, so the caller can offer "Undo". */
export const removeFromLibrary =
  (key: MediaKey): AppThunk<Promise<LibraryEntry | null>> =>
  async (dispatch, getState) => {
    const entry = selectLibraryEntry(getState(), key)
    if (!entry) return null
    await dispatch(
      persist(
        () => dispatch(guestEntryRemoved(key)),
        (service, uid) => service.removeEntry(uid, key),
      ),
    )
    return entry
  }

/** "Undo" for a removal: the entry comes back with its original dates. */
export const restoreLibraryEntry =
  (entry: LibraryEntry): AppThunk =>
  (dispatch) =>
    dispatch(
      persist(
        () => dispatch(guestEntrySaved(entry)),
        (service, uid) => service.restoreEntry(uid, entry),
      ),
    )

export default librarySlice
