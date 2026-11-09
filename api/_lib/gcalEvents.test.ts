import { describe, expect, it } from 'vitest'
import {
  addMinutes,
  buildEvent,
  eventId,
  inWindow,
  reconcile,
  sessionTitle,
  type SyncPlan,
  type SyncSession,
} from './gcalEvents'

const series: SyncPlan = { id: 'p1', title: 'Severance', kind: 'series' }
const unit = (season: number, episode: number) => ({ title: `E${episode}`, season, episode })
const session = (over: Partial<SyncSession> = {}): SyncSession => ({
  id: 's1',
  date: '2026-11-10',
  time: '20:00',
  minutes: 90,
  units: [unit(1, 3)],
  ...over,
})

describe('sessionTitle', () => {
  it('names one episode, a range and a range across seasons', () => {
    expect(sessionTitle(series, [unit(1, 3)])).toBe('Severance · S1E3')
    expect(sessionTitle(series, [unit(1, 3), unit(1, 4)])).toBe('Severance · S1E3–4')
    expect(sessionTitle(series, [unit(1, 10), unit(2, 1)])).toBe('Severance · S1E10–S2E1')
  })

  it('uses movie titles for movie and list plans', () => {
    const movie = { id: 'p2', title: 'Movie night', kind: 'list' as const }
    const units = [
      { title: 'Heat', season: null, episode: null },
      { title: 'Ronin', season: null, episode: null },
    ]
    expect(sessionTitle(movie, units)).toBe('Heat, Ronin')
  })
})

describe('addMinutes', () => {
  it('moves the wall clock across midnight', () => {
    expect(addMinutes('2026-11-10', '20:00', 90)).toBe('2026-11-10T21:30:00')
    expect(addMinutes('2026-12-31', '23:30', 90)).toBe('2027-01-01T01:00:00')
  })
})

describe('eventId', () => {
  it('is stable, valid for Google and different per user and session', () => {
    expect(eventId('u1', 's1')).toBe(eventId('u1', 's1'))
    expect(eventId('u1', 's1')).not.toBe(eventId('u2', 's1'))
    expect(eventId('u1', 's1')).toMatch(/^[a-v0-9]{5,1024}$/)
  })
})

describe('buildEvent', () => {
  it('fills time, zone, a link back and the markers used to find it again', () => {
    const e = buildEvent('u1', series, session(), 'Asia/Almaty', 'https://avleron.com')
    expect(e.body).toMatchObject({
      summary: 'Severance · S1E3',
      start: { dateTime: '2026-11-10T20:00:00', timeZone: 'Asia/Almaty' },
      end: { dateTime: '2026-11-10T21:30:00', timeZone: 'Asia/Almaty' },
      extendedProperties: {
        private: { movietimeApp: '1', movietimePlanId: 'p1', movietimeSessionId: 's1' },
      },
    })
    expect(String(e.body.description)).toContain('https://avleron.com/planner/p1')
  })

  it('changes the hash when the time, title or zone change', () => {
    const base = buildEvent('u1', series, session(), 'Asia/Almaty', 'https://x').hash
    expect(
      buildEvent('u1', series, session({ time: '21:00' }), 'Asia/Almaty', 'https://x').hash,
    ).not.toBe(base)
    expect(buildEvent('u1', series, session(), 'Europe/Berlin', 'https://x').hash).not.toBe(base)
    expect(buildEvent('u1', series, session(), 'Asia/Almaty', 'https://x').hash).toBe(base)
  })
})

describe('inWindow', () => {
  it('covers yesterday through 90 days ahead', () => {
    expect(inWindow('2026-11-08', '2026-11-09')).toBe(true)
    expect(inWindow('2026-11-07', '2026-11-09')).toBe(false)
    expect(inWindow('2027-02-07', '2026-11-09')).toBe(true)
    expect(inWindow('2027-02-08', '2026-11-09')).toBe(false)
  })
})

describe('reconcile', () => {
  const want = (id: string, hash = 'h') => ({
    id: `e-${id}`,
    planId: 'p1',
    sessionId: id,
    hash,
    body: {},
  })
  const have = (id: string, hash = 'h') => ({ id: `e-${id}`, planId: 'p1', sessionId: id, hash })

  it('inserts new, patches changed, removes stale and leaves the rest', () => {
    const changes = reconcile(
      [want('a'), want('b', 'new'), want('c')],
      [have('b', 'old'), have('c'), have('gone')],
    )
    expect(changes.insert.map((e) => e.sessionId)).toEqual(['a'])
    expect(changes.patch.map((e) => e.sessionId)).toEqual(['b'])
    expect(changes.remove.map((e) => e.sessionId)).toEqual(['gone'])
  })

  it('does nothing when the calendar already matches', () => {
    expect(reconcile([want('a')], [have('a')])).toEqual({ insert: [], patch: [], remove: [] })
  })
})
