import type { LibraryMedia } from '../types/library'
import type { PlanUnit } from '../types/plan'
import { loadPlannerService } from './usePlanner'
import { useRequest } from '../shared/hooks/useRequest'

/**
 * What the stepper plans: a series, one movie, the movies of a list, the films of a collection or the
 * films a person directed.
 */
export type SourcePick =
  | { kind: 'series'; id: number; title: string; posterPath: string | null }
  | { kind: 'movie'; id: number; title: string; posterPath: string | null }
  | { kind: 'list'; id: string; title: string; posterPath: string | null }
  | { kind: 'collection'; id: number; title: string; posterPath: string | null }
  | { kind: 'person'; id: number; title: string; posterPath: string | null }

/** What step 1 lets you choose between: a collection or a director only arrives from its own page. */
export type PickerKind = Exclude<SourcePick['kind'], 'collection' | 'person'>

export interface LoadedSource {
  /** Series, list or collection name. */
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
    if (pick.kind === 'movie') return service.loadMovie(pick.id, signal)
    const source =
      pick.kind === 'collection'
        ? await service.loadCollectionMovies(pick.id, signal)
        : pick.kind === 'person'
          ? await service.loadPersonMovies(pick.id, signal)
          : await service.loadListMovies(pick.id, signal)
    return { ...source, media: null }
  })
}
