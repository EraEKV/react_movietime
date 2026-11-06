// Pure planner helpers: TMDB episodes → plan units, colours, labels, roles. No React.
import type { LibraryMedia, SeriesProgress } from '../types/library'
import type { Plan, PlanColor, PlanRole, PlanUnit, Weekday } from '../types/plan'
import type { RawSeason } from '../types/tmdb'
import { WEEK_ORDER, weekdayShort } from './calendar'
import { watchedUpTo, type SeasonSize } from './library'
import { mediaKey } from './media'

/** When TMDB knows neither the episode nor the series runtime. */
export const DEFAULT_RUNTIME = 45

/**
 * Every aired episode of the regular seasons, in order. Specials (season 0) are left out,
 * and so are episodes without an air date or airing after `today`: you can't plan to watch
 * what doesn't exist yet. `ordinal` follows the library's progress count (watchedUpTo).
 */
export function episodesToUnits(
  seriesId: number,
  seasons: RawSeason[],
  sizes: SeasonSize[],
  fallbackRuntime: number | null,
  today: string,
): PlanUnit[] {
  return seasons
    .filter((s) => s.season_number > 0)
    .toSorted((a, b) => a.season_number - b.season_number)
    .flatMap((season) =>
      season.episodes
        .filter((e) => e.air_date && e.air_date <= today)
        .map((e) => ({
          mediaKey: mediaKey('tv', seriesId),
          title: e.name,
          season: e.season_number,
          episode: e.episode_number,
          ordinal: watchedUpTo(sizes, e.season_number, e.episode_number),
          runtime: e.runtime || fallbackRuntime || DEFAULT_RUNTIME,
          media: null,
        })),
    )
}

/** A movie of a list as one unit. */
export function movieToUnit(media: LibraryMedia): PlanUnit {
  return {
    mediaKey: mediaKey('movie', media.tmdbId),
    title: media.title,
    season: null,
    episode: null,
    ordinal: null,
    runtime: media.runtime || DEFAULT_RUNTIME * 2,
    media,
  }
}

/** Index of the first unit after the library progress ("continue"); 0 without progress. */
export function continueIndex(units: PlanUnit[], progress: SeriesProgress | null): number {
  if (!progress) return 0
  const index = units.findIndex((u) => (u.ordinal ?? 0) > progress.watchedEpisodes)
  return index === -1 ? units.length : index
}

export const PLAN_COLORS: PlanColor[] = [1, 2, 3, 4, 5, 6]

/**
 * Colours go in creation order (design): the first one no active plan uses, or — with six
 * or more plans — the next one in the cycle.
 */
export function nextPlanColor(plans: Pick<Plan, 'color' | 'status'>[]): PlanColor {
  const used = new Set(plans.filter((p) => p.status === 'active').map((p) => p.color))
  return PLAN_COLORS.find((c) => !used.has(c)) ?? PLAN_COLORS[plans.length % 6] ?? 1
}

export const isPlanColor = (value: unknown): value is PlanColor =>
  PLAN_COLORS.some((c) => c === value)

/** "Mon, Wed, Fri at 21:00" — weekdays in display order (Monday first). */
export function scheduleLabel(weekdays: Weekday[], time: string): string {
  const days = WEEK_ORDER.filter((d) => weekdays.includes(d))
  const text = days.length === 7 ? 'Every day' : days.map((day) => weekdayShort(day)).join(', ')
  return `${text} at ${time}`
}

/** 0…1 for the progress ring and bar. */
export const planProgress = (plan: Pick<Plan, 'doneUnits' | 'totalUnits'>) =>
  plan.totalUnits > 0 ? Math.min(1, plan.doneUnits / plan.totalUnits) : 0

/** Owners and editors mark, skip and move sessions; viewers and link visitors only look. */
export const canEditSessions = (role: PlanRole) => role === 'owner' || role === 'editor'

/** "episode"/"movie" by plan kind. */
export const unitWord = (plan: Pick<Plan, 'kind'>, count: number) =>
  `${count} ${plan.kind === 'series' ? 'episode' : 'movie'}${count === 1 ? '' : 's'}`

/** Poster of a session: the movie's own, or the series'. */
export const sessionPoster = (plan: Pick<Plan, 'media'>, units: PlanUnit[]) =>
  units[0]?.media?.posterPath ?? plan.media?.posterPath ?? null

/** A Firestore write error → a sentence for the user. */
export function planErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null
  if (code === 'permission-denied') return 'You don’t have permission to change this plan.'
  if (code === 'not-found') return 'This plan no longer exists.'
  if (error instanceof Error && error.name === 'PlanError') return error.message
  return 'We couldn’t save your changes. Check your connection and try again.'
}

/** An error whose message is meant for the user (no episodes left, empty list…). */
export class PlanError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PlanError'
  }
}

/** Where a plan starts (stepper step 2). */
export type StartChoice =
  | { mode: 'continue' }
  | { mode: 'beginning' }
  | { mode: 'episode'; season: number; episode: number }
  | { mode: 'movie'; index: number }

/** Index of the first unit the plan includes for a start choice. */
export function startIndexOf(
  units: PlanUnit[],
  progress: SeriesProgress | null,
  choice: StartChoice,
): number {
  if (choice.mode === 'beginning') return 0
  if (choice.mode === 'continue') return continueIndex(units, progress)
  if (choice.mode === 'movie') return Math.min(Math.max(choice.index, 0), units.length)
  const index = units.findIndex((u) => u.season === choice.season && u.episode === choice.episode)
  return index === -1 ? 0 : index
}

/** Default plan name: "Breaking Bad", "Breaking Bad — from S2E7", "Comfort movies marathon". */
export function defaultPlanTitle(
  kind: 'series' | 'list',
  name: string,
  first: PlanUnit | undefined,
): string {
  if (kind === 'list') return `${name} marathon`.slice(0, 120)
  if (!first || first.season === null || first.episode === null) return name.slice(0, 120)
  if (first.season === 1 && first.episode === 1) return name.slice(0, 120)
  return `${name} — from S${first.season}E${first.episode}`.slice(0, 120)
}
