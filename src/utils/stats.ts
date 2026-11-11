import i18n, { translatedOption } from '../shared/i18n'
// Dashboard numbers: pure functions over library entries and plan sessions.
// No React, no Firestore — the page hands the data in, so every figure here can be
// checked by hand (and in unit tests) from the same input.
import type { Option } from '../shared/types/common'
import type { LibraryEntry, LibraryStatus } from '../types/library'
import type { MediaType } from '../types/media'
import type { Plan, PlannedSession, Weekday } from '../types/plan'
import {
  addDays,
  localToday,
  monthGrid,
  monthKey,
  monthOf,
  weekdayOf,
  weekdayShort,
  weekStart,
  WEEK_ORDER,
  type MonthRef,
} from './calendar'
import { LIBRARY_STATUSES } from './library'

export type StatsPeriod = 'all' | '30d' | 'year'

export const STATS_PERIODS: Option<StatsPeriod>[] = [
  translatedOption('all', 'dashboard:periods.all'),
  translatedOption('30d', 'dashboard:periods.30d'),
  translatedOption('year', 'dashboard:periods.year'),
]

/** Unknown values (an old link, a typo) fall back to all time. */
export const parsePeriod = (value: string | null): StatsPeriod =>
  STATS_PERIODS.find((p) => p.value === value)?.value ?? 'all'

/** First day of the period ("YYYY-MM-DD", local), or null for all time. */
export function periodStart(period: StatsPeriod, today: string): string | null {
  if (period === '30d') return addDays(today, -29)
  if (period === 'year') return `${today.slice(0, 4)}-01-01`
  return null
}

/** The local calendar day of an ISO timestamp. */
const dayOf = (iso: string) => localToday(new Date(iso))

/**
 * Entries the period is about: added or changed in it (updatedAt is never earlier than
 * addedAt, so one check covers both). All time = the whole library.
 */
export function entriesInPeriod(entries: LibraryEntry[], start: string | null): LibraryEntry[] {
  return start === null ? entries : entries.filter((e) => dayOf(e.updatedAt) >= start)
}

/** Episodes counted as watched: the saved progress, or every episode of a completed series. */
export function watchedEpisodes(entry: LibraryEntry): number {
  if (entry.mediaType !== 'tv') return 0
  if (entry.progress) return entry.progress.watchedEpisodes
  return entry.status === 'completed' ? (entry.totalEpisodes ?? 0) : 0
}

/**
 * Minutes watched for one entry: a completed movie's runtime, or watched episodes ×
 * the typical episode runtime. `null` means "watched something, but TMDB has no runtime".
 */
export function minutesWatched(entry: LibraryEntry): number | null {
  const units =
    entry.mediaType === 'movie' ? (entry.status === 'completed' ? 1 : 0) : watchedEpisodes(entry)
  if (units === 0) return 0
  return entry.runtime === null ? null : units * entry.runtime
}

export interface LibraryStats {
  titles: number
  completed: number
  /** Share of completed titles, 0–1 (0 for an empty library). */
  completedShare: number
  /** Mean of the user's 1–10 scores, one decimal; null when nothing is scored. */
  averageScore: number | null
  scored: number
  minutes: number
  /** Watched titles left out of the hours because their runtime is unknown. */
  noRuntime: number
}

export function libraryStats(entries: LibraryEntry[]): LibraryStats {
  let completed = 0
  let scoreSum = 0
  let scored = 0
  let minutes = 0
  let noRuntime = 0
  for (const entry of entries) {
    if (entry.status === 'completed') completed += 1
    if (entry.score !== null) {
      scoreSum += entry.score
      scored += 1
    }
    const watched = minutesWatched(entry)
    if (watched === null) noRuntime += 1
    else minutes += watched
  }
  return {
    titles: entries.length,
    completed,
    completedShare: entries.length ? completed / entries.length : 0,
    averageScore: scored ? Math.round((scoreSum / scored) * 10) / 10 : null,
    scored,
    minutes,
    noRuntime,
  }
}

/** One bar of a breakdown; `value` is the filter it opens in the library. */
export interface Bar<V extends string = string> {
  value: V
  label: string
  count: number
}

/** Every status in the library's order, zeros included, so the bars never reshuffle. */
export function byStatus(entries: LibraryEntry[]): Bar<LibraryStatus>[] {
  return LIBRARY_STATUSES.map((s) => ({
    value: s.value,
    label: s.label,
    count: entries.filter((e) => e.status === s.value).length,
  }))
}

export function byMediaType(entries: LibraryEntry[]): Bar<MediaType>[] {
  const series = entries.filter((e) => e.mediaType === 'tv').length
  return [
    { value: 'tv', label: i18n.t('library:types.tv'), count: series },
    { value: 'movie', label: i18n.t('library:types.movie'), count: entries.length - series },
  ]
}

/**
 * The most common genres, largest first (ties by name). A title counts once in each of
 * its genres. Names come from TMDB (movie and TV lists merged); an id TMDB doesn't name
 * is skipped rather than shown as a number.
 */
