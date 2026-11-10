import type { PlanSession, SessionLike, SessionProposal } from '../types/plan'

// 👍 and film suggestions of a shared marathon. Both remember the film they were made for
// (`mediaKey` / `replaces`), so after a reorder or an accepted swap they quietly stop
// counting for the session that holds another film now.

const filmOf = (session: PlanSession) => session.units[0]?.mediaKey

/** The likes that still belong to the film the session holds. */
export function likesOf(session: PlanSession, likes: SessionLike[]): SessionLike[] {
  const key = filmOf(session)
  return likes.filter((l) => l.sessionId === session.id && l.mediaKey === key)
}

/** Suggestions for this session that are still about its current film. */
export function proposalsFor(
  session: PlanSession,
  proposals: SessionProposal[],
): SessionProposal[] {
  const key = filmOf(session)
  return proposals.filter((p) => p.sessionId === session.id && p.replaces === key)
}

/** The ones the owner still has to answer, across the whole marathon, soonest evening first. */
export function openProposals(
  sessions: PlanSession[],
  proposals: SessionProposal[],
): { proposal: SessionProposal; session: PlanSession }[] {
  return sessions
    .filter((s) => s.status === 'pending')
    .flatMap((session) =>
      proposalsFor(session, proposals)
        .filter((p) => p.status === 'pending')
        .map((proposal) => ({ proposal, session })),
    )
}

/** My own suggestion for a session (any status), if it is still about the current film. */
export function myProposal(
  session: PlanSession,
  proposals: SessionProposal[],
  uid: string | null,
): SessionProposal | null {
  return proposalsFor(session, proposals).find((p) => p.by.uid === uid) ?? null
}
