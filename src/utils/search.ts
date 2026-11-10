import type { MediaSummary } from '../types/media'
import type { CollectionSearchItem, PersonSearchItem } from '../types/tmdb'

export interface PersonHit {
  id: number
  name: string
  photoPath: string | null
  /** TMDB's "known for" craft: Acting, Directing, Writing… */
  department: string
}

export interface CollectionHit {
  id: number
  name: string
  posterPath: string | null
}

/** Everything the header search offers for one query. */
export interface SiteSearchData {
  titles: MediaSummary[]
  people: PersonHit[]
  collections: CollectionHit[]
}

/** How many rows each group gets in the dropdown: it must stay a quick jump, not a page. */
export const SEARCH_LIMITS = { titles: 4, people: 3, collections: 2 } as const

export function toPersonHit(item: PersonSearchItem): PersonHit {
  return {
    id: item.id,
    name: item.name,
    photoPath: item.profile_path,
    department: item.known_for_department ?? '',
  }
}

export function toCollectionHit(item: CollectionSearchItem): CollectionHit {
  return { id: item.id, name: item.name, posterPath: item.poster_path }
}

/** Cuts every group to its share of the dropdown. */
export function limitHits(data: SiteSearchData): SiteSearchData {
  return {
    titles: data.titles.slice(0, SEARCH_LIMITS.titles),
    people: data.people.slice(0, SEARCH_LIMITS.people),
    collections: data.collections.slice(0, SEARCH_LIMITS.collections),
  }
}

export const hitCount = (data: SiteSearchData) =>
  data.titles.length + data.people.length + data.collections.length
