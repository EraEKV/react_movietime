import { describe, expect, it } from 'vitest'
import type { PlanSession, PlanUnit, SessionLike, SessionProposal } from '../types/plan'
import { likesOf, myProposal, openProposals, proposalsFor } from './marathonVotes'

const unit = (id: number): PlanUnit => ({
  mediaKey: `movie:${id}`,
  title: `Film ${id}`,
  season: null,
  episode: null,
  ordinal: null,
  runtime: 100,
  media: null,
})
const session = (
  id: string,
  film: number,
  status: PlanSession['status'] = 'pending',
): PlanSession => ({
  id,
  planId: 'p',
  index: 0,
  date: '2027-01-01',
  time: '20:00',
  units: [unit(film)],
  minutes: 100,
  status,
  doneAt: null,
  doneBy: null,
  copyOf: null,
})
const like = (sessionId: string, uid: string, film: number): SessionLike => ({
  id: `${sessionId}_${uid}`,
  sessionId,
  uid,
  name: uid,
  mediaKey: `movie:${film}`,
})
const proposal = (
  sessionId: string,
  uid: string,
  replaces: number,
  status: SessionProposal['status'] = 'pending',
): SessionProposal => ({
  id: `${sessionId}_${uid}`,
  sessionId,
  by: { uid, name: uid },
  unit: unit(99),
  replaces: `movie:${replaces}`,
  status,
})

describe('likesOf', () => {
  it('counts only likes for the film the session holds now', () => {
    const likes = [like('s1', 'a', 1), like('s1', 'b', 1), like('s1', 'c', 2), like('s2', 'a', 1)]
    expect(likesOf(session('s1', 1), likes).map((l) => l.uid)).toEqual(['a', 'b'])
  })

  it('forgets the likes once another film moves into the session', () => {
    expect(likesOf(session('s1', 3), [like('s1', 'a', 1)])).toEqual([])
  })
})

describe('proposalsFor / myProposal', () => {
  const list = [proposal('s1', 'a', 1), proposal('s1', 'b', 2), proposal('s2', 'a', 1, 'rejected')]

  it('keeps the suggestions made against the current film', () => {
    expect(proposalsFor(session('s1', 1), list).map((p) => p.by.uid)).toEqual(['a'])
  })

  it('finds my suggestion with any status', () => {
    expect(myProposal(session('s2', 1), list, 'a')?.status).toBe('rejected')
    expect(myProposal(session('s2', 1), list, 'b')).toBeNull()
    expect(myProposal(session('s1', 1), list, null)).toBeNull()
  })
})

describe('openProposals', () => {
  it('lists pending suggestions of pending sessions, in session order', () => {
    const sessions = [session('s1', 1), session('s2', 2, 'done'), session('s3', 3)]
    const proposals = [
      proposal('s3', 'a', 3),
      proposal('s1', 'a', 1),
      proposal('s1', 'b', 1, 'rejected'),
      proposal('s2', 'a', 2),
      proposal('s3', 'c', 9),
    ]
    expect(openProposals(sessions, proposals).map((o) => o.proposal.id)).toEqual(['s1_a', 's3_a'])
  })
})
