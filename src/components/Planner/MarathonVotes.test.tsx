import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PlanSession, SessionLike, SessionProposal } from '../../types/plan'
import MarathonVotes from './MarathonVotes'
import ProposalsPanel from './ProposalsPanel'

const unit = (id: number, title: string) => ({
  mediaKey: `movie_${id}` as const,
  title,
  season: null,
  episode: null,
  ordinal: null,
  runtime: 100,
  media: null,
})
const session: PlanSession = {
  id: 's1',
  planId: 'p',
  index: 0,
  date: '2027-01-05',
  time: '21:00',
  units: [unit(1, 'Batman Begins')],
  minutes: 100,
  status: 'pending',
  doneAt: null,
  doneBy: null,
  copyOf: null,
}
const like = (uid: string, name: string): SessionLike => ({
  id: `s1_${uid}`,
  sessionId: 's1',
  uid,
  name,
  mediaKey: 'movie_1',
})
const proposal = (status: SessionProposal['status'] = 'pending'): SessionProposal => ({
  id: 's1_vi',
  sessionId: 's1',
  by: { uid: 'vi', name: 'Vera' },
  unit: unit(2, 'Inception'),
  replaces: 'movie_1',
  status,
})

const base = {
  session,
  likes: [],
  ownUid: 'me',
  ownerName: 'Olga',
  canLike: true,
  canSuggest: true,
  mine: null,
  onLike: vi.fn().mockResolvedValue(undefined),
  onSuggest: vi.fn(),
  onWithdraw: vi.fn().mockResolvedValue(undefined),
}

describe('MarathonVotes', () => {
  it('likes the film, and takes the like back when it is already mine', async () => {
    const onLike = vi.fn().mockResolvedValue(undefined)
    const { rerender } = render(<MarathonVotes {...base} onLike={onLike} />)
    await userEvent.click(screen.getByRole('button', { name: 'Like Batman Begins' }))
    expect(onLike).toHaveBeenLastCalledWith(true)

    rerender(<MarathonVotes {...base} onLike={onLike} likes={[like('me', 'Me')]} />)
    const button = screen.getByRole('button', { name: 'Take back your like from Batman Begins' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(button)
    expect(onLike).toHaveBeenLastCalledWith(false)
  })

  it('shows the count and who liked, "You" first and the rest folded', () => {
    const likes = [like('a', 'Ann'), like('me', 'Me'), like('b', 'Bob'), like('c', 'Cid')]
    render(<MarathonVotes {...base} likes={likes} />)
    expect(screen.getByRole('button', { name: /Batman Begins/ })).toHaveTextContent('4')
    expect(screen.getByText('You, Ann +2')).toBeInTheDocument()
  })

  it('is read-only for people who cannot vote', () => {
    render(
      <MarathonVotes {...base} canLike={false} canSuggest={false} likes={[like('a', 'Ann')]} />,
    )
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByRole('img', { name: '1 like' })).toBeInTheDocument()
  })

  it('renders nothing for a visitor when nobody liked', () => {
    const { container } = render(<MarathonVotes {...base} canLike={false} canSuggest={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('offers a suggestion, and swaps the button for the state of mine', async () => {
    const onSuggest = vi.fn()
    const { rerender } = render(<MarathonVotes {...base} onSuggest={onSuggest} />)
    await userEvent.click(screen.getByRole('button', { name: 'Suggest another film' }))
    expect(onSuggest).toHaveBeenCalled()

    const onWithdraw = vi.fn().mockResolvedValue(undefined)
    rerender(<MarathonVotes {...base} mine={proposal()} onWithdraw={onWithdraw} />)
    expect(screen.queryByRole('button', { name: 'Suggest another film' })).toBeNull()
    expect(screen.getByText('You suggested Inception. Olga decides.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Withdraw' }))
    expect(onWithdraw).toHaveBeenCalled()

    rerender(<MarathonVotes {...base} mine={proposal('rejected')} onWithdraw={onWithdraw} />)
    expect(screen.getByText('Olga declined Inception.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument()
  })
})

describe('ProposalsPanel', () => {
  it('names the suggestion and the evening, and answers it', async () => {
    const onDecide = vi.fn().mockResolvedValue(undefined)
    render(<ProposalsPanel offers={[{ proposal: proposal(), session }]} onDecide={onDecide} />)
    expect(screen.getByText('Vera suggests Inception')).toBeInTheDocument()
    expect(screen.getByText(/Instead of Batman Begins/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Accept Inception' }))
    expect(onDecide).toHaveBeenLastCalledWith(proposal(), session, true)
    await userEvent.click(screen.getByRole('button', { name: 'Decline Inception' }))
    expect(onDecide).toHaveBeenLastCalledWith(proposal(), session, false)
  })
})
