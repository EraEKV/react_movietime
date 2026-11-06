import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type Unsubscribe,
  type WriteBatch,
} from 'firebase/firestore'
import { endpoints, MAX_APPEND, tmdbGet } from '../api/tmdb'
import type { LibraryMedia, LibraryStatus, SeriesProgress } from '../types/library'
import type {
  Plan,
  PlanDraft,
  PlanOptions,
  PlanPerson,
  PlanSession,
  PlanUnit,
  SessionStatus,
  Weekday,
} from '../types/plan'
import type { MemberRole } from '../types/sharing'
import type { MovieBase, SeasonsBatchResponse, SeriesBase } from '../types/tmdb'
import { isDay, isTime, localToday } from '../utils/calendar'
import { seriesToLibraryMedia, movieToLibraryMedia } from '../utils/library'
import { mediaKey, parseMediaKey } from '../utils/media'
import { episodesToUnits, isPlanColor, movieToUnit, PlanError } from '../utils/planner'
import {
  buildSchedule,
  bySchedule,
  nextSlot,
  planDates,
  shiftSessions,
  unitsLabel,
} from '../utils/schedule'
import { db } from './firestore'

// plans/{planId} and plans/{planId}/sessions/{sessionId} (docs/DATA_MODEL.md).
// Every business operation is one batched write: the session, the plan's counters and the
// library change together or not at all, so the progress ring can't disagree with the
// sessions, and the library can't say "completed" for a plan that failed to save.

const plansCol = collection(db, 'plans')
const planRef = (id: string) => doc(db, 'plans', id)
const sessionsCol = (planId: string) => collection(db, 'plans', planId, 'sessions')
const sessionRef = (planId: string, id: string) => doc(db, 'plans', planId, 'sessions', id)
const entryRef = (uid: string, key: string) => doc(db, 'users', uid, 'library', key)
const activityCol = (uid: string) => collection(db, 'users', uid, 'activity')

/** Firestore keeps at most 500 writes in one batch; stay well below it. */
const BATCH_LIMIT = 400

const ESTIMATE = { serverTimestamps: 'estimate' } as const

/* ---------- Firestore documents → app objects ---------- */

const toIso = (value: unknown): string =>
  value instanceof Timestamp ? value.toDate().toISOString() : new Date().toISOString()

const num = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const nullableNum = (value: unknown) => (typeof value === 'number' ? value : null)

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []

function toRoles(value: unknown): Record<string, MemberRole> {
  if (typeof value !== 'object' || value === null) return {}
  const roles: Record<string, MemberRole> = {}
  for (const [email, role] of Object.entries(value)) {
    if (role === 'editor' || role === 'viewer') roles[email] = role
  }
  return roles
}

function toMedia(value: unknown): LibraryMedia | null {
  if (typeof value !== 'object' || value === null) return null
  const m = value as Record<string, unknown>
  if ((m.mediaType !== 'movie' && m.mediaType !== 'tv') || typeof m.tmdbId !== 'number') return null
  return {
    mediaType: m.mediaType,
    tmdbId: m.tmdbId,
    title: String(m.title ?? ''),
    posterPath: typeof m.posterPath === 'string' ? m.posterPath : null,
    year: typeof m.year === 'string' ? m.year : null,
    genreIds: Array.isArray(m.genreIds) ? m.genreIds.filter(Number.isInteger) : [],
    tmdbRating: nullableNum(m.tmdbRating),
    runtime: nullableNum(m.runtime),
    totalEpisodes: nullableNum(m.totalEpisodes),
  }
}

function toUnit(value: unknown): PlanUnit | null {
  if (typeof value !== 'object' || value === null) return null
  const u = value as Record<string, unknown>
  const parsed = parseMediaKey(String(u.mediaKey ?? ''))
  if (!parsed) return null
  return {
    mediaKey: mediaKey(parsed.mediaType, parsed.id),
    title: String(u.title ?? ''),
    season: nullableNum(u.season),
    episode: nullableNum(u.episode),
    ordinal: nullableNum(u.ordinal),
    runtime: num(u.runtime),
    media: toMedia(u.media),
  }
}

