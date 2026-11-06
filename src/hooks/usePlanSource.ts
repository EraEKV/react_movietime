import type { LibraryMedia } from '../types/library'
import type { PlanUnit } from '../types/plan'
import { loadPlannerService } from './usePlanner'
import { useRequest } from '../shared/hooks/useRequest'

/** What the stepper plans: a series or a list of movies. */
export type SourcePick =
  | { kind: 'series'; id: number; title: string; posterPath: string | null }
  | { kind: 'list'; id: string; title: string; posterPath: string | null }

export interface LoadedSource {
  /** Series or list name. */
  name: string
  posterPath: string | null
  media: LibraryMedia | null
  units: PlanUnit[]
  /** Series in a list (left out of a movie marathon). */
  skipped: number
}

/**
 * Loads the episodes or movies of the picked source from TMDB (and the list from
 * Firestore). useRequest aborts the old request when the pick changes, so a slow series
 * can't overwrite the one picked after it.
 */
export function usePlanSource(pick: SourcePick | null) {
  const key = pick ? `plan-source:${pick.kind}:${pick.id}` : null
  return useRequest<LoadedSource>(key, async (_key, signal) => {
    const service = await loadPlannerService()
    if (!pick) throw new Error('Nothing picked')
    if (pick.kind === 'series') {
      const { media, units } = await service.loadSeriesEpisodes(pick.id, signal)
      return { name: media.title, posterPath: media.posterPath, media, units, skipped: 0 }
    }
    const list = await service.loadListMovies(pick.id, signal)
    return { ...list, media: null }
  })
}
