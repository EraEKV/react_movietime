import type * as VotesService from '../services/marathonVotesService'
import type {
  Plan,
  PlanRole,
  PlanSession,
  PlanUnit,
  SessionLike,
  SessionProposal,
} from '../types/plan'
import { offlineMessage } from '../utils/listErrors'
import { useSubscription } from '../shared/hooks/useSubscription'
import { useListAuthor } from './useLists'

/** Loaded on first use, like the planner service: keeps Firestore out of the main chunk. */
const loadVotesService = (): Promise<typeof VotesService> =>
  import('../services/marathonVotesService')

const NONE: never[] = []

/** The push is a courtesy on top of the bell: never block or fail the action for it. */
function pushNotice(planId: string, proposalId: string, kind: 'proposal' | 'answer') {
  void import('../services/mailService')
    .then((mail) => mail.sendSuggestionPush(planId, proposalId, kind))
    .catch(() => {})
}

/** Owner, editor and viewer of a movie marathon can like and suggest. */
export const canVote = (plan: Pick<Plan, 'kind'>, role: PlanRole) =>
  plan.kind === 'list' && (role === 'owner' || role === 'editor' || role === 'viewer')

/**
 * The 👍 and film suggestions of one movie marathon, live. Link visitors only see likes
 * (suggestions are for the members). A failed listener just leaves its list empty: the
 * marathon itself must keep working without them.
 */
export function useMarathonVotes(plan: Plan | null, role: PlanRole | null) {
  const marathon = plan?.kind === 'list' && role !== null
  const members = marathon && role !== 'link'
  const likes = useSubscription<SessionLike[]>(
    marathon && plan ? `likes:${plan.id}:${role}` : null,
    async (onData, onError) =>
      (await loadVotesService()).watchLikes(plan?.id ?? '', onData, onError),
  )
  const proposals = useSubscription<SessionProposal[]>(
    members && plan ? `proposals:${plan.id}:${role}` : null,
    async (onData, onError) =>
      (await loadVotesService()).watchProposals(plan?.id ?? '', onData, onError),
  )
  return {
    likes: likes.status === 'success' ? likes.data : NONE,
    proposals: proposals.status === 'success' ? proposals.data : NONE,
  }
}

/** Voting actions bound to the signed-in user. Each rejects with the Firestore error. */
export function useVoteActions() {
  const author = useListAuthor()
  const run = async <T>(action: (service: typeof VotesService) => Promise<T>) => {
    if (!navigator.onLine) throw new Error(offlineMessage())
    return action(await loadVotesService())
  }
  const by = () => {
    if (!author) throw new Error('Sign in to take part.')
    return author
  }
  return {
    like: (plan: Plan, session: PlanSession, on: boolean) =>
      run((s) => s.setLike(plan, session, by(), on)),
    loadFilm: (tmdbId: number, signal?: AbortSignal) => run((s) => s.loadFilmUnit(tmdbId, signal)),
    suggest: async (plan: Plan, session: PlanSession, unit: PlanUnit) => {
      const proposalId = await run((s) => s.suggestFilm(plan, session, by(), unit))
      if (proposalId && plan.ownerUid !== by().uid) pushNotice(plan.id, proposalId, 'proposal')
    },
    replace: (
      plan: Plan,
      session: PlanSession,
      unit: PlanUnit,
      proposals: SessionProposal[],
      likes: SessionLike[],
    ) => run((s) => s.replaceFilm(plan, session, unit, proposals, likes)),
    withdraw: (plan: Plan, proposalId: string) => run((s) => s.withdrawProposal(plan, proposalId)),
    decide: async (
      plan: Plan,
      proposal: SessionProposal,
      session: PlanSession | undefined,
      proposals: SessionProposal[],
      likes: SessionLike[],
      accept: boolean,
    ) => {
      await run((s) => s.decideProposal(plan, proposal, session, proposals, likes, accept, by()))
      if (proposal.by.uid !== by().uid) pushNotice(plan.id, proposal.id, 'answer')
    },
  }
}