const isWeekday = (v: unknown): v is Weekday =>
  Number.isInteger(v) && Number(v) >= 0 && Number(v) <= 6

function toOptions(value: unknown): PlanOptions {
  const o = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  const from = o.from as Record<string, unknown> | null | undefined
  return {
    startDate: isDay(o.startDate) ? o.startDate : localToday(),
    weekdays: Array.isArray(o.weekdays) ? o.weekdays.filter(isWeekday) : [],
    time: isTime(o.time) ? o.time : '20:00',
    perSession: Math.max(1, num(o.perSession, 1)),
    from:
      from && typeof from.season === 'number' && typeof from.episode === 'number'
        ? { season: from.season, episode: from.episode }
        : null,
  }
}

function toPlan(id: string, data: DocumentData): Plan {
  const status = data.status === 'done' || data.status === 'archived' ? data.status : 'active'
  return {
    id,
    ownerUid: String(data.ownerUid ?? ''),
    ownerName: String(data.ownerName ?? ''),
    visibility: data.visibility === 'link' ? 'link' : 'private',
    roles: toRoles(data.roles),
    memberEmails: strings(data.memberEmails),
    title: String(data.title ?? ''),
    kind: data.kind === 'list' ? 'list' : 'series',
    media: toMedia(data.media),
    sourceListId: typeof data.sourceListId === 'string' ? data.sourceListId : null,
    options: toOptions(data.options),
    color: isPlanColor(data.color) ? data.color : 1,
    totalUnits: num(data.totalUnits),
    doneUnits: num(data.doneUnits),
    totalMinutes: num(data.totalMinutes),
    nextDate: isDay(data.nextDate) ? data.nextDate : null,
    endDate: isDay(data.endDate) ? data.endDate : '',
    status,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  }
}

const isSessionStatus = (v: unknown): v is SessionStatus =>
  v === 'pending' || v === 'done' || v === 'skipped'

function toSession(planId: string, id: string, data: DocumentData): PlanSession {
  const by = data.doneBy as Record<string, unknown> | null | undefined
  return {
    id,
    planId,
    index: num(data.index),
    date: isDay(data.date) ? data.date : '',
    time: isTime(data.time) ? data.time : '',
    units: Array.isArray(data.units)
      ? data.units.map(toUnit).filter((u): u is PlanUnit => u !== null)
      : [],
    minutes: num(data.minutes),
    status: isSessionStatus(data.status) ? data.status : 'pending',
    doneAt: data.doneAt instanceof Timestamp ? data.doneAt.toDate().toISOString() : null,
    doneBy: by && typeof by.uid === 'string' ? { uid: by.uid, name: String(by.name ?? '') } : null,
    copyOf: typeof data.copyOf === 'string' ? data.copyOf : null,
  }
}

/* ---------- Live reads ---------- */

const byNextDate = (a: Plan, b: Plan) =>
  (a.nextDate ?? '9999') < (b.nextDate ?? '9999') ? -1 : a.nextDate === b.nextDate ? 0 : 1

/**
 * The user's own plans. As with lists, the query only asks for what the rules allow
 * (ownerUid == uid). Index: ownerUid ASC + nextDate ASC (firestore.indexes.json).
 */
export function watchMyPlans(
  uid: string,
  onData: (plans: Plan[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(plansCol, where('ownerUid', '==', uid), orderBy('nextDate'))
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toPlan(d.id, d.data(ESTIMATE))).toSorted(byNextDate)),
    onError,
  )
}

/** Plans shared with this (verified) email. Index: memberEmails CONTAINS + nextDate ASC. */
export function watchSharedPlans(
  email: string,
  onData: (plans: Plan[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(plansCol, where('memberEmails', 'array-contains', email), orderBy('nextDate'))
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toPlan(d.id, d.data(ESTIMATE))).toSorted(byNextDate)),
    onError,
  )
}

