import { toIcs, unitsLabel, type IcsEvent } from './ics.js'

// The calendar feed: every pending session of a user's plans as one .ics file. Pure — the
// endpoint (api/ics.ts) reads Firestore and hands the rows here.

export interface FeedPlan {
  id: string
  title: string
  /** The series' own title (series plans); movie marathons are named by the plan. */
  mediaTitle: string | null
}

export interface FeedSession {
  id: string
  planId: string
  date: string
  time: string
  minutes: number
  units: { season: number | null; episode: number | null; title: string }[]
}

export const FEED_NAME = 'Avleron'

/** 32 URL-safe characters: 192 random bits, written by the app (see firestore.rules). */
export const TOKEN = /^[A-Za-z0-9_-]{32}$/

/**
 * The secret in the request. On Vercel the function may see either the rewritten URL
 * (`/api/ics?file=<token>.ics`, from vercel.json) or the original one
 * (`/api/calendar/<token>.ics`), so both are read, and `?token=` too. Null when it isn't a
 * token, so nothing is asked of Firestore.
 */
export function tokenFrom(url: URL): string | null {
  const fromPath = /^\/api\/calendar\/([^/]+)\.ics$/.exec(url.pathname)?.[1]
  const raw =
    url.searchParams.get('token') ?? url.searchParams.get('file')?.replace(/\.ics$/, '') ?? fromPath
  return raw && TOKEN.test(raw) ? raw : null
}

/** One event per session, named like the file the plan page downloads. */
export function buildFeed(
  plans: FeedPlan[],
  sessions: FeedSession[],
  origin: string,
  timeZone: string,
  now: Date,
): string {
  const byId = new Map(plans.map((plan) => [plan.id, plan]))
  const events: IcsEvent[] = []
  for (const session of [...sessions].sort(
    (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
  )) {
    const plan = byId.get(session.planId)
    if (!plan) continue
    events.push({
      uid: `${session.id}@movietime`,
      date: session.date,
      time: session.time,
      minutes: session.minutes,
      summary: `${plan.mediaTitle ?? plan.title} · ${unitsLabel(session.units)}`,
      description: session.units.map((unit) => unit.title).join('\n'),
      url: `${origin}/planner/${plan.id}`,
    })
  }
  return toIcs(FEED_NAME, events, now, timeZone)
}
