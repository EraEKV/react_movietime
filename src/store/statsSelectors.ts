import { createSelector } from '@reduxjs/toolkit'
import { byMediaType, byStatus, entriesInPeriod, libraryStats } from '../utils/stats'
import { selectLibraryEntries } from './librarySlice'
import type { RootState } from './store'

/**
 * The library half of the dashboard for one period start (null = all time).
 *
 * Memoized with createSelector: useAppSelector runs the selector after every dispatch
 * anywhere in the app (a toast, a theme change), and returning a new object each time
 * would re-render the dashboard for nothing. Here the work runs again only when the
 * entries array or the start day changes; otherwise the same result object comes back.
 * Both inputs are a stable reference and a string, so the cache isn't broken by
 * the caller creating new arguments on every render.
 */
export const selectLibraryDashboard = createSelector(
  [selectLibraryEntries, (_state: RootState, start: string | null) => start],
  (entries, start) => {
    const scoped = entriesInPeriod(entries, start)
    return {
      entries: scoped,
      stats: libraryStats(scoped),
      byStatus: byStatus(scoped),
      byType: byMediaType(scoped),
      /** The whole library is empty (not just the period): show the welcome state. */
      isEmpty: entries.length === 0,
    }
  },
)
