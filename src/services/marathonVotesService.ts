import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
  type WriteBatch,
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
import { addSuggestionNotice } from './notificationsService'
import { planRef, sessionRef, toUnit } from './plannerService'

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
): Promise<string | null> {
  const current = session.units[0]
  if (!current || session.status !== 'pending') return null
  const batch = writeBatch(db)
  const proposalId = `${session.id}_${by.uid}`
  batch.set(proposalRef(plan.id, proposalId), {
    sessionId: session.id,
    by: { uid: by.uid, name: by.name },
    unit,
    replaces: current.mediaKey,
    status: 'pending',
    createdAt: serverTimestamp(),
    decidedAt: null,
  })
  // The owner hears about it (in the bell, and by push from the caller) in the same batch.
  if (plan.ownerUid !== by.uid) {
    addSuggestionNotice(batch, {
      toUid: plan.ownerUid,
      type: 'proposal',
      planId: plan.id,
      proposalId,
      planTitle: plan.title,
      film: unit.title,
      fromUid: by.uid,
      fromName: by.name,
    })
  }
  await batch.commit()
  return proposalId
}

export async function withdrawProposal(plan: Plan, proposalId: string): Promise<void> {
  const batch = writeBatch(db)
  batch.delete(proposalRef(plan.id, proposalId))
  await batch.commit()
}

/**
 * The session's film becomes `unit`: the session, the plan's total minutes and the old
 * film's likes in one go (likes belong to the film they were given to).
 */
function swapFilm(
  batch: WriteBatch,
  plan: Plan,
  session: PlanSession,
  unit: PlanUnit,
  likes: SessionLike[],
) {
  batch.update(sessionRef(plan.id, session.id), { units: [unit], minutes: unit.runtime })
  batch.update(planRef(plan.id), {
    totalMinutes: Math.max(0, plan.totalMinutes - session.minutes + unit.runtime),
    updatedAt: serverTimestamp(),
  })
  for (const like of likes) {
    if (like.sessionId === session.id) {
      batch.delete(likeRef(plan.id, like.sessionId, like.uid))
    }
  }
}

/**
 * The owner's answer. Accepting swaps the film of the session in the same batch (and the
 * plan's total minutes), drops the likes the old film had, and turns down the other open
 * suggestions for that session.
 */
export async function decideProposal(
  plan: Plan,
  proposal: SessionProposal,
  session: PlanSession | undefined,
  siblings: SessionProposal[],
  likes: SessionLike[],
  accept: boolean,
  by: PlanPerson,
): Promise<'accepted' | 'rejected'> {
  const batch = writeBatch(db)
  const decided = { decidedAt: serverTimestamp() }
  const current = session?.units[0]
  const stale = !session || session.status !== 'pending' || current?.mediaKey !== proposal.replaces
  // Declined, or the session moved on: nothing to swap, the suggestion is simply closed.
  const decision = accept && !stale ? 'accepted' : 'rejected'
  if (decision === 'accepted' && session) {
    swapFilm(batch, plan, session, proposal.unit, likes)
    for (const other of siblings) {
      if (
        other.id !== proposal.id &&
        other.sessionId === session.id &&
        other.status === 'pending'
      ) {
        batch.update(proposalRef(plan.id, other.id), { status: 'rejected', ...decided })
      }
    }
  }
  batch.update(proposalRef(plan.id, proposal.id), { status: decision, ...decided })
  // The author hears the answer in the same batch.
  if (proposal.by.uid !== by.uid) {
    addSuggestionNotice(batch, {
      toUid: proposal.by.uid,
      type: 'answer',
      planId: plan.id,
      proposalId: proposal.id,
      planTitle: plan.title,
      film: proposal.unit.title,
      decision,
      fromUid: by.uid,
      fromName: by.name,
    })
  }
  await batch.commit()
  return decision
}

/**
 * The owner changes the film of a pending evening directly, no confirmation: the same swap
 * as an accepted suggestion, and every open suggestion for that evening is closed.
 */
export async function replaceFilm(
  plan: Plan,
  session: PlanSession,
  unit: PlanUnit,
  proposals: SessionProposal[],
  likes: SessionLike[],
): Promise<void> {
  if (plan.kind !== 'list' || session.status !== 'pending') return
  const batch = writeBatch(db)
  swapFilm(batch, plan, session, unit, likes)
  for (const open of proposals) {
    if (open.sessionId === session.id && open.status === 'pending') {
      batch.update(proposalRef(plan.id, open.id), {
        status: 'rejected',
        decidedAt: serverTimestamp(),
      })
    }
  }
  await batch.commit()
}
