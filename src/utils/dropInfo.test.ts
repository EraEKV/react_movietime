import { describe, expect, it } from 'vitest'
import type { Plan, PlanSession, PlanUnit, PlannedSession } from '../types/plan'
import { bookingsOf } from './conflicts'
import { dropInfo, sessionLabel } from './dropInfo'

const unit = (title: string, episode: number | null = null): PlanUnit => ({
  mediaKey: 'movie_1',
  title,
  season: episode ? 1 : null,
  episode,
  ordinal: episode,
  runtime: 100,
  media: null,
})
const plan = (id: string, kind: Plan['kind'], title: string) =>
  ({ id, kind, title, media: null }) as unknown as Plan
const planned = (
  p: Plan,
  id: string,
  date: string,
  index: number,
  units: PlanUnit[],
  time = '21:00',
  status: PlanSession['status'] = 'pending',
): PlannedSession => ({
  plan: p,
  session: { id, planId: p.id, index, date, time, units, minutes: 150, status } as PlanSession,
})

const nolan = plan('nolan', 'list', 'Nolan marathon')
const show = plan('show', 'series', 'Dark')
const films = [
  planned(nolan, 'a', '2026-11-10', 0, [unit('Batman Begins')]),
  planned(nolan, 'b', '2026-11-12', 1, [unit('The Dark Knight')]),
  planned(nolan, 'c', '2026-11-16', 2, [unit('The Dark Knight Rises')]),
]
const all = [...films, planned(show, 'e1', '2026-11-14', 0, [unit('Pilot', 1)], '21:30')]
const bookings = bookingsOf(all)

describe('sessionLabel', () => {
  it('names a marathon session after its film and a series session after its episodes', () => {
    expect(sessionLabel(films[0] as PlannedSession)).toBe('Batman Begins')
    expect(sessionLabel(all[3] as PlannedSession)).toBe('S1E1')
  })
})

describe('dropInfo', () => {
  it('names the session of the same plan right before the new day', () => {
    const info = dropInfo(films[2] as PlannedSession, '2026-11-13', all, bookings)
    expect(info.after).toBe('The Dark Knight')
    expect(info.overlaps).toEqual([])
  })
  it('does not count the moved session itself as the neighbour', () => {
    expect(dropInfo(films[1] as PlannedSession, '2026-11-12', all, bookings).after).toBe(
      'Batman Begins',
    )
  })
  it('has no neighbour before the first day of the plan', () => {
    expect(dropInfo(films[2] as PlannedSession, '2026-11-09', all, bookings).after).toBeNull()
  })
  it('warns about a session of another plan that runs at the same time', () => {
    // Pilot runs 21:30–00:00 on the 14th; the film starts at 21:00 and runs 2.5 hours.
    const info = dropInfo(films[2] as PlannedSession, '2026-11-14', all, bookings)
    expect(info.overlaps).toEqual([{ title: 'Dark', from: '21:30', to: '00:00' }])
  })
  it('lets the same film stay on a free evening', () => {
    expect(dropInfo(films[2] as PlannedSession, '2026-11-15', all, bookings).overlaps).toEqual([])
  })
})
