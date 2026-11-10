import { describe, expect, it } from 'vitest'
import type { LibraryMedia } from '../types/library'
import { buildSchedule } from './schedule'
import type { PlanUnit } from '../types/plan'
import {
  applyOrder,
  isSourceOrder,
  moveUnit,
  moviePlanDraft,
  scheduleLabel,
  sourceIdOf,
} from './planner'

const media: LibraryMedia = {
  mediaType: 'movie',
  tmdbId: 603,
  title: 'The Matrix',
  posterPath: '/m.jpg',
  year: '1999',
  runtime: 136,
  totalEpisodes: null,
  genreIds: [],
  tmdbRating: 8.7,
}

describe('moviePlanDraft', () => {
  const draft = moviePlanDraft(media, '2026-11-14', '20:30')

  it('is one movie plan with one unit and no recurrence', () => {
    expect(draft.kind).toBe('movie')
    expect(draft.units).toHaveLength(1)
    expect(draft.units[0]?.mediaKey).toBe('movie_603')
    expect(draft.sourceListId).toBeNull()
  })
  it('schedules exactly one session on that day and time', () => {
    const sessions = buildSchedule(draft.units, draft.options)
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({ date: '2026-11-14', time: '20:30', minutes: 136 })
  })
})

describe('sourceIdOf', () => {
  it('stores the list id, a collection marker, or nothing for a series', () => {
    expect(sourceIdOf({ kind: 'list', id: 'abc' })).toBe('abc')
    expect(sourceIdOf({ kind: 'person', id: 525 })).toBe('person:525')
    expect(sourceIdOf({ kind: 'collection', id: 10 })).toBe('collection:10')
    expect(sourceIdOf({ kind: 'series', id: 1396 })).toBeNull()
    expect(sourceIdOf(null)).toBeNull()
  })
})

describe('marathon order', () => {
  const film = (id: number): PlanUnit => ({
    mediaKey: `movie_${id}`,
    title: `Film ${id}`,
    season: null,
    episode: null,
    ordinal: null,
    runtime: 100,
    media: null,
  })
  const units = [film(1), film(2), film(3), film(4)]
  const ids = (list: PlanUnit[]) => list.map((u) => u.mediaKey)

  it('keeps the source order without a chosen order', () => {
    expect(applyOrder(units, null)).toBe(units)
  })

  it('follows the chosen order', () => {
    const ordered = applyOrder(units, ['movie_3', 'movie_1', 'movie_4', 'movie_2'])
    expect(ids(ordered)).toEqual(['movie_3', 'movie_1', 'movie_4', 'movie_2'])
  })

  it('puts films the order does not mention after the listed ones, in source order', () => {
    expect(ids(applyOrder(units, ['movie_4', 'movie_2']))).toEqual([
      'movie_4',
      'movie_2',
      'movie_1',
      'movie_3',
    ])
  })

  it('ignores keys that are no longer in the source', () => {
    expect(ids(applyOrder(units, ['movie_99', 'movie_2']))).toEqual([
      'movie_2',
      'movie_1',
      'movie_3',
      'movie_4',
    ])
  })

  it('does not change the input', () => {
    const copy = [...units]
    applyOrder(units, ['movie_4'])
    expect(units).toEqual(copy)
  })

  it('moves a film to where another one is, shifting the ones between', () => {
    expect(moveUnit(units, 'movie_1', 'movie_3')).toEqual([
      'movie_2',
      'movie_3',
      'movie_1',
      'movie_4',
    ])
    expect(moveUnit(units, 'movie_4', 'movie_2')).toEqual([
      'movie_1',
      'movie_4',
      'movie_2',
      'movie_3',
    ])
  })

  it('changes nothing for the same or an unknown key', () => {
    const same = ['movie_1', 'movie_2', 'movie_3', 'movie_4']
    expect(moveUnit(units, 'movie_2', 'movie_2')).toEqual(same)
    expect(moveUnit(units, 'movie_9', 'movie_2')).toEqual(same)
    expect(moveUnit(units, 'movie_2', 'movie_9')).toEqual(same)
  })

  it('tells whether the order is still the source order', () => {
    expect(isSourceOrder(units, units)).toBe(true)
    expect(isSourceOrder(applyOrder(units, ['movie_2']), units)).toBe(false)
    expect(isSourceOrder(units.slice(1), units)).toBe(false)
  })
})

describe('scheduleLabel', () => {
  it('names the days and the usual time', () => {
    expect(scheduleLabel({ weekdays: [5, 6, 0], time: '21:00' })).toBe('Fri, Sat, Sun at 21:00')
  })
  it('puts weekdays with their own time in a group of their own', () => {
    expect(scheduleLabel({ weekdays: [5, 6, 0], time: '21:00', times: { 5: '22:30' } })).toBe(
      'Sat, Sun at 21:00 · Fri at 22:30',
    )
  })
})
