import { describe, expect, it } from 'vitest'
import type { PlanUnit } from '../types/plan'
import { addDays, daysBetween, monthGrid, weekdayOf } from './calendar'
import {
  buildSchedule,
  nextSlot,
  planDates,
  planSummary,
  scheduleProblem,
  shiftSessions,
  unitsLabel,
} from './schedule'

const ep = (season: number, episode: number, ordinal: number): PlanUnit => ({
  mediaKey: 'tv_1',
  title: `E${episode}`,
  season,
  episode,
  ordinal,
  runtime: 47,
  media: null,
})
const units = [ep(1, 1, 1), ep(1, 2, 2), ep(1, 3, 3), ep(2, 1, 4), ep(2, 2, 5)]
// Fri, Sun, Tue; 2026-03-08 is the US DST change, so day math must not drift.
const options = {
  startDate: '2026-03-06',
  weekdays: [5, 0, 2] as never,
  time: '21:00',
  perSession: 2,
}

describe('buildSchedule', () => {
  const sessions = buildSchedule(units, options)

  it('places sessions on the chosen weekdays, across DST', () => {
    expect(sessions.map((s) => s.date)).toEqual(['2026-03-06', '2026-03-08', '2026-03-10'])
  })
  it('splits units in order, the last session takes the rest', () => {
    expect(sessions.map((s) => s.units.length)).toEqual([2, 2, 1])
    expect(sessions[2]?.minutes).toBe(47)
  })
  it('returns [] for invalid options or no units', () => {
    expect(buildSchedule(units, { ...options, weekdays: [] })).toEqual([])
    expect(buildSchedule([], options)).toEqual([])
  })
  it('explains why options are invalid', () => {
    expect(scheduleProblem({ ...options, weekdays: [] })).toBe('Pick at least one weekday.')
    expect(scheduleProblem({ ...options, perSession: 0 })).not.toBeNull()
    expect(scheduleProblem(options)).toBeNull()
  })
  it('summarises the plan', () => {
    expect(planSummary(sessions, options.weekdays).finishDate).toBe('2026-03-10')
  })
})

describe('calendar', () => {
  it('adds days over DST and year ends', () => {
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2)
  })
  it('knows weekdays (Sunday = 0)', () => {
    expect(weekdayOf('2026-11-06')).toBe(5)
  })
  it('builds Monday-first month grids of whole weeks', () => {
    const grid = monthGrid({ year: 2026, month: 10 })
    expect(grid).toHaveLength(42)
    expect(grid[0]).toBe('2026-10-26')
    expect(monthGrid({ year: 2027, month: 1 })).toHaveLength(28)
  })
  it('finds the next slot', () => {
    expect(nextSlot('2026-11-06', [1, 3])).toBe('2026-11-09')
  })
})

describe('shifting sessions', () => {
  const s = [
    { id: 'a', index: 0, date: '2026-11-02', status: 'done' },
    { id: 'b', index: 1, date: '2026-11-04', status: 'pending' },
    { id: 'c', index: 2, date: '2026-11-06', status: 'pending' },
    { id: 'd', index: 3, date: '2026-11-09', status: 'skipped' },
  ] as const

  it('moves only the later pending sessions with "shift all"', () => {
    expect(shiftSessions([...s], 'b', '2026-11-05', true)).toEqual([
      { id: 'b', date: '2026-11-05' },
      { id: 'c', date: '2026-11-07' },
    ])
  })
  it('moves one session alone', () => {
    expect(shiftSessions([...s], 'b', '2026-11-05', false)).toEqual([
      { id: 'b', date: '2026-11-05' },
    ])
  })
  it('finds next and end dates', () => {
    expect(planDates([...s])).toEqual({ nextDate: '2026-11-04', endDate: '2026-11-06' })
    expect(planDates([{ date: '2026-11-02', status: 'done' }])).toEqual({
      nextDate: null,
      endDate: '2026-11-02',
    })
  })
})

describe('unitsLabel', () => {
  it('collapses ranges', () => {
    expect(unitsLabel(units.slice(0, 2))).toBe('S1E1–E2')
    expect(unitsLabel(units.slice(2, 4))).toBe('S1E3–S2E1')
  })
})
