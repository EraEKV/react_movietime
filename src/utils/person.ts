import type { LibraryStatus } from '../types/library'
import type { MediaKey, MediaType } from '../types/media'
import type { PersonCastCredit, PersonCredit, PersonCrewCredit, PersonDetails } from '../types/tmdb'
import { mediaKey } from './media'

/** What a person did on a title. `other` is every crew job outside the three filters. */
export type PersonRole = 'actor' | 'director' | 'writer' | 'other'

/** One title in a filmography, with every role the person had on it merged in. */
export interface PersonWork {
  key: MediaKey
  mediaType: MediaType
  id: number
  title: string
  posterPath: string | null
  /** Release date for movies, first air date for series; '' when unknown. */
  date: string
  rating: number
  popularity: number
  roles: PersonRole[]
  /** Characters and jobs for the card line: "Neo", "Director". */
  credits: string[]
  /** Series only: episodes the person appears in; null when TMDB doesn't say. */
  episodeCount: number | null
}

export type RoleFilter = 'all' | 'actor' | 'director' | 'writer'
export type MediaFilter = 'all' | MediaType
export type WorkSort = 'year' | 'popularity'

export interface FilmographyFilters {
  role: RoleFilter
  media: MediaFilter
}

export const MIN_KNOWN_FOR = 4
export const MAX_KNOWN_FOR = 6

const WRITER_JOBS = new Set([
  'Writer',
  'Screenplay',
  'Screenstory',
  'Story',
  'Teleplay',
  'Novel',
  'Creator',
  'Author',
])

/** Appearing as oneself: talk shows and awards dominate popularity but aren't "known for". */
const SELF_CHARACTER = /^(self|himself|herself|themselves)\b/i

export function crewRole(job: string): PersonRole {
  if (job === 'Director') return 'director'
  return WRITER_JOBS.has(job) ? 'writer' : 'other'
}

function addUnique<T>(list: T[], value: T | undefined | '') {
  if (value && !list.includes(value)) list.push(value)
}

/**
 * Turns the two raw lists of combined_credits into one entry per title.
 * TMDB repeats a title for every job (director + writer + producer) and for every role,
 * so the key is the media key: roles and credit lines are merged, popularity and episode
 * count take the larger value. Entries without a title or of an unknown type are dropped.
 */
export function buildFilmography(cast: PersonCastCredit[], crew: PersonCrewCredit[]): PersonWork[] {
  const works = new Map<MediaKey, PersonWork>()

  function add(
    credit: PersonCredit,
    role: PersonRole,
    line: string | undefined,
    episodes?: number,
  ) {
    if (credit.media_type !== 'movie' && credit.media_type !== 'tv') return
    const title = (credit.media_type === 'movie' ? credit.title : credit.name) ?? ''
    if (!title) return
    const key = mediaKey(credit.media_type, credit.id)
    let work = works.get(key)
    if (!work) {
      work = {
        key,
        mediaType: credit.media_type,
        id: credit.id,
        title,
        posterPath: credit.poster_path,
        date: (credit.media_type === 'movie' ? credit.release_date : credit.first_air_date) ?? '',
        rating: credit.vote_average,
        popularity: credit.popularity,
        roles: [],
        credits: [],
        episodeCount: null,
      }
      works.set(key, work)
    }
    work.popularity = Math.max(work.popularity, credit.popularity)
    work.posterPath ??= credit.poster_path
    addUnique(work.roles, role)
    addUnique(work.credits, line?.trim())
    if (episodes) work.episodeCount = Math.max(work.episodeCount ?? 0, episodes)
  }

  for (const credit of cast) add(credit, 'actor', credit.character, credit.episode_count)
  for (const credit of crew) add(credit, crewRole(credit.job), credit.job)
  return [...works.values()]
}

