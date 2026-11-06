import {
  addToLibrary,
  removeFromLibrary,
  restoreLibraryEntry,
  selectLibraryEntries,
  selectLibraryEntry,
  selectLibraryError,
  selectLibrarySource,
  selectLibraryStatus,
  updateLibraryEntry,
} from '../store/librarySlice'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import type { LibraryChanges, LibraryEntry, LibraryMedia, LibraryStatus } from '../types/library'
import type { MediaKey } from '../types/media'

/**
 * The library for components: entries and status from Redux plus actions.
 * Components don't know whether the data lives in localStorage (guest) or Firestore.
 */
export function useLibrary() {
  const dispatch = useAppDispatch()
  const entries = useAppSelector(selectLibraryEntries)
  const status = useAppSelector(selectLibraryStatus)
  const error = useAppSelector(selectLibraryError)
  const source = useAppSelector(selectLibrarySource)

  return {
    entries,
    status,
    error,
    /** True until the account library takes over (also while auth is still loading). */
    isGuest: source !== 'account',
    add: (media: LibraryMedia, nextStatus?: LibraryStatus) =>
      dispatch(addToLibrary(media, nextStatus)),
    update: (key: MediaKey, changes: LibraryChanges) => dispatch(updateLibraryEntry(key, changes)),
    remove: (key: MediaKey) => dispatch(removeFromLibrary(key)),
    restore: (entry: LibraryEntry) => dispatch(restoreLibraryEntry(entry)),
  }
}

/** One entry by key; re-renders only when that entry changes. */
export function useLibraryEntry(key: MediaKey | null): LibraryEntry | undefined {
  return useAppSelector((state) => (key ? selectLibraryEntry(state, key) : undefined))
}
