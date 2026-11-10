// Evenings that collide: two sessions whose watching times overlap, across all plans.
// Pure functions; the planner pages feed them the sessions they already have.
import type { PlannedSession } from '../types/plan'
import { daysBetween } from './calendar'

/** When a session has no known length (TMDB without a runtime): a film's usual evening. */
export const FALLBACK_MINUTES = 120

const EPOCH = '1970-01-01'
const DAY_MINUTES = 24 * 60

/** What a session takes up: when it starts and how long it runs. */
export interface Slot {
  date: string
  time: string
  minutes: number
}

/** A pending session of one of my plans, as far as a new slot is concerned. */
export interface Booking extends Slot {
  /** `planId/sessionId`. */
  id: string
  /** The film or series the session is about. */
  title: string
}

const minutesOfDay = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

/** Start and end as minutes since the first day of 1970, so a late film runs into the next day. */
function windowOf({ date, time, minutes }: Slot): { start: number; end: number } {
  const start = daysBetween(EPOCH, date) * DAY_MINUTES + minutesOfDay(time)
  return { start, end: start + (minutes > 0 ? minutes : FALLBACK_MINUTES) }
}

/** "23:32": the clock time a slot ends at (past midnight it wraps to the next day's clock). */
export function endTimeOf(slot: Slot): string {
  const clock = windowOf(slot).end % DAY_MINUTES
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(clock / 60))}:${pad(clock % 60)}`
}

/** Pending sessions only: what is watched or skipped no longer takes an evening. */
export function bookingsOf(planned: PlannedSession[]): Booking[] {
  return planned
    .filter(({ session }) => session.status === 'pending')
    .map(({ plan, session }) => ({
      id: `${plan.id}/${session.id}`,
      title: (plan.kind === 'list' ? session.units[0]?.title : plan.media?.title) || plan.title,
      date: session.date,
      time: session.time,
      minutes: session.minutes,
    }))
}

/**
 * The bookings that overlap `slot`. Windows that merely touch (one ends when the other
 * starts) don't count. `ignoreId` leaves out the session being moved.
 */
export function findConflicts(slot: Slot, bookings: Booking[], ignoreId?: string): Booking[] {
  const mine = windowOf(slot)
  return bookings.filter((booking) => {
    if (booking.id === ignoreId) return false
    const other = windowOf(booking)
    return mine.start < other.end && other.start < mine.end
  })
}
