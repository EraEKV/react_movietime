import { bearer, json, readDoc, readEnv, verifyToken, type Field } from './firebase.js'
import type { SuggestionPushKind } from './pushText.js'

// The push for a film suggestion in a movie marathon (POST /api/push-notify with kind
// 'proposal' or 'answer'). As with the member mails, nothing is trusted from the request but
// the caller's ID token: the plan and the suggestion are read back with it (Firestore rules
// apply, so only the owner and members get through), and a push goes out only when the
// stored suggestion says the caller really is its author (proposal) or the owner (answer),
// and only shortly after it was written, so it can't be replayed to pester someone.

const PLAN_ID = /^[A-Za-z0-9_-]{1,64}$/
const PROPOSAL_ID = /^[A-Za-z0-9_-]{1,128}$/
/** A push is for something that just happened. */
export const FRESH_MS = 2 * 60 * 1000

export interface SuggestionPush {
  /** Whose browsers get it. */
  uid: string
  kind: SuggestionPushKind
  from: string
  film: string
  plan: string
  path: string
  tag: string
}

const text = (field: Field | undefined) => field?.stringValue ?? ''
const at = (field: Field | undefined) => Date.parse(field?.timestampValue ?? '')

/** The pure part: who is told what, or null when the stored suggestion doesn't back the call. */
export function suggestionPush(
  asked: 'proposal' | 'answer',
  callerUid: string,
  planId: string,
  proposalId: string,
  plan: Record<string, Field>,
  offer: Record<string, Field>,
  now: number,
): SuggestionPush | null {
  if (text(plan.kind) !== 'list') return null
  const ownerUid = text(plan.ownerUid)
  const author = offer.by?.mapValue?.fields
  const authorUid = text(author?.uid)
  const status = text(offer.status)
  const film = text(offer.unit?.mapValue?.fields?.title)
  if (!ownerUid || !authorUid || !film) return null
  const base = {
    film,
    plan: text(plan.title),
    path: `/planner/${planId}`,
    tag: `offer:${proposalId}`,
  }

  if (asked === 'proposal') {
    if (callerUid !== authorUid || status !== 'pending' || authorUid === ownerUid) return null
    if (!(now - at(offer.createdAt) <= FRESH_MS)) return null
    return { ...base, uid: ownerUid, kind: 'proposal', from: text(author?.name) }
  }
  if (callerUid !== ownerUid || authorUid === ownerUid) return null
  if (status !== 'accepted' && status !== 'rejected') return null
  if (!(now - at(offer.decidedAt) <= FRESH_MS)) return null
  return { ...base, uid: authorUid, kind: status, from: text(plan.ownerName) }
}

/** The IO part: checks the request and the stored documents, or answers with an error. */
export async function resolveSuggestion(
  request: Request,
  asked: 'proposal' | 'answer',
  input: { id?: unknown; proposalId?: unknown },
): Promise<SuggestionPush | Response> {
  const env = readEnv()
  if (!env) return json({ error: 'not-configured' }, 503)
  const idToken = bearer(request)
  if (!idToken) return json({ error: 'unauthenticated' }, 401)
  const { id, proposalId } = input
  if (
    typeof id !== 'string' ||
    typeof proposalId !== 'string' ||
    !PLAN_ID.test(id) ||
    !PROPOSAL_ID.test(proposalId)
  ) {
    return json({ error: 'bad-request' }, 400)
  }
  const caller = await verifyToken(env, idToken)
  if (!caller) return json({ error: 'unauthenticated' }, 401)

  const [plan, offer] = await Promise.all([
    readDoc(env, idToken, `plans/${id}`),
    readDoc(env, idToken, `plans/${id}/proposals/${proposalId}`),
  ])
  if (!plan || !offer) return json({ error: 'forbidden' }, 403)
  const push = suggestionPush(
    asked,
    caller.uid,
    id,
    proposalId,
    plan.fields,
    offer.fields,
    Date.now(),
  )
  return push ?? json({ error: 'forbidden' }, 403)
}