/** Local calendar day as "2026-11-09": release dates are plain days, not instants. */
export function isoDay(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** No date, or a date after today: the work isn't out yet. */
export const isUpcoming = (work: PersonWork, today: string) => !work.date || work.date > today

export function splitReleased(works: PersonWork[], today: string) {
  return {
    released: works.filter((work) => !isUpcoming(work, today)),
    upcoming: works.filter((work) => isUpcoming(work, today)),
  }
}

export function filterWorks(works: PersonWork[], { role, media }: FilmographyFilters) {
  return works.filter(
    (work) =>
      (role === 'all' || work.roles.includes(role)) &&
      (media === 'all' || work.mediaType === media),
  )
}

/** Newest first / most popular first. Ties fall back to the other key, then to the title. */
export function sortWorks(works: PersonWork[], sort: WorkSort): PersonWork[] {
  const byDate = (a: PersonWork, b: PersonWork) => b.date.localeCompare(a.date)
  const byPopularity = (a: PersonWork, b: PersonWork) => b.popularity - a.popularity
  const [first, second] = sort === 'year' ? [byDate, byPopularity] : [byPopularity, byDate]
  return [...works].sort((a, b) => first(a, b) || second(a, b) || a.title.localeCompare(b.title))
}

/** Announced works: the nearest first, those without a date at the very end. */
export function sortUpcoming(works: PersonWork[]): PersonWork[] {
  return [...works].sort((a, b) => {
    if (!a.date !== !b.date) return a.date ? -1 : 1
    return a.date.localeCompare(b.date) || b.popularity - a.popularity
  })
}

const DEPARTMENT_ROLE: Record<string, PersonRole> = {
  Acting: 'actor',
  Directing: 'director',
  Writing: 'writer',
}

/**
 * The most popular released works in the person's main craft, for the strip at the top.
 * Appearances as oneself are skipped. Fewer than MIN_KNOWN_FOR works → nothing: the strip
 * would just repeat the whole filmography.
 */
export function knownFor(works: PersonWork[], department: string, today: string): PersonWork[] {
  const { released } = splitReleased(works, today)
  const role = DEPARTMENT_ROLE[department]
  const notSelf = (work: PersonWork) =>
    !(work.roles.length === 1 && work.roles[0] === 'actor') ||
    work.credits.length === 0 ||
    !work.credits.every((line) => SELF_CHARACTER.test(line))

  const candidates = released.filter(notSelf)
  const inCraft = role ? candidates.filter((work) => work.roles.includes(role)) : candidates
  const pool = inCraft.length >= MIN_KNOWN_FOR ? inCraft : candidates
  if (pool.length < MIN_KNOWN_FOR) return []
  return sortWorks(pool, 'popularity').slice(0, MAX_KNOWN_FOR)
}

export interface SeenProgress {
  seen: number
  planned: number
  total: number
}

/**
 * "You've seen N of M": M is the released works given, N those completed in the library.
 * A series being watched isn't seen yet. `planned` counts the library's plan status.
 */
export function seenProgress(
  released: PersonWork[],
  statuses: ReadonlyMap<MediaKey, LibraryStatus>,
): SeenProgress {
  let seen = 0
  let planned = 0
  for (const work of released) {
    const status = statuses.get(work.key)
    if (status === 'completed') seen++
    else if (status === 'plan') planned++
  }
  return { seen, planned, total: released.length }
}

/**
 * The biography in the current language, or the English one when TMDB has none
 * (most Kazakh profiles). Comes from the same request: the person appends `translations`.
 */
export function biographyOf(person: Pick<PersonDetails, 'biography' | 'translations'>): string {
  if (person.biography.trim()) return person.biography.trim()
  const english = person.translations?.translations.find((item) => item.iso_639_1 === 'en')
  return english?.data.biography?.trim() ?? ''
}

/** Crew jobs worth a link on a title page, in the order they are shown. */
export type KeyJob =
  'creator' | 'director' | 'writer' | 'cinematography' | 'music' | 'editing' | 'producer'

const KEY_JOB: Record<string, KeyJob> = {
  Creator: 'creator',
  Director: 'director',
  Writer: 'writer',
  Screenplay: 'writer',
  Screenstory: 'writer',
  Story: 'writer',
  Teleplay: 'writer',
  Novel: 'writer',
  'Director of Photography': 'cinematography',
  'Original Music Composer': 'music',
  Editor: 'editing',
  Producer: 'producer',
}

const KEY_JOB_ORDER: KeyJob[] = [
  'creator',
  'director',
  'writer',
  'cinematography',
  'music',
  'editing',
  'producer',
]

export interface KeyCrewMember {
  id: number
  name: string
  jobs: KeyJob[]
}

/**
 * The people a visitor looks for first: one entry per person with their key jobs merged
 * ("Screenplay" and "Story" are both `writer`), most important job first. Other jobs
 * (gaffer, caterer…) are left out. A person is listed once even with five credits.
 */
export function keyCrew(
  crew: { id: number; name: string; job: string }[],
  limit = 10,
): KeyCrewMember[] {
  const people = new Map<number, KeyCrewMember>()
  for (const member of crew) {
    const job = KEY_JOB[member.job]
    if (!job) continue
    const person = people.get(member.id) ?? { id: member.id, name: member.name, jobs: [] }
    if (!person.jobs.includes(job)) person.jobs.push(job)
    people.set(member.id, person)
  }
  const rank = (job: KeyJob) => KEY_JOB_ORDER.indexOf(job)
  return [...people.values()]
    .map((person) => ({ ...person, jobs: [...person.jobs].sort((a, b) => rank(a) - rank(b)) }))
    .sort((a, b) => rank(a.jobs[0] ?? 'producer') - rank(b.jobs[0] ?? 'producer'))
    .slice(0, limit)
}
