import { describe, expect, it } from 'vitest'
import type { LibraryEntry } from '../types/library'
import {
  activityLevel,
  activityWeeks,
  byStatus,
  countSessionsByDay,
  entriesInPeriod,
  hoursValue,
  libraryStats,
  monthLabels,
  minutesWatched,
  parsePeriod,
  periodStart,
  planStats,
  sessionsByDay,
  sessionsByWeek,
  sessionsByWeekday,
  topGenres,
  upcomingSessions,
} from './stats'

const base = {
  key: 'movie_1',
  mediaType: 'movie',
  tmdbId: 1,
  title: 'A',
  posterPath: null,
  year: null,
  genreIds: [],
  tmdbRating: null,
  runtime: 100,
  totalEpisodes: null,
  status: 'completed',
  score: null,
  notes: '',
  order: null,
  progress: null,
  addedAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
  completedAt: null,
} as LibraryEntry
const entry = (changes: Partial<LibraryEntry>) => ({ ...base, ...changes }) as LibraryEntry

describe('library stats', () => {
  it('has no NaN for an empty library', () => {
    expect(libraryStats([])).toEqual({
      titles: 0,
      completed: 0,
      completedShare: 0,
      averageScore: null,
      scored: 0,
      minutes: 0,
      noRuntime: 0,
    })
  })
  it('rounds the average score to one decimal', () => {
    const entries = [7, 8, 8].map((score) => entry({ score }))
    expect(libraryStats(entries).averageScore).toBe(7.7)
  })
  it('counts watched minutes per kind of entry', () => {
    expect(minutesWatched(entry({ status: 'plan' }))).toBe(0)
    expect(minutesWatched(entry({ runtime: null }))).toBeNull()
    expect(
      minutesWatched(
        entry({
          mediaType: 'tv',
          status: 'dropped',
          runtime: 30,
          progress: { season: 1, episode: 4, watchedEpisodes: 4 },
        }),
      ),
    ).toBe(120)
  })
  it('formats hours', () => {
    expect(hoursValue(0)).toEqual({ value: '0', unit: 'h' })
    expect(hoursValue(45)).toEqual({ value: '45', unit: 'min' })
    expect(hoursValue(90)).toEqual({ value: '2', unit: 'h' })
  })
})

describe('periods', () => {
  it('parses a bad period as "all"', () => {
    expect(parsePeriod('30d')).toBe('30d')
    expect(parsePeriod('nope')).toBe('all')
    expect(parsePeriod(null)).toBe('all')
  })
  it('computes where each period starts', () => {
    expect(periodStart('30d', '2026-03-01')).toBe('2026-01-31')
    expect(periodStart('year', '2026-11-06')).toBe('2026-01-01')
    expect(periodStart('all', '2026-11-06')).toBeNull()
  })
  it('drops entries before the start', () => {
    expect(entriesInPeriod([base], '2026-01-02')).toHaveLength(0)
    expect(entriesInPeriod([base], null)).toHaveLength(1)
  })
})

describe('breakdowns', () => {
  it('counts a genre once per title and skips unknown ids', () => {
    const genres = new Map([[18, 'Drama']])
    expect(topGenres([entry({ genreIds: [18, 18, 99] })], genres)).toEqual([
      { value: '18', label: 'Drama', count: 1 },
    ])
  })
  it('lists every status, with zeros', () => {
    expect(byStatus([]).map((bar) => bar.count)).toEqual([0, 0, 0, 0])
  })
})

describe('plan stats', () => {
  const plan = (id: string, status = 'active') => ({ id, status }) as never
  const session = (p: never, date: string, status: string, time = '21:00') => ({
    plan: p,
    session: { date, status, time } as never,
  })
  const a = plan('a')
  const done = plan('d', 'done')
  const list = [
    session(a, '2026-11-02', 'done'),
    session(a, '2026-11-08', 'pending'),
    session(a, '2026-11-09', 'pending'),
    session(a, '2026-11-06', 'skipped'),
    session(done, '2026-11-07', 'pending', '10:00'),
  ]

  it('counts the Monday–Sunday week, without skipped sessions', () => {
    expect(planStats([a, done], list, new Set(), '2026-11-06')).toEqual({
      weekDone: 1,
      weekPlanned: 3,
      tonight: 0,
      activePlans: 1,
      sharedActive: 0,
    })
  })
  it('groups finished sessions by weekday, Monday first', () => {
    expect(sessionsByWeekday(list, null, '2026-11-06').map((b) => b.count)).toEqual([
      1, 0, 0, 0, 0, 0, 0,
    ])
  })
  it('counts finished sessions per week, oldest week first, ending with this week', () => {
    const weeks = sessionsByWeek(list, '2026-11-06', 3)
    expect(weeks).toEqual([
      { week: '2026-10-19', count: 0 },
      { week: '2026-10-26', count: 0 },
      { week: '2026-11-02', count: 1 },
    ])
  })
  it('counts finished sessions per day of one month, zeros included', () => {
    const days = sessionsByDay(
      [
        session(a, '2026-11-02', 'done'),
        session(a, '2026-11-02', 'done'),
        session(a, '2026-11-03', 'pending'),
        session(a, '2026-10-31', 'done'),
        session(a, '2026-11-20', 'done'),
      ],
      { year: 2026, month: 10 },
      '2026-11-06',
    )
    expect(days).toHaveLength(30)
    expect(days[0]).toEqual({ day: '2026-11-01', count: 0 })
    expect(days[1]).toEqual({ day: '2026-11-02', count: 2 })
    expect(days.reduce((sum, d) => sum + d.count, 0)).toBe(2)
  })
  it('lays out 53 Monday-first weeks ending with the current one', () => {
    const weeks = activityWeeks('2026-11-11')
    expect(weeks).toHaveLength(53)
    expect(weeks.every((week) => week.length === 7)).toBe(true)
    expect(weeks.at(-1)?.[0]).toBe('2026-11-09')
    expect(weeks.at(-1)?.[6]).toBe('2026-11-15')
    expect(weeks[0]?.[0]).toBe('2025-11-10')
  })
  it('counts finished sessions by day from a start day, none after today', () => {
    const counts = countSessionsByDay(
      [
        session(a, '2026-11-02', 'done'),
        session(a, '2026-11-02', 'done'),
        session(a, '2026-11-20', 'done'),
        session(a, '2025-01-01', 'done'),
        session(a, '2026-11-03', 'skipped'),
      ],
      '2025-11-10',
      '2026-11-06',
    )
    expect([...counts]).toEqual([['2026-11-02', 2]])
  })
  it('puts a month name on the week with the 1st', () => {
    const labels = monthLabels(activityWeeks('2026-11-11'))
    expect(labels.at(-1)).toEqual({ index: 50, month: { year: 2026, month: 10 } })
    expect(labels).toHaveLength(13)
    expect(labels[0]?.month).toEqual({ year: 2025, month: 10 })
  })
  it('shades a day against the busiest one', () => {
    expect([0, 1, 2, 3, 4, 8].map((n) => activityLevel(n, 8))).toEqual([0, 1, 1, 2, 2, 4])
    expect(activityLevel(1, 1)).toBe(4)
    expect(activityLevel(0, 0)).toBe(0)
  })
  it('lists upcoming sessions of active plans only', () => {
    expect(upcomingSessions(list, '2026-11-06').map((s) => s.session.date)).toEqual([
      '2026-11-08',
      '2026-11-09',
    ])
  })
})
