import { describe, expect, it } from 'vitest'
import type { LibraryEntry } from '../types/library'
import { filterLibrary, reorderUpdates, type LibraryQuery } from './library'

function entry(id: number, order: number | null, addedAt = '2026-01-01T00:00:00.000Z') {
  return {
    key: `movie_${id}`,
    mediaType: 'movie',
    tmdbId: id,
    title: `Title ${id}`,
    posterPath: null,
    year: null,
    genreIds: [],
    tmdbRating: null,
    runtime: null,
    totalEpisodes: null,
    status: 'plan',
    score: null,
    notes: '',
    progress: null,
    addedAt,
    updatedAt: addedAt,
    completedAt: null,
    order,
  } as LibraryEntry
}

const query: LibraryQuery = { search: '', status: 'all', type: 'all', genre: '', sort: 'manual' }
const keys = (entries: LibraryEntry[]) => entries.map((e) => e.key)

describe('manual order', () => {
  it('puts ordered titles first, then the rest with the newest added on top', () => {
    const entries = [
      entry(1, null, '2026-01-01T00:00:00.000Z'),
      entry(2, 1),
      entry(3, null, '2026-02-01T00:00:00.000Z'),
      entry(4, 0),
    ]
    expect(keys(filterLibrary(entries, query))).toEqual([
      'movie_4',
      'movie_2',
      'movie_3',
      'movie_1',
    ])
  })

  it('moving a title down puts it after the target; only changed places are returned', () => {
    const entries = [entry(1, 0), entry(2, 1), entry(3, 2), entry(4, 3)]
    expect(reorderUpdates(entries, 'movie_1', 'movie_3')).toEqual([
      { key: 'movie_2', order: 0 },
      { key: 'movie_3', order: 1 },
      { key: 'movie_1', order: 2 },
    ])
  })

  it('moving a title up puts it before the target', () => {
    const entries = [entry(1, 0), entry(2, 1), entry(3, 2)]
    expect(reorderUpdates(entries, 'movie_3', 'movie_1')).toEqual([
      { key: 'movie_3', order: 0 },
      { key: 'movie_1', order: 1 },
      { key: 'movie_2', order: 2 },
    ])
  })

  it('numbers titles that were never moved, so the first drag fixes the whole order', () => {
    const entries = [
      entry(1, null, '2026-01-01T00:00:00.000Z'),
      entry(2, null, '2026-02-01T00:00:00.000Z'),
    ]
    // Shown as 2, 1 → dragging 1 onto 2 makes it first.
    expect(reorderUpdates(entries, 'movie_1', 'movie_2')).toEqual([
      { key: 'movie_1', order: 0 },
      { key: 'movie_2', order: 1 },
    ])
  })

  it('does nothing for the same or an unknown title', () => {
    const entries = [entry(1, 0), entry(2, 1)]
    expect(reorderUpdates(entries, 'movie_1', 'movie_1')).toEqual([])
    expect(reorderUpdates(entries, 'movie_1', 'movie_9')).toEqual([])
  })
})
