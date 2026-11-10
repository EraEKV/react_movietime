// Pure helpers for the edits a user makes to a plan's schedule before creating it:
// moving a session to another day, and (for marathons) reordering or dropping films.
import type { PlanUnit, ScheduleOptions, ScheduledSession } from '../types/plan'
import { buildSchedule } from './schedule'

/** Custom dates by session key: a film's media key (marathon) or the session index (series). */
export type Moves = Record<string, string>

/** Custom times by session key (same keys as `Moves`). */
export type Times = Record<string, string>

export const sessionKey = (session: ScheduledSession, movies: boolean): string =>
  movies ? (session.units[0]?.mediaKey ?? String(session.index)) : String(session.index)

/**
 * The generated schedule with the user's dates on top. A marathon is a list of films by
 * date, so the films follow their dates (ties keep the generated order); a series keeps its
 * episodes in order.
 */
export function applyMoves(
  base: ScheduledSession[],
  moves: Moves,
  movies: boolean,
): ScheduledSession[] {
  const dated = base.map((session) => ({
    ...session,
    date: moves[sessionKey(session, movies)] ?? session.date,
  }))
  if (!movies || Object.keys(moves).length === 0) return dated
  return dated
    .map((session, position) => ({ session, position }))
    .sort((a, b) => a.session.date.localeCompare(b.session.date) || a.position - b.position)
    .map(({ session }, index) => ({ ...session, index }))
}

/** The sessions with the user's own times on top. */
export const applyTimes = (
  sessions: ScheduledSession[],
  times: Times,
  movies: boolean,
): ScheduledSession[] =>
  Object.keys(times).length === 0
    ? sessions
    : sessions.map((session) => ({
        ...session,
        time: times[sessionKey(session, movies)] ?? session.time,
      }))

/**
 * Can this session land on `date`? Never in the past. A marathon takes any day; a series
 * stays between the dates of its neighbours, so the episodes are still watched in order.
 */
export function canMoveTo(
  sessions: ScheduledSession[],
  key: string,
  date: string,
  movies: boolean,
  today: string,
): boolean {
  if (date < today) return false
  if (movies) return true
  const at = sessions.findIndex((session) => sessionKey(session, false) === key)
  if (at === -1) return false
  const before = sessions[at - 1]
  const after = sessions[at + 1]
  return (!before || before.date <= date) && (!after || after.date >= date)
}

/**
 * A marathon edit as "films in this order, on these dates" → the custom dates to store:
 * only the films whose date differs from the one the weekday schedule would give them.
 */
export function marathonMoves(films: PlanUnit[], dates: string[], options: ScheduleOptions): Moves {
  const moves: Moves = {}
  buildSchedule(films, options).forEach((session, i) => {
    const date = dates[i]
    const film = session.units[0]
    if (date && film && date !== session.date) moves[film.mediaKey] = date
  })
  return moves
}

/** A film moved to `date`: films and dates in the new order (the moved one goes last on a shared day). */
export function moveFilmTo(
  sessions: ScheduledSession[],
  key: string,
  date: string,
): { keys: string[]; dates: string[] } {
  const rows = sessions.map((session, position) => ({
    key: sessionKey(session, true),
    date: sessionKey(session, true) === key ? date : session.date,
    last: sessionKey(session, true) === key ? 1 : 0,
    position,
  }))
  rows.sort((a, b) => a.date.localeCompare(b.date) || a.last - b.last || a.position - b.position)
  return { keys: rows.map((r) => r.key), dates: rows.map((r) => r.date) }
}

/** A film dropped from the plan: the later films move up one evening. */
export function removeFilm(
  sessions: ScheduledSession[],
  key: string,
): { keys: string[]; dates: string[] } {
  const keys = sessions.map((s) => sessionKey(s, true)).filter((k) => k !== key)
  return { keys, dates: sessions.slice(0, keys.length).map((s) => s.date) }
}
