import { useMemo } from 'react'
import { librarySyncRetried } from '../store/librarySlice'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { selectLibraryDashboard } from '../store/statsSelectors'
import { localToday, weekdayOf } from '../utils/calendar'
import {
  periodStart,
  planStats,
  sessionsByWeekday,
  topGenres,
  upcomingSessions,
  type StatsPeriod,
} from '../utils/stats'
import { useAuth } from './useAuth'
import { useGenres } from './useGenres'
import { useLibrary } from './useLibrary'
import { useDashboardPlans } from './usePlanner'

/**
 * Everything the dashboard shows, for one period. The numbers come from utils/stats;
 * this hook only gathers the inputs and memoizes the results:
 * - the library half is a createSelector (statsSelectors), shared Redux data;
 * - genres and plan figures use useMemo, because their inputs (TMDB genre names, live
 *   plan sessions) live in hooks, not in the store. They recompute when the period, the
 *   sessions snapshot or the names change — not on every render of the page.
 */
export function useDashboardStats(period: StatsPeriod) {
  const dispatch = useAppDispatch()
  const { status: authStatus, user } = useAuth()
  const { status, isGuest } = useLibrary()
  const today = localToday()
  const start = periodStart(period, today)
  const library = useAppSelector((state) => selectLibraryDashboard(state, start))

  // Movie and TV genre lists share most ids (18 = Drama in both), so one Map is enough.
  const movieGenres = useGenres('movie')
  const tvGenres = useGenres('tv')
  const genreNames = useMemo(
    () => new Map([...tvGenres.genresById, ...movieGenres.genresById]),
    [movieGenres.genresById, tvGenres.genresById],
  )
  const genres = useMemo(
    () => topGenres(library.entries, genreNames),
    [library.entries, genreNames],
  )
  const genresStatus =
    movieGenres.status === 'error' && tvGenres.status === 'error'
      ? 'error'
      : movieGenres.status === 'success' || tvGenres.status === 'success'
        ? 'ready'
        : 'loading'

  const {
    plans,
    sessions,
    status: sessionsStatus,
    error: sessionsError,
    retry,
  } = useDashboardPlans()
  const planned = useMemo(() => {
    if (!plans.plans || !sessions) return null
    return {
      stats: planStats(plans.plans, sessions, plans.sharedIds, today),
      weekdays: sessionsByWeekday(sessions, start, today),
      upcoming: upcomingSessions(sessions, today),
    }
  }, [plans.plans, plans.sharedIds, sessions, start, today])

  const plansStatus =
    authStatus === 'loading'
      ? 'loading'
      : !user
        ? 'guest'
        : plans.status === 'error' || sessionsStatus === 'error'
          ? 'error'
          : planned
            ? 'ready'
            : 'loading'

  return {
    today,
    todayWeekday: weekdayOf(today),
    library: {
      status,
      isGuest,
      ...library,
      retry: () => dispatch(librarySyncRetried()),
    },
    genres: {
      status: genresStatus,
      bars: genres,
      retry: () => {
        movieGenres.reload()
        tvGenres.reload()
      },
    },
    plans: {
      status: plansStatus,
      error: plans.error ?? sessionsError,
      ...planned,
      retry: () => {
        plans.retry()
        retry()
      },
    },
  } as const
}