/** One plan; `null` when it doesn't exist. */
export function watchPlan(
  id: string,
  onData: (plan: Plan | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    planRef(id),
    (snap) => onData(snap.exists() ? toPlan(snap.id, snap.data(ESTIMATE)) : null),
    onError,
  )
}

export interface DayRange {
  from: string
  to: string
}

/**
 * Sessions of one plan, all of them or only the days in `range` (the visible month).
 * "YYYY-MM-DD" strings compare like dates, so a range is two where() on one field and
 * needs only the automatic single-field index.
 */
export function watchSessions(
  planId: string,
  range: DayRange | null,
  onData: (sessions: PlanSession[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = range
    ? query(
        sessionsCol(planId),
        where('date', '>=', range.from),
        where('date', '<=', range.to),
        orderBy('date'),
      )
    : query(sessionsCol(planId), orderBy('date'))
  return onSnapshot(
    q,
    (snap) =>
      onData(snap.docs.map((d) => toSession(planId, d.id, d.data(ESTIMATE))).toSorted(bySchedule)),
    onError,
  )
}

async function loadSessions(planId: string): Promise<PlanSession[]> {
  const snap = await getDocs(sessionsCol(planId))
  return snap.docs.map((d) => toSession(planId, d.id, d.data())).toSorted(bySchedule)
}

/* ---------- What a plan is made of (TMDB) ---------- */

export interface SeriesSource {
  media: LibraryMedia
  units: PlanUnit[]
}

/**
 * Every aired regular episode of a series. First the series itself (season list, runtime),
 * then all seasons in batches of 20 through append_to_response, in parallel — the same
 * trick as the heatmap. One shared signal cancels them all.
 */
export async function loadSeriesEpisodes(
  seriesId: number,
  signal?: AbortSignal,
): Promise<SeriesSource> {
  const series = await tmdbGet<SeriesBase>(endpoints.seriesSummary(seriesId), { signal })
  const numbers = series.seasons
    .filter((s) => s.season_number > 0 && s.episode_count > 0)
    .map((s) => s.season_number)
  const batches: number[][] = []
  for (let i = 0; i < numbers.length; i += MAX_APPEND)
    batches.push(numbers.slice(i, i + MAX_APPEND))

  const responses = await Promise.all(
    batches.map((batch) =>
      tmdbGet<SeasonsBatchResponse>(endpoints.seasonsBatch(seriesId, batch), { signal }),
    ),
  )
  const seasons = numbers.flatMap((n) => {
    const season = responses.find((r) => r[`season/${n}`])?.[`season/${n}`]
    return season ? [season] : []
  })
  const media = seriesToLibraryMedia(series)
  return {
    media,
    units: episodesToUnits(seriesId, seasons, series.seasons, media.runtime, localToday()),
  }
}

export interface ListSource {
  /** The list's name and first cover, for the plan title and the preview. */
  name: string
  posterPath: string | null
  units: PlanUnit[]
  /** Series in the list: a marathon plan is for movies only. */
  skipped: number
}

/** The movies of a list in list order, each with its runtime from /movie/{id}. */
export async function loadListMovies(listId: string, signal?: AbortSignal): Promise<ListSource> {
  // The list first: a missing or unreadable list fails here with one clear error.
  const list = (await getDoc(doc(db, 'lists', listId))).data()
  if (!list) throw new PlanError('This list doesn’t exist or isn’t shared with you.')
  const items = await getDocs(query(collection(db, 'lists', listId, 'items'), orderBy('position')))
  const keys = items.docs.map((d) => parseMediaKey(d.id)).filter((k) => k !== null)
  const movieIds = keys.filter((k) => k.mediaType === 'movie').map((k) => k.id)
  const movies = await Promise.all(
    movieIds.map((id) => tmdbGet<MovieBase>(endpoints.movieSummary(id), { signal })),
  )
  const covers = strings(list.covers)
  return {
    name: String(list.name ?? ''),
    posterPath: covers[0] ?? movies[0]?.poster_path ?? null,
    units: movies.map((movie) => movieToUnit(movieToLibraryMedia(movie))),
    skipped: keys.length - movieIds.length,
  }
}

/* ---------- Library and activity inside a batch ---------- */

interface EntryState {
  ref: DocumentReference
  exists: boolean
  status: LibraryStatus | null
  watched: number
}

async function readEntry(uid: string, key: string): Promise<EntryState> {
  const ref = entryRef(uid, key)
  const snap = await getDoc(ref)
  const data = snap.data()
  const progress = data?.progress as Partial<SeriesProgress> | null | undefined
  return {
    ref,
    exists: snap.exists(),
    status: (data?.status as LibraryStatus | undefined) ?? null,
    watched: typeof progress?.watchedEpisodes === 'number' ? progress.watchedEpisodes : 0,
  }
}

/**
 * Puts a title's library entry into the batch: a full new entry, or only the changed
 * fields of an existing one (score and notes are the user's and stay untouched).
 */
function writeEntry(
  batch: WriteBatch,
  entry: EntryState,
  media: LibraryMedia,
  status: LibraryStatus,
  progress: SeriesProgress | null,
) {
  const now = serverTimestamp()
  const completedAt = status === 'completed' ? now : null
  if (!entry.exists) {
    batch.set(entry.ref, {
      ...media,
      status,
      score: null,
      notes: '',
      progress,
      addedAt: now,
      updatedAt: now,
      completedAt,
    })
    return
  }
  batch.update(entry.ref, {
    status,
    ...(progress && { progress }),
    ...(status !== entry.status && { completedAt }),
    updatedAt: now,
  })
}

function addActivity(
  batch: WriteBatch,
  uid: string,
  type: string,
  fields: { title: string; refId: string; mediaKey?: string; meta?: Record<string, unknown> },
) {
  batch.set(doc(activityCol(uid)), { type, ...fields, createdAt: serverTimestamp() })
}

/** Commits `writes` in batches of BATCH_LIMIT, in order, one batch at a time. */
async function commitInChunks(writes: ((batch: WriteBatch) => void)[]): Promise<void> {
  for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db)
    for (const write of writes.slice(i, i + BATCH_LIMIT)) write(batch)
    // Sequential on purpose: the first batch creates the plan the later ones belong to.
    await batch.commit()
  }
}

