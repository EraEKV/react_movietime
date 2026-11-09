import { createHash } from 'node:crypto'

// Pure part of the Planner → Google Calendar sync: how a session becomes an event and how
// the events that exist are compared with the ones that should. No network here.

/** How far ahead sessions are copied. Later ones appear as the window moves. */
export const WINDOW_DAYS = 90

export interface SyncUnit {
  title: string
  season: number | null
  episode: number | null
}

export interface SyncPlan {
  id: string
  title: string
  kind: 'series' | 'list' | 'movie'
}

export interface SyncSession {
  id: string
  /** "YYYY-MM-DD" and "HH:mm", local time of the user. */
  date: string
  time: string
  minutes: number
  units: SyncUnit[]
}

export interface DesiredEvent {
  id: string
  planId: string
  sessionId: string
  hash: string
  body: Record<string, unknown>
}

/** What is already in the calendar and was made by the app (deleted events aren't listed). */
export interface ExistingEvent {
  id: string
  planId: string
  sessionId: string
  hash: string
}

/** Google accepts custom ids of 5–1024 chars from a–v and 0–9. Same session → same id. */
export function eventId(uid: string, sessionId: string): string {
  return 'mt' + createHash('sha256').update(`${uid}:${sessionId}`).digest('hex').slice(0, 40)
}

const label = (unit: SyncUnit) => `S${unit.season}E${unit.episode}`

/** "Show · S1E3", "Show · S1E3–4", "Show · S1E10–S2E1"; movies by their titles. */
export function sessionTitle(plan: SyncPlan, units: SyncUnit[]): string {
  const first = units[0]
  const last = units.at(-1)
  if (plan.kind !== 'series' || !first || !last || first.season == null || first.episode == null) {
    return units.map((u) => u.title).join(', ') || plan.title
  }
  if (last.season == null || last.episode == null || units.length === 1) {
    return `${plan.title} · ${label(first)}`
  }
  const end = last.season === first.season ? String(last.episode) : label(last)
  return `${plan.title} · ${label(first)}–${end}`
}

/** Wall-clock arithmetic: "2026-11-10", "23:30" + 90 min → "2026-11-11T01:00:00". */
export function addMinutes(date: string, time: string, minutes: number): string {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  const t = new Date(Date.UTC(y, mo - 1, d, h, mi + minutes))
  return t.toISOString().slice(0, 19)
}

export function buildEvent(
  uid: string,
  plan: SyncPlan,
  session: SyncSession,
  timeZone: string,
  appUrl: string,
): DesiredEvent {
  const summary = sessionTitle(plan, session.units)
  const start = `${session.date}T${session.time}:00`
  const end = addMinutes(session.date, session.time, Math.max(session.minutes, 1))
  const url = `${appUrl}/planner/${plan.id}`
  const description = `Avleron\n${url}`
  const hash = createHash('sha1')
    .update([summary, description, start, end, timeZone].join('|'))
    .digest('hex')
  const id = eventId(uid, session.id)
  return {
    id,
    planId: plan.id,
    sessionId: session.id,
    hash,
    body: {
      id,
      summary,
      description,
      start: { dateTime: start, timeZone },
      end: { dateTime: end, timeZone },
      source: { title: 'Avleron', url },
      extendedProperties: {
        private: {
          movietimeApp: '1',
          movietimePlanId: plan.id,
          movietimeSessionId: session.id,
          movietimeHash: hash,
        },
      },
    },
  }
}

/** Pending sessions from yesterday to WINDOW_DAYS ahead (dates are local strings). */
export function inWindow(date: string, today: string): boolean {
  const from = addMinutes(today, '00:00', -24 * 60).slice(0, 10)
  const to = addMinutes(today, '00:00', WINDOW_DAYS * 24 * 60).slice(0, 10)
  return date >= from && date <= to
}

export interface Changes {
  insert: DesiredEvent[]
  patch: DesiredEvent[]
  remove: ExistingEvent[]
}

/** Compares what should be in the calendar with what is, for the sessions in `scope`. */
export function reconcile(desired: DesiredEvent[], existing: ExistingEvent[]): Changes {
  const have = new Map(existing.map((e) => [e.sessionId, e]))
  const want = new Set(desired.map((d) => d.sessionId))
  const changes: Changes = { insert: [], patch: [], remove: [] }
  for (const event of desired) {
    const current = have.get(event.sessionId)
    if (!current) changes.insert.push(event)
    else if (current.hash !== event.hash) changes.patch.push(event)
  }
  for (const event of existing) {
    if (!want.has(event.sessionId)) changes.remove.push(event)
  }
  return changes
}
