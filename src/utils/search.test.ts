import { describe, expect, it } from 'vitest'
import type { MediaSummary } from '../types/media'
import {
  hitCount,
  limitHits,
  SEARCH_LIMITS,
  toCollectionHit,
  toPersonHit,
  type SiteSearchData,
} from './search'

const title = (id: number): MediaSummary => ({
  mediaType: 'movie',
  id,
  title: `T${id}`,
  posterPath: null,
  date: '',
  rating: 0,
  genreIds: [],
})

describe('search hits', () => {
  it('maps a person and a collection to what the dropdown needs', () => {
    expect(
      toPersonHit({
        id: 6384,
        name: 'Keanu Reeves',
        profile_path: '/k.jpg',
        known_for_department: 'Acting',
        popularity: 50,
      }),
    ).toEqual({ id: 6384, name: 'Keanu Reeves', photoPath: '/k.jpg', department: 'Acting' })
    expect(
      toCollectionHit({
        id: 10,
        name: 'Star Wars Collection',
        poster_path: '/s.jpg',
        backdrop_path: null,
        overview: '',
      }),
    ).toEqual({ id: 10, name: 'Star Wars Collection', posterPath: '/s.jpg' })
  })

  it('copes with a person that has no department', () => {
    const hit = toPersonHit({
      id: 1,
      name: 'X',
      profile_path: null,
      popularity: 0,
    } as Parameters<typeof toPersonHit>[0])
    expect(hit.department).toBe('')
  })

  it('cuts every group to its share and counts what is left', () => {
    const data: SiteSearchData = {
      titles: Array.from({ length: 10 }, (_, i) => title(i)),
      people: Array.from({ length: 10 }, (_, i) => ({
        id: i,
        name: 'P',
        photoPath: null,
        department: '',
      })),
      collections: Array.from({ length: 10 }, (_, i) => ({ id: i, name: 'C', posterPath: null })),
    }
    const limited = limitHits(data)
    expect(limited.titles).toHaveLength(SEARCH_LIMITS.titles)
    expect(limited.people).toHaveLength(SEARCH_LIMITS.people)
    expect(limited.collections).toHaveLength(SEARCH_LIMITS.collections)
    expect(hitCount(limited)).toBe(
      SEARCH_LIMITS.titles + SEARCH_LIMITS.people + SEARCH_LIMITS.collections,
    )
  })

  it('counts nothing for an empty result', () => {
    expect(hitCount({ titles: [], people: [], collections: [] })).toBe(0)
  })
})