export function topGenres(
  entries: LibraryEntry[],
  names: ReadonlyMap<number, string>,
  limit = 8,
): Bar[] {
  const counts = new Map<number, number>()
  for (const entry of entries) {
    for (const id of new Set(entry.genreIds)) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return [...counts]
    .flatMap(([id, count]) => {
      const label = names.get(id)
      return label ? [{ value: String(id), label, count }] : []
    })
    .toSorted((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit)
}

/* ---------- Plans and sessions ---------- */

export interface PlanStats {
  /** Watched sessions this week (Monday to Sunday) … */
  weekDone: number
  /** … out of the sessions planned this week that weren't skipped. */
  weekPlanned: number
  /** Pending sessions today. */
  tonight: number
  activePlans: number
  sharedActive: number
}

export function planStats(
  plans: Plan[],
  sessions: PlannedSession[],
  sharedIds: ReadonlySet<string>,
  today: string,
): PlanStats {
  const from = weekStart(today)
  const to = addDays(from, 6)
  const week = sessions.filter(({ session }) => session.date >= from && session.date <= to)
  const active = plans.filter((p) => p.status === 'active')
  return {
    weekDone: week.filter(({ session }) => session.status === 'done').length,
    weekPlanned: week.filter(({ session }) => session.status !== 'skipped').length,
    tonight: week.filter(({ session }) => session.date === today && session.status === 'pending')
      .length,
    activePlans: active.length,
    sharedActive: active.filter((p) => sharedIds.has(p.id)).length,
  }
}

/** Watched sessions per weekday in the period (up to today), Monday first. */
export function sessionsByWeekday(
  sessions: PlannedSession[],
  start: string | null,
  today: string,
): Bar<`${Weekday}`>[] {
  const counts = new Map<Weekday, number>()
  for (const { session } of sessions) {
    if (session.status !== 'done' || session.date > today) continue
    if (start !== null && session.date < start) continue
    const day = weekdayOf(session.date)
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }
  return WEEK_ORDER.map((day) => ({
    value: `${day}`,
    label: weekdayShort(day),
    count: counts.get(day) ?? 0,
  }))
}

export interface WeekPoint {
  /** Monday of the week, "YYYY-MM-DD". */
  week: string
  count: number
}

/** Watched sessions per week (Monday to Sunday) for the last `weeks` weeks, oldest first. */
export function sessionsByWeek(sessions: PlannedSession[], today: string, weeks = 12): WeekPoint[] {
  const last = weekStart(today)
  const first = addDays(last, -7 * (weeks - 1))
  const counts = new Map<string, number>()
  for (const { session } of sessions) {
    if (session.status !== 'done' || session.date > today || session.date < first) continue
    const week = weekStart(session.date)
    counts.set(week, (counts.get(week) ?? 0) + 1)
  }
  return Array.from({ length: weeks }, (_, i) => {
    const week = addDays(first, 7 * i)
    return { week, count: counts.get(week) ?? 0 }
  })
}

export interface DayPoint {
  /** "YYYY-MM-DD". */
  day: string
  count: number
}

/** Watched sessions on every day of the month (zeros included), the 1st first. */
export function sessionsByDay(
  sessions: PlannedSession[],
  month: MonthRef,
  today = localToday(),
): DayPoint[] {
  const prefix = `${monthKey(month)}-`
  const counts = new Map<string, number>()
  for (const { session } of sessions) {
    if (session.status !== 'done' || session.date > today || !session.date.startsWith(prefix)) {
      continue
    }
    counts.set(session.date, (counts.get(session.date) ?? 0) + 1)
  }
  return monthGrid(month)
    .filter((day) => day.startsWith(prefix))
    .map((day) => ({ day, count: counts.get(day) ?? 0 }))
}

/**
 * The days of a "last year" graph as weeks (columns), Monday to Sunday, from the week
 * 52 weeks before today's to today's week. Days after today are part of the last week;
 * the caller leaves them empty.
 */
export function activityWeeks(today: string, weeks = 53): string[][] {
  const first = addDays(weekStart(today), -7 * (weeks - 1))
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(first, 7 * w + d)),
  )
}

/** Watched sessions per day ("YYYY-MM-DD") from `from` up to today; days without any are absent. */
export function countSessionsByDay(
  sessions: PlannedSession[],
  from: string,
  today: string,
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const { session } of sessions) {
    if (session.status !== 'done' || session.date > today || session.date < from) continue
    counts.set(session.date, (counts.get(session.date) ?? 0) + 1)
  }
  return counts
}

/**
 * Where month names go above the weeks: the week that holds a 1st. The first week gets its
 * month too unless the next label would be too close (under 3 weeks away).
 */
export function monthLabels(weeks: string[][]): { index: number; month: MonthRef }[] {
  const labels: { index: number; month: MonthRef }[] = []
  weeks.forEach((week, index) => {
    const first = week.find((day) => day.endsWith('-01'))
    if (first) labels.push({ index, month: monthOf(first) })
  })
  const start = weeks[0]?.[0]
  if (start && (labels[0]?.index ?? 0) >= 3) labels.unshift({ index: 0, month: monthOf(start) })
  return labels
}

/** Shade 0–4 of a day against the busiest day of the month; 0 only for an empty day. */
export function activityLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4))) as 1 | 2 | 3 | 4
}

/** The next pending sessions from today on, soonest first. */
export function upcomingSessions(
  sessions: PlannedSession[],
  today: string,
  limit = 6,
): PlannedSession[] {
  return sessions
    .filter(({ plan, session }) => plan.status === 'active' && session.status === 'pending')
    .filter(({ session }) => session.date >= today)
    .toSorted(
      (a, b) =>
        a.session.date.localeCompare(b.session.date) ||
        a.session.time.localeCompare(b.session.time),
    )
    .slice(0, limit)
}

/** Minutes → "186" + "h", or "45" + "min" under an hour. */
export function hoursValue(minutes: number): { value: string; unit: string } {
  if (minutes > 0 && minutes < 60) {
    return { value: String(minutes), unit: i18n.t('dashboard:units.min') }
  }
  return { value: String(Math.round(minutes / 60)), unit: i18n.t('dashboard:units.hour') }
}
