// Calendar-day math on "YYYY-MM-DD" strings. Pure, no React.
//
// Why UTC inside: a calendar day isn't a moment. If days were local Date objects, adding
// 24 hours across a daylight-saving change would land on 23:00 of the same day (or 01:00
// of the next), and the schedule would slip. Treating the string as a UTC date and moving
// by whole days with setUTCDate never sees DST, because UTC has none.

import type { Weekday } from '../types/plan'

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

const pad = (n: number) => String(n).padStart(2, '0')

/** "2026-11-06" → Date at UTC midnight; null for anything that isn't a real day. */
function toUtc(day: string): Date | null {
  const match = DAY_RE.exec(day)
  if (!match) return null
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(y, m - 1, d))
  // Date.UTC rolls 2026-02-31 over to March; a real day survives the round trip.
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null
}

const fromUtc = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`

export const isDay = (value: unknown): value is string =>
  typeof value === 'string' && toUtc(value) !== null

export const isTime = (value: unknown): value is string =>
  typeof value === 'string' && TIME_RE.test(value)

function mustParse(day: string): Date {
  const date = toUtc(day)
  if (!date) throw new RangeError(`Not a calendar day: ${day}`)
  return date
}

/** Today in the user's local time zone (the zone the schedule is planned in). */
export function localToday(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function addDays(day: string, days: number): string {
  const date = mustParse(day)
  date.setUTCDate(date.getUTCDate() + days)
  return fromUtc(date)
}

/** Whole days from `a` to `b` (negative when b is earlier). */
export function daysBetween(a: string, b: string): number {
  return Math.round((mustParse(b).getTime() - mustParse(a).getTime()) / 86_400_000)
}

export function weekdayOf(day: string): Weekday {
  return mustParse(day).getUTCDay() as Weekday
}

/** Monday of the week the day is in (weeks start on Monday in the design). */
export function weekStart(day: string): string {
  return addDays(day, -((weekdayOf(day) + 6) % 7))
}

/** Weekdays in display order, Monday first; values stay Date.getDay() numbers. */
export const WEEK_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0]

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const WEEKDAY_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export const weekdayShort = (day: Weekday) => WEEKDAY_SHORT[day]
export const weekdayLong = (day: Weekday) => WEEKDAY_LONG[day]

/** A month as "YYYY-MM". */
export interface MonthRef {
  year: number
  /** 0-based, like Date. */
  month: number
}

export const monthOf = (day: string): MonthRef => {
  const date = mustParse(day)
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() }
}

export const monthKey = ({ year, month }: MonthRef) => `${year}-${pad(month + 1)}`

/** "2026-11" → month; null when invalid (bad URL param). */
export function parseMonthKey(value: string | null): MonthRef | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? '')
  if (!match) return null
  const month = Number(match[2]) - 1
  return month >= 0 && month <= 11 ? { year: Number(match[1]), month } : null
}

export function shiftMonth({ year, month }: MonthRef, by: number): MonthRef {
  const total = year * 12 + month + by
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 }
}

/**
 * The days a month grid shows: whole weeks, Monday to Sunday, from the week of the 1st to
 * the week of the last day (35 or 42 cells; 28 for a February starting on Monday).
 */
export function monthGrid({ year, month }: MonthRef): string[] {
  const first = `${year}-${pad(month + 1)}-01`
  const last = addDays(fromUtc(new Date(Date.UTC(year, month + 1, 1))), -1)
  const start = weekStart(first)
  const end = addDays(weekStart(last), 6)
  const days: string[] = []
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day)
  return days
}

const UTC = 'UTC'

/** Formats a calendar day with Intl, without the time zone shifting it a day. */
export function formatDay(day: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: UTC }).format(mustParse(day))
}

/** "November 2026". */
export const formatMonth = (ref: MonthRef) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: UTC }).format(
    new Date(Date.UTC(ref.year, ref.month, 1)),
  )

/** "Today", "Tomorrow", or "Mon, Nov 9" relative to `today`. */
export function relativeDay(day: string, today: string): string {
  const diff = daysBetween(today, day)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return formatDay(day, { weekday: 'short', month: 'short', day: 'numeric' })
}
