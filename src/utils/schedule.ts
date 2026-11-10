import i18n from '../shared/i18n'
// Schedule generation for watch plans: pure functions, no React and no Firestore, so the
// business rules can be read (and tested) on their own. Days are "YYYY-MM-DD" in local time,
// times "HH:mm" (see utils/calendar.ts for why the day math runs in UTC).

import type {
  PlanSession,
  PlanUnit,
  ScheduledSession,
  ScheduleOptions,
  Weekday,
} from '../types/plan'
import { addDays, daysBetween, formatDay, isDay, isTime, weekdayOf, weekStart } from './calendar'

/** Hard stop for the day loop: no plan should take more than ten years. */
const MAX_DAYS = 3660

export const MAX_PER_SESSION = 10

/** Why the options can't make a schedule, or null when they can. Shown in the stepper. */
export function scheduleProblem(options: ScheduleOptions): string | null {
  if (!isDay(options.startDate)) return i18n.t('planner:problem.startDate')
  if (options.weekdays.length === 0) return i18n.t('planner:problem.weekdays')
  if (!isTime(options.time)) return i18n.t('planner:problem.time')
  if (Object.values(options.times ?? {}).some((time) => !isTime(time))) {
    return i18n.t('planner:problem.time')
  }
  if (
    !Number.isInteger(options.perSession) ||
    options.perSession < 1 ||
    options.perSession > MAX_PER_SESSION
  ) {
    return i18n.t('planner:problem.perSession', { max: MAX_PER_SESSION })
  }
  return null
}

/** The time a session on `day` starts at: the weekday's own time, or the usual one. */
export const timeOn = (options: Pick<ScheduleOptions, 'time' | 'times'>, day: string) =>
  options.times?.[weekdayOf(day)] ?? options.time

const minutesOf = (units: PlanUnit[]) => units.reduce((sum, unit) => sum + unit.runtime, 0)

/**
 * Splits the units into sessions on the chosen weekdays, starting on startDate (that day
 * counts if it is one of the weekdays). Each session takes `perSession` units in order; the
 * last one takes what is left. Returns [] when the options are invalid (no weekdays…).
 */
export function buildSchedule(units: PlanUnit[], options: ScheduleOptions): ScheduledSession[] {
  if (units.length === 0 || scheduleProblem(options)) return []
  const days = new Set<Weekday>(options.weekdays)
  const sessions: ScheduledSession[] = []
  let day = options.startDate

  for (let i = 0; i < MAX_DAYS && sessions.length * options.perSession < units.length; i++) {
    if (days.has(weekdayOf(day))) {
      const start = sessions.length * options.perSession
      const chunk = units.slice(start, start + options.perSession)
      sessions.push({
        index: sessions.length,
        date: day,
        time: timeOn(options, day),
        units: chunk,
        minutes: minutesOf(chunk),
      })
    }
    day = addDays(day, 1)
  }
  return sessions
}

/** Items grouped by the Monday of their week, in the order they come (sessions arrive by date). */
export function groupByWeek<T extends { date: string }>(items: T[]): [string, T[]][] {
  const weeks = new Map<string, T[]>()
  for (const item of items) {
    const monday = weekStart(item.date)
    weeks.set(monday, [...(weeks.get(monday) ?? []), item])
  }
  return [...weeks]
}

/** "This week · Nov 2–8", "Next week · …", "Week of Nov 16". */
export function weekLabel(monday: string, today: string): string {
  const sunday = addDays(monday, 6)
  const sameMonth = monday.slice(5, 7) === sunday.slice(5, 7)
  const range = `${formatDay(monday, { month: 'short', day: 'numeric' })}–${formatDay(sunday, sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' })}`
  const thisWeek = weekStart(today)
  if (monday === thisWeek) return i18n.t('planner:plan.thisWeek', { range })
  if (monday === addDays(thisWeek, 7)) return i18n.t('planner:plan.nextWeek', { range })
  if (monday === addDays(thisWeek, -7)) return i18n.t('planner:plan.lastWeek', { range })
  return i18n.t('planner:plan.weekOf', { range })
}

/** The first day after `after` that falls on one of the weekdays (any day if none). */
export function nextSlot(after: string, weekdays: Weekday[]): string {
  const days = new Set(weekdays)
  let day = addDays(after, 1)
  for (let i = 0; i < 7 && days.size > 0 && !days.has(weekdayOf(day)); i++) day = addDays(day, 1)
  return day
}

type Movable = Pick<PlanSession, 'id' | 'index' | 'date' | 'status'>

/** Sessions in viewing order: by day, then by their order in the plan. */
export const bySchedule = <T extends Pick<PlanSession, 'date' | 'index'>>(a: T, b: T) =>
  a.date === b.date ? a.index - b.index : a.date < b.date ? -1 : 1

/**
 * Moves one session to `date`. With `shiftLater`, every pending session after it moves by
 * the same number of days, so the gaps between them stay as they were. Returns only the
 * changes ({ id, date }); done and skipped sessions never move.
 */
export function shiftSessions<T extends Movable>(
  sessions: T[],
  id: string,
  date: string,
  shiftLater: boolean,
): { id: string; date: string }[] {
  const moved = sessions.find((s) => s.id === id)
  if (!moved || moved.date === date) return []
  const changes = [{ id, date }]
  if (!shiftLater) return changes

  const delta = daysBetween(moved.date, date)
  for (const s of sessions) {
    if (s.id !== id && s.status === 'pending' && bySchedule(s, moved) > 0) {
      changes.push({ id: s.id, date: addDays(s.date, delta) })
    }
  }
  return changes
}

/**
 * The plan's summary dates after a change: the next pending day (null when nothing is
 * left) and the last day that still counts (skipped sessions don't).
 */
export function planDates(sessions: Pick<PlanSession, 'date' | 'status'>[]): {
  nextDate: string | null
  endDate: string
} {
  let nextDate: string | null = null
  let endDate = ''
  for (const s of sessions) {
    if (s.status === 'pending' && (nextDate === null || s.date < nextDate)) nextDate = s.date
    if (s.status !== 'skipped' && s.date > endDate) endDate = s.date
  }
  if (!endDate) endDate = sessions.reduce((max, s) => (s.date > max ? s.date : max), '')
  return { nextDate, endDate }
}

export interface PlanSummary {
  sessions: number
  units: number
  minutes: number
  /** Distinct weekdays. */
  perWeek: number
  firstDate: string | null
  finishDate: string | null
}

export function planSummary(sessions: ScheduledSession[], weekdays: Weekday[]): PlanSummary {
  return {
    sessions: sessions.length,
    units: sessions.reduce((sum, s) => sum + s.units.length, 0),
    minutes: sessions.reduce((sum, s) => sum + s.minutes, 0),
    perWeek: new Set(weekdays).size,
    firstDate: sessions[0]?.date ?? null,
    finishDate: sessions.at(-1)?.date ?? null,
  }
}

/** Minutes → "36 h" or "45 min" for the summary tiles. */
export function totalHours(minutes: number): { value: string; unit: string } {
  if (minutes < 60) return { value: String(minutes), unit: i18n.t('planner:units.min') }
  const hours = minutes / 60
  return {
    value: hours < 10 ? hours.toFixed(1).replace(/\.0$/, '') : String(Math.round(hours)),
    unit: i18n.t('planner:units.hour'),
  }
}

export { unitsLabel, toIcs, localMoment, type IcsEvent } from '../../api/_lib/ics'