/* ---------- Business operations ---------- */

const sessionDoc = (s: Pick<PlanSession, 'index' | 'date' | 'time' | 'units' | 'minutes'>) => ({
  index: s.index,
  date: s.date,
  time: s.time,
  units: s.units,
  minutes: s.minutes,
  status: 'pending',
  doneAt: null,
  doneBy: null,
  copyOf: null,
})

/**
 * Creates a plan with all its sessions and resolves to its id once the server has it.
 * The first batch holds the plan, the library entries and the activity record plus the
 * first sessions, so a plan never exists without its library change. Very long plans
 * (more than ~400 sessions) continue in further batches.
 */
export async function createPlan(
  owner: PlanPerson,
  draft: PlanDraft,
  color: Plan['color'],
): Promise<string> {
  const sessions = buildSchedule(draft.units, draft.options)
  const last = sessions.at(-1)
  if (!last) throw new PlanError('There’s nothing to schedule with these settings.')

  const ref = doc(plansCol)
  const now = serverTimestamp()
  const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0)
  const writes: ((batch: WriteBatch) => void)[] = []

  writes.push((b) =>
    b.set(ref, {
      ownerUid: owner.uid,
      ownerName: owner.name,
      title: draft.title,
      kind: draft.kind,
      media: draft.media,
      sourceListId: draft.sourceListId,
      options: draft.options,
      color,
      totalUnits: draft.units.length,
      doneUnits: 0,
      totalMinutes,
      nextDate: sessions[0]?.date ?? null,
      endDate: last.date,
      status: 'active',
      visibility: 'private',
      roles: {},
      memberEmails: [],
      createdAt: now,
      updatedAt: now,
    }),
  )

  // Library: the series becomes "watching"; movies of a marathon are added as "plan to
  // watch" when they aren't in the library yet (a movie isn't "watching" until its night).
  if (draft.kind === 'series' && draft.media) {
    const media = draft.media
    const entry = await readEntry(owner.uid, mediaKey(media.mediaType, media.tmdbId))
    writes.push((b) => writeEntry(b, entry, media, 'watching', null))
  } else {
    const movies = draft.units.flatMap((u) => (u.media ? [u.media] : []))
    const entries = await Promise.all(
      movies.map((m) => readEntry(owner.uid, mediaKey(m.mediaType, m.tmdbId))),
    )
    movies.forEach((media, i) => {
      const entry = entries[i]
      if (entry && !entry.exists) writes.push((b) => writeEntry(b, entry, media, 'plan', null))
    })
  }

  writes.push((b) =>
    addActivity(b, owner.uid, 'plan.create', {
      title: draft.title,
      refId: ref.id,
      ...(draft.media && { mediaKey: mediaKey(draft.media.mediaType, draft.media.tmdbId) }),
      meta: { sessions: sessions.length },
    }),
  )
  for (const s of sessions) writes.push((b) => b.set(doc(sessionsCol(ref.id)), sessionDoc(s)))

  await commitInChunks(writes)
  return ref.id
}

