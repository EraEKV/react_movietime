import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore'
import { endpoints, tmdbGet } from '../shared/api/tmdb'
import type {
  Plan,
  PlanPerson,
  PlanSession,
  PlanUnit,
  SessionLike,
  SessionProposal,
} from '../types/plan'
import type { MovieBase } from '../types/tmdb'
import { parseMediaKey } from '../utils/media'
import { movieToLibraryMedia } from '../utils/library'
import { movieToUnit } from '../utils/planner'
import { db } from './firestore'
import { sessionRef, toUnit } from './plannerService'

// plans/{planId}/likes/{sessionId}_{uid} and plans/{planId}/proposals/{sessionId}_{uid}
// (docs/DATA_MODEL.md, "Shared marathon"). The id holds the person, so one person has at most
// one like and one open suggestion per session, and the rules can check the id.

const likesCol = (planId: string) => collection(db, 'plans', planId, 'likes')
const proposalsCol = (planId: string) => collection(db, 'plans', planId, 'proposals')
const likeRef = (planId: string, sessionId: string, uid: string) =>
  doc(db, 'plans', planId, 'likes', `${sessionId}_${uid}`)
const proposalRef = (planId: string, id: string) => doc(db, 'plans', planId, 'proposals', id)

const isKey = (value: unknown): value is string =>
  typeof value === 'string' && parseMediaKey(value) !== null

function toLike(id: string, data: DocumentData): SessionLike | null {
  if (typeof data.sessionId !== 'string' || typeof data.uid !== 'string' || !isKey(data.mediaKey)) {
    return null
  }
  return {
    id,
    sessionId: data.sessionId,
    uid: data.uid,
    name: String(data.name ?? ''),
    mediaKey: data.mediaKey as SessionLike['mediaKey'],
  }
}

function toProposal(id: string, data: DocumentData): SessionProposal | null {
  const by = data.by as Record<string, unknown> | null | undefined
  const unit = toUnit(data.unit)
  if (
    typeof data.sessionId !== 'string' ||
    !by ||
    typeof by.uid !== 'string' ||
    !unit ||
    !isKey(data.replaces)
  ) {
    return null
  }
  const status = data.status === 'accepted' || data.status === 'rejected' ? data.status : 'pending'
  return {
    id,
    sessionId: data.sessionId,
    by: { uid: by.uid, name: String(by.name ?? '') },
    unit,
    replaces: data.replaces as SessionProposal['replaces'],
    status,
  }
}

export function watchLikes(
  planId: string,
  onData: (likes: SessionLike[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    likesCol(planId),
    (snap) => onData(snap.docs.map((d) => toLike(d.id, d.data())).filter((l) => l !== null)),
    onError,
  )
}

export function watchProposals(
  planId: string,
  onData: (proposals: SessionProposal[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    proposalsCol(planId),
    (snap) => onData(snap.docs.map((d) => toProposal(d.id, d.data())).filter((p) => p !== null)),
    onError,
  )
}

/** Puts or takes back my 👍 on the film a session holds now. */
export async function setLike(
  plan: Plan,
  session: PlanSession,
  by: PlanPerson,
  on: boolean,
): Promise<void> {
  const unit = session.units[0]
  if (!unit) return
  const ref = likeRef(plan.id, session.id, by.uid)
  const batch = writeBatch(db)
  if (on) {
    batch.set(ref, {
      sessionId: session.id,
      uid: by.uid,
      name: by.name,
      mediaKey: unit.mediaKey,
      createdAt: serverTimestamp(),
    })
  } else {
    batch.delete(ref)
  }
  await batch.commit()
}

/** The movie behind a search result, with its runtime, as a plan unit. */
export async function loadFilmUnit(tmdbId: number, signal?: AbortSignal): Promise<PlanUnit> {
  const movie = await tmdbGet<MovieBase>(endpoints.movieSummary(tmdbId), { signal })
  return movieToUnit(movieToLibraryMedia(movie))
}

/** My suggestion for a session; a new one replaces my earlier one for the same session. */
export async function suggestFilm(
  plan: Plan,
  session: PlanSession,
  by: PlanPerson,
  unit: PlanUnit,
): Promise<void> {
  const current = session.units[0]
  if (!current || session.status !== 'pending') return
  const batch = writeBatch(db)
  batch.set(proposalRef(plan.id, `${session.id}_${by.uid}`), {
    sessionId: session.id,
    by: { uid: by.uid, name: by.name },
    unit,
    replaces: current.mediaKey,
    status: 'pending',
    createdAt: serverTimestamp(),
    decidedAt: null,
  })
  await batch.commit()
}

export async function withdrawProposal(plan: Plan, proposalId: string): Promise<void> {
  const batch = writeBatch(db)
  batch.delete(proposalRef(plan.id, proposalId))
  await batch.commit()
}

/**
 * The owner's answer. Accepting swaps the film of the session in the same batch, drops the
 * likes the old film had, and turns down the other open suggestions for that session.
 */
export async function decideProposal(
  plan: Plan,
  proposal: SessionProposal,
  session: PlanSession | undefined,
  siblings: SessionProposal[],
  likes: SessionLike[],
  accept: boolean,
): Promise<void> {
  const batch = writeBatch(db)
  const decided = { decidedAt: serverTimestamp() }
  if (!accept) {
    batch.update(proposalRef(plan.id, proposal.id), { status: 'rejected', ...decided })
    return batch.commit()
  }
  const current = session?.units[0]
  const stale = !session || session.status !== 'pending' || current?.mediaKey !== proposal.replaces
  if (stale) {
    // The session moved on: nothing to swap, the suggestion is simply closed.
    batch.update(proposalRef(plan.id, proposal.id), { status: 'rejected', ...decided })
    return batch.commit()
  }
  batch.update(sessionRef(plan.id, session.id), {
    units: [proposal.unit],
    minutes: proposal.unit.runtime,
  })
  batch.update(proposalRef(plan.id, proposal.id), { status: 'accepted', ...decided })
  for (const other of siblings) {
    if (other.id !== proposal.id && other.status === 'pending') {
      batch.update(proposalRef(plan.id, other.id), { status: 'rejected', ...decided })
    }
  }
  for (const like of likes) {
    if (like.sessionId === session.id) {
      batch.delete(likeRef(plan.id, like.sessionId, like.uid))
    }
  }
  await batch.commit()
}
