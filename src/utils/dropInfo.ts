// What to tell someone dragging a session onto another day: where it lands in its plan
// ("after The Dark Knight") and which other sessions it would collide with.
import type { PlannedSession } from '../types/plan'
import { endTimeOf, findConflicts, type Booking } from './conflicts'
import { bySchedule, unitsLabel } from './schedule'

/** What a session is about, as a short label: a film's title, or an episode range. */
export const sessionLabel = ({ plan, session }: PlannedSession): string =>
  (plan.kind === 'list' ? session.units[0]?.title : null) || unitsLabel(session.units)

export interface DropInfo {
  /** The session of the same plan that comes right before the new day; null if none is known. */
  after: string | null
  /** The sessions (of any plan) whose time overlaps, with the window they take. */
  overlaps: { title: string; from: string; to: string }[]
}

/**
 * `all` are the sessions the page knows (the visible weeks); `bookings` the same sessions
 * as taken evenings. A neighbour outside what is loaded simply isn't named.
 */
export function dropInfo(
  moved: PlannedSession,
  date: string,
  all: PlannedSession[],
  bookings: Booking[],
): DropInfo {
  const there = { ...moved.session, date }
  const before = all
    .filter(
      (s) =>
        s.plan.id === moved.plan.id &&
        s.session.id !== moved.session.id &&
        s.session.status !== 'skipped' &&
        bySchedule(s.session, there) <= 0,
    )
    .at(-1)
  const overlaps = findConflicts(
    { date, time: moved.session.time, minutes: moved.session.minutes },
    bookings,
    `${moved.plan.id}/${moved.session.id}`,
  ).map((booking) => ({
    title: booking.title,
    from: booking.time,
    to: endTimeOf(booking),
  }))
  return { after: before ? sessionLabel(before) : null, overlaps }
}