/** The plan's counters as they follow from its sessions (after a change). */
function planTotals(plan: Plan, sessions: PlanSession[]) {
  const doneUnits = sessions
    .filter((s) => s.status === 'done')
    .reduce((sum, s) => sum + s.units.length, 0)
  const { nextDate, endDate } = planDates(sessions)
  return {
    doneUnits: Math.min(doneUnits, plan.totalUnits),
    nextDate,
    endDate: endDate || plan.endDate,
    status: doneUnits >= plan.totalUnits ? 'done' : 'active',
    updatedAt: serverTimestamp(),
  }
}

const replace = (sessions: PlanSession[], changed: PlanSession) =>
  sessions.map((s) => (s.id === changed.id ? changed : s))

/**
 * "Mark watched". One batch: the session (done, by whom), the plan counters, the library
 * of the person who marked it, and their activity. In a shared plan everybody has their
 * own library: an editor's mark moves the editor's progress, never the owner's.
 */
export async function completeSession(
  plan: Plan,
  session: PlanSession,
  by: PlanPerson,
): Promise<void> {
  const sessions = replace(await loadSessions(plan.id), { ...session, status: 'done' })
  const totals = planTotals(plan, sessions)
  const finished = totals.status === 'done'
  const batch = writeBatch(db)

  batch.update(sessionRef(plan.id, session.id), {
    status: 'done',
    doneAt: serverTimestamp(),
    doneBy: { uid: by.uid, name: by.name },
  })
  batch.update(planRef(plan.id), totals)

  if (plan.kind === 'series' && plan.media) {
    const entry = await readEntry(by.uid, mediaKey('tv', plan.media.tmdbId))
    const last = session.units.at(-1)
    // Progress only moves forward: marking an older session doesn't undo newer progress.
    const progress =
      last && last.season !== null && last.episode !== null && (last.ordinal ?? 0) > entry.watched
        ? { season: last.season, episode: last.episode, watchedEpisodes: last.ordinal ?? 0 }
        : null
    const status: LibraryStatus = finished ? 'completed' : 'watching'
    writeEntry(batch, entry, plan.media, status, progress)
  } else {
    for (const unit of session.units) {
      if (!unit.media) continue
      const entry = await readEntry(by.uid, unit.mediaKey)
      writeEntry(batch, entry, unit.media, 'completed', null)
    }
  }

  addActivity(batch, by.uid, 'session.done', {
    title: plan.title,
    refId: plan.id,
    ...(plan.media && { mediaKey: mediaKey('tv', plan.media.tmdbId) }),
    meta: { units: unitsLabel(session.units) },
  })
  if (finished) addActivity(batch, by.uid, 'plan.done', { title: plan.title, refId: plan.id })
  await batch.commit()
}

