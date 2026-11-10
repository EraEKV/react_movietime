import { describe, expect, it } from 'vitest'
import type { Plan, PlanSession, PlannedSession } from '../types/plan'
import { bookingsOf, endTimeOf, FALLBACK_MINUTES, findConflicts, type Booking } from './conflicts'

const booking = (id: string, date: string, time: string, minutes: number): Booking => ({
  id,
  title: id,
  date,
  time,
  minutes,
})

describe('findConflicts', () => {
  const dark = booking('dark', '2026-11-13', '21:00', 152)

  it('finds a session that starts while another one is still running', () => {
    expect(findConflicts({ date: '2026-11-13', time: '22:30', minutes: 100 }, [dark])).toEqual([
      dark,
    ])
  })
  it('lets sessions that only touch share an evening', () => {
    // The Dark Knight runs 21:00–23:32.
    expect(findConflicts({ date: '2026-11-13', time: '23:32', minutes: 60 }, [dark])).toEqual([])
    expect(findConflicts({ date: '2026-11-13', time: '19:08', minutes: 112 }, [dark])).toEqual([])
  })
  it('lets different evenings be', () => {
    expect(findConflicts({ date: '2026-11-14', time: '21:00', minutes: 100 }, [dark])).toEqual([])
  })
  it('sees a late film running past midnight', () => {
    const late = booking('late', '2026-11-13', '23:00', 180)
    expect(findConflicts({ date: '2026-11-14', time: '00:30', minutes: 60 }, [late])).toEqual([
      late,
    ])
    expect(findConflicts({ date: '2026-11-14', time: '02:00', minutes: 60 }, [late])).toEqual([])
  })
  it('leaves out the session being moved', () => {
    expect(
      findConflicts({ date: '2026-11-13', time: '21:00', minutes: 152 }, [dark], 'dark'),
    ).toEqual([])
  })
  it('assumes a usual length when the session has none', () => {
    const unknown = booking('unknown', '2026-11-13', '21:00', 0)
    expect(
      findConflicts({ date: '2026-11-13', time: '22:30', minutes: 60 }, [unknown]),
    ).toHaveLength(1)
    expect(FALLBACK_MINUTES).toBe(120)
  })
})

describe('endTimeOf', () => {
  it('adds the length to the start and wraps past midnight', () => {
    expect(endTimeOf({ date: '2026-11-13', time: '21:00', minutes: 152 })).toBe('23:32')
    expect(endTimeOf({ date: '2026-11-13', time: '23:00', minutes: 180 })).toBe('02:00')
  })
})

describe('bookingsOf', () => {
  const plan = { id: 'p1', title: 'Nolan marathon', kind: 'list', media: null } as unknown as Plan
  const session = (id: string, status: PlanSession['status']): PlannedSession => ({
    plan,
    session: {
      id,
      date: '2026-11-13',
      time: '21:00',
      minutes: 152,
      status,
      units: [{ title: 'The Dark Knight' }],
    } as unknown as PlanSession,
  })

  it('keeps pending sessions and names them after the film', () => {
    expect(
      bookingsOf([session('a', 'pending'), session('b', 'done'), session('c', 'skipped')]),
    ).toEqual([
      {
        id: 'p1/a',
        title: 'The Dark Knight',
        date: '2026-11-13',
        time: '21:00',
        minutes: 152,
      },
    ])
  })
})
