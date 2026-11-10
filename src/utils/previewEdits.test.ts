import { describe, expect, it } from 'vitest'
import type { PlanUnit, ScheduleOptions } from '../types/plan'
import {
  applyMoves,
  applyTimes,
  canMoveTo,
  marathonMoves,
  moveFilmTo,
  removeFilm,
  sessionKey,
} from './previewEdits'
import { buildSchedule } from './schedule'

const film = (id: number): PlanUnit => ({
  mediaKey: `movie_${id}` as PlanUnit['mediaKey'],
  title: `Film ${id}`,
  season: null,
  episode: null,
  ordinal: null,
  runtime: 100,
  media: null,
})
const films = [film(1), film(2), film(3)]
// Mon, Wed, Fri evenings from Monday 2026-11-09.
const options: ScheduleOptions = {
  startDate: '2026-11-09',
  weekdays: [1, 3, 5],
  time: '21:00',
  perSession: 1,
}
const base = buildSchedule(films, options)
const dates = (sessions: { date: string }[]) => sessions.map((s) => s.date)

describe('applyMoves', () => {
  it('keeps the generated schedule without moves', () => {
    expect(dates(applyMoves(base, {}, true))).toEqual(['2026-11-09', '2026-11-11', '2026-11-13'])
  })

  it('moves a film and sorts the marathon by date', () => {
    const result = applyMoves(base, { movie_1: '2026-11-14' }, true)
    expect(result.map((s) => s.units[0]?.title)).toEqual(['Film 2', 'Film 3', 'Film 1'])
    expect(result.map((s) => s.index)).toEqual([0, 1, 2])
  })

  it('keeps series episodes in place', () => {
    const result = applyMoves(base, { '1': '2026-11-12' }, false)
    expect(result.map((s) => s.units[0]?.title)).toEqual(['Film 1', 'Film 2', 'Film 3'])
    expect(result[1]?.date).toBe('2026-11-12')
  })
})

describe('canMoveTo', () => {
  it('never allows the past', () => {
    expect(canMoveTo(base, 'movie_1', '2026-11-01', true, '2026-11-09')).toBe(false)
  })
  it('lets a marathon film land on any day from today', () => {
    expect(canMoveTo(base, 'movie_1', '2026-12-24', true, '2026-11-09')).toBe(true)
  })
  it('keeps a series session between its neighbours', () => {
    expect(canMoveTo(base, '1', '2026-11-12', false, '2026-11-09')).toBe(true)
    expect(canMoveTo(base, '1', '2026-11-08', false, '2026-11-01')).toBe(false)
    expect(canMoveTo(base, '1', '2026-11-14', false, '2026-11-09')).toBe(false)
    expect(canMoveTo(base, '0', '2026-11-10', false, '2026-11-09')).toBe(true)
  })
})

describe('film edits', () => {
  it('moves a film to a day and puts it last on a shared day', () => {
    const { keys, dates: next } = moveFilmTo(base, 'movie_1', '2026-11-11')
    expect(keys).toEqual(['movie_2', 'movie_1', 'movie_3'])
    expect(next).toEqual(['2026-11-11', '2026-11-11', '2026-11-13'])
  })

  it('moves the later films up when one is removed', () => {
    const { keys, dates: next } = removeFilm(base, 'movie_1')
    expect(keys).toEqual(['movie_2', 'movie_3'])
    expect(next).toEqual(['2026-11-09', '2026-11-11'])
  })

  it('stores only the dates that differ from the weekday schedule', () => {
    // Film 1 → Nov 14: the order becomes 2, 3, 1 and the slots are Nov 9, 11, 13.
    const { keys, dates: next } = moveFilmTo(base, 'movie_1', '2026-11-14')
    const ordered = keys.map((k) => films.find((f) => f.mediaKey === k)!)
    const moves = marathonMoves(ordered, next, options)
    expect(moves).toEqual({ movie_2: '2026-11-11', movie_3: '2026-11-13', movie_1: '2026-11-14' })
    // The same edit on the unchanged order stores a single date.
    expect(marathonMoves(films, ['2026-11-09', '2026-11-11', '2026-11-14'], options)).toEqual({
      movie_3: '2026-11-14',
    })
    // Applying them to the new order gives back exactly the edited dates.
    expect(dates(applyMoves(buildSchedule(ordered, options), moves, true))).toEqual(next)
  })

  it('names sessions by film or by index', () => {
    expect(sessionKey(base[0]!, true)).toBe('movie_1')
    expect(sessionKey(base[0]!, false)).toBe('0')
  })
})

describe('applyTimes', () => {
  it('puts the own time on the session with that key and leaves the rest', () => {
    const out = applyTimes(base, { movie_2: '22:30' }, true)
    expect(out.map((s) => s.time)).toEqual(['21:00', '22:30', '21:00'])
  })
  it('keys a series by session index', () => {
    expect(applyTimes(base, { '0': '19:00' }, false).map((s) => s.time)).toEqual([
      '19:00',
      '21:00',
      '21:00',
    ])
  })
  it('returns the same sessions when there is nothing to apply', () => {
    expect(applyTimes(base, {}, true)).toBe(base)
  })
})
