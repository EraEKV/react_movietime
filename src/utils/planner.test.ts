import { describe, expect, it } from 'vitest'
import type { LibraryMedia } from '../types/library'
import { buildSchedule } from './schedule'
import { moviePlanDraft } from './planner'

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
