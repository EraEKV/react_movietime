import i18n from '../i18n'
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
import { addDays, daysBetween, isDay, isTime, weekdayOf } from './calendar'
import { episodeCode } from './format'

/** Hard stop for the day loop: no plan should take more than ten years. */
const MAX_DAYS = 3660

export const MAX_PER_SESSION = 10

/** Why the options can't make a schedule, or null when they can. Shown in the stepper. */
export function scheduleProblem(options: ScheduleOptions): string | null {
  if (!isDay(options.startDate)) return i18n.t('planner:problem.startDate')
  if (options.weekdays.length === 0) return i18n.t('planner:problem.weekdays')
  if (!isTime(options.time)) return i18n.t('planner:problem.time')
  if (
    !Number.isInteger(options.perSession) ||
    options.perSession < 1 ||
    options.perSession > MAX_PER_SESSION
  ) {
    return i18n.t('planner:problem.perSession', { max: MAX_PER_SESSION })
  }
  return null
}

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
        time: options.time,
        units: chunk,
        minutes: minutesOf(chunk),
      })
    }
    day = addDays(day, 1)
  }
  return sessions
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

/**
 * Short label of what a session covers: "S2E5", "S2E5–E6", "S2E9–S3E1", or the movie title.
 */
export function unitsLabel(units: Pick<PlanUnit, 'season' | 'episode' | 'title'>[]): string {
  const first = units[0]
  const last = units.at(-1)
  if (!first || !last) return ''
  if (first.season === null || first.episode === null) {
    return units.map((u) => u.title).join(', ')
  }
  const start = episodeCode(first.season, first.episode)
  if (units.length === 1 || last.season === null || last.episode === null) return start
  return last.season === first.season
    ? `${start}–E${last.episode}`
    : `${start}–${episodeCode(last.season, last.episode)}`
}

/* ---------- .ics export (RFC 5545) ---------- */

export interface IcsEvent {
  uid: string
  date: string
  time: string
  minutes: number
  summary: string
  description?: string
  url?: string
}

/** Text values escape backslash, semicolon, comma and newlines. */
const escapeText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Lines longer than 75 octets are folded: CRLF + one space, never inside a character. */
function fold(line: string): string {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line
  const parts: string[] = []
  let current = ''
  let size = 0
  for (const char of line) {
    const bytes = encoder.encode(char).length
    // Continuation lines start with a space, which counts towards their 75.
    if (size + bytes > (parts.length === 0 ? 75 : 74)) {
      parts.push(current)
      current = ''
      size = 0
    }
    current += char
    size += bytes
  }
  parts.push(current)
  return parts.join('\r\n ')
}

/** 20261106T180000Z. */
const icsUtc = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

/**
 * Local day + time → the exact moment, in the zone this code runs in. The local Date
 * constructor applies that day's UTC offset, so a session at 21:00 stays at 21:00 on both
 * sides of a DST change. Times are written in UTC, so no VTIMEZONE block is needed.
 */
export function localMoment(day: string, time: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0)
}

/** A calendar file with one event per session. `now` is passed in to keep this pure. */
export function toIcs(calendarName: string, events: IcsEvent[], now: Date): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Movietime//Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ]
  for (const event of events) {
    const start = localMoment(event.date, event.time)
    const end = new Date(start.getTime() + Math.max(event.minutes, 1) * 60_000)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${icsUtc(now)}`,
      `DTSTART:${icsUtc(start)}`,
      `DTEND:${icsUtc(end)}`,
      `SUMMARY:${escapeText(event.summary)}`,
      ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
      ...(event.url ? [`URL:${event.url}`] : []),
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}
