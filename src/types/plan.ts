import type { LibraryMedia } from './library'
import type { MediaKey } from './media'
import type { Shareable, ShareRole } from './sharing'

// Watch plans and their sessions (docs/DATA_MODEL.md, "plans"). Calendar days are
// "YYYY-MM-DD" strings in the user's local time zone and times are "HH:mm": a day in a
// schedule is not a moment in time, and strings sort and compare correctly in queries.

/** A series, the movies of a list, or one movie on one evening. */
export type PlanKind = 'series' | 'list' | 'movie'
export type PlanStatus = 'active' | 'done' | 'archived'
export type SessionStatus = 'pending' | 'done' | 'skipped'

/** Plan colour 1–6 → the `--plan-N` token, assigned in creation order. */
export type PlanColor = 1 | 2 | 3 | 4 | 5 | 6

/** 0 = Sunday … 6 = Saturday, like Date.getDay(). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** One thing to watch: an episode, or a whole movie. */
export interface PlanUnit {
  mediaKey: MediaKey
  /** Episode name or movie title. */
  title: string
  season: number | null
  episode: number | null
  /** Position of the episode in the series (regular seasons only), for library progress. */
  ordinal: number | null
  /** Minutes. */
  runtime: number
  /** Movies only: the snapshot for the library entry (series use the plan's `media`). */
  media: LibraryMedia | null
}

export interface ScheduleOptions {
  startDate: string
  weekdays: Weekday[]
  /** The usual time of a session. */
  time: string
  /** Weekdays that start at their own time (Friday at 22:30); the rest use `time`. */
  times?: Partial<Record<Weekday, string>>
  /** Episodes per session (movies: always 1). */
  perSession: number
}

export interface PlanOptions extends ScheduleOptions {
  /** The first episode of the plan; null for movie plans. */
  from: { season: number; episode: number } | null
}

/** A session before it is saved: what buildSchedule returns. */
export interface ScheduledSession {
  index: number
  date: string
  time: string
  units: PlanUnit[]
  minutes: number
}

export interface PlanPerson {
  uid: string
  name: string
}

/** `plans/{planId}/sessions/{sessionId}`. */
export interface PlanSession extends ScheduledSession {
  id: string
  planId: string
  status: SessionStatus
  doneAt: string | null
  doneBy: PlanPerson | null
  /** Set on the copy a skip adds at the end: the id of the skipped session. */
  copyOf: string | null
}

/** `plans/{planId}`. Dates are ISO strings in the app; the service converts Timestamps. */
export interface Plan extends Shareable {
  title: string
  kind: PlanKind
  /** The series (kind = series). */
  media: LibraryMedia | null
  sourceListId: string | null
  options: PlanOptions
  color: PlanColor
  totalUnits: number
  doneUnits: number
  totalMinutes: number
  /** Next pending session day, null when nothing is left. */
  nextDate: string | null
  /** Last session day. */
  endDate: string
  status: PlanStatus
  createdAt: string
  updatedAt: string
}

export type PlanRole = ShareRole

/** What the stepper hands to createPlan. */
export interface PlanDraft {
  title: string
  kind: PlanKind
  media: LibraryMedia | null
  sourceListId: string | null
  options: PlanOptions
  units: PlanUnit[]
  /** The schedule as the user shaped it (moved days, dropped films); built from `options` when absent. */
  sessions?: ScheduledSession[]
}

/**
 * `plans/{planId}/likes/{sessionId}_{uid}`: a member's 👍 on the film of a marathon session.
 * `mediaKey` is the film it was given to: if the film changes (reorder, accepted swap), the
 * like stops counting for the session that now holds another film.
 */
export interface SessionLike {
  id: string
  sessionId: string
  uid: string
  name: string
  mediaKey: MediaKey
}

export type ProposalStatus = 'pending' | 'accepted' | 'rejected'

/**
 * `plans/{planId}/proposals/{sessionId}_{uid}`: a member suggests another film for a session.
 * One per person per session (a new suggestion replaces the old one). `replaces` is the film
 * it was made against; if the session holds another film by now, the proposal is stale.
 */
export interface SessionProposal {
  id: string
  sessionId: string
  by: PlanPerson
  /** The suggested film. */
  unit: PlanUnit
  replaces: MediaKey
  status: ProposalStatus
}

/** A session together with its plan, for the calendar, agenda and Home. */
export interface PlannedSession {
  session: PlanSession
  plan: Plan
}