/**
 * Skip: the session stays in the history as skipped, and a copy with the same episodes is
 * added after the last session, on the plan's next weekday — nothing is lost.
 */
export async function skipSession(plan: Plan, session: PlanSession, by: PlanPerson) {
  const all = await loadSessions(plan.id)
  const lastDate = all.reduce((max, s) => (s.date > max ? s.date : max), session.date)
  const copy = {
    ...sessionDoc({
      index: all.reduce((max, s) => Math.max(max, s.index), 0) + 1,
      date: nextSlot(lastDate, plan.options.weekdays),
      time: plan.options.time,
      units: session.units,
      minutes: session.minutes,
    }),
    copyOf: session.id,
  }
  const copyRef = doc(sessionsCol(plan.id))
  const sessions = [
    ...replace(all, { ...session, status: 'skipped' }),
    { ...session, ...copy, id: copyRef.id, status: 'pending' as const },
  ]
  const batch = writeBatch(db)
  batch.update(sessionRef(plan.id, session.id), {
    status: 'skipped',
    doneAt: serverTimestamp(),
    doneBy: { uid: by.uid, name: by.name },
  })
  batch.set(copyRef, copy)
  batch.update(planRef(plan.id), planTotals(plan, sessions))
  await batch.commit()
}

/**
 * Undo of "watched" or "skipped": the session is pending again. For a skip, the copy at
 * the end goes away too (if it is still pending). Library progress isn't rolled back: it
 * records the furthest episode, and the user can fix it on the library page.
 */
export async function undoSession(plan: Plan, session: PlanSession) {
  const all = await loadSessions(plan.id)
  const copy =
    session.status === 'skipped'
      ? all.find((s) => s.copyOf === session.id && s.status === 'pending')
      : undefined
  const sessions = replace(all, { ...session, status: 'pending' }).filter((s) => s.id !== copy?.id)
  const batch = writeBatch(db)
  batch.update(sessionRef(plan.id, session.id), { status: 'pending', doneAt: null, doneBy: null })
  if (copy) batch.delete(sessionRef(plan.id, copy.id))
  batch.update(planRef(plan.id), planTotals(plan, sessions))
  await batch.commit()
}

/** Moves a session (and, with `shiftLater`, every later pending one by the same days). */
export async function rescheduleSession(
  plan: Plan,
  session: PlanSession,
  date: string,
  shiftLater: boolean,
) {
  const all = await loadSessions(plan.id)
  const changes = shiftSessions(all, session.id, date, shiftLater)
  if (changes.length === 0) return
  const moved = new Map(changes.map((c) => [c.id, c.date]))
  const sessions = all.map((s) => ({ ...s, date: moved.get(s.id) ?? s.date }))
  const totals = planTotals(plan, sessions)

  const writes: ((batch: WriteBatch) => void)[] = changes.map(
    (c) => (b) => b.update(sessionRef(plan.id, c.id), { date: c.date }),
  )
  writes.push((b) => b.update(planRef(plan.id), totals))
  await commitInChunks(writes)
}

/**
 * Deletes a plan with its sessions (sub-collections aren't deleted with the parent). The
 * plan goes in the last batch: session rules read it, so it must outlive them.
 * Library entries stay — they are the user's history, not part of the plan.
 */
export async function deletePlan(id: string): Promise<void> {
  const snap = await getDocs(sessionsCol(id))
  const writes: ((batch: WriteBatch) => void)[] = snap.docs.map((d) => (b) => b.delete(d.ref))
  writes.push((b) => b.delete(planRef(id)))
  await commitInChunks(writes)
}
