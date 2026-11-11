import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PlanSession, SessionStatus } from '../../types/plan'
import SessionRow from './SessionRow'

const session = (status: SessionStatus, mediaKey = 'movie_603'): PlanSession =>
  ({
    id: 's1',
    planId: 'p1',
    date: '2026-11-20',
    time: '20:00',
    minutes: 136,
    status,
    doneAt: null,
    doneBy: null,
    copyOf: null,
    units: [
      {
        mediaKey,
        title: 'The Matrix',
        season: null,
        episode: null,
        ordinal: null,
        runtime: 136,
        media: null,
      },
    ],
  }) as unknown as PlanSession

const row = (s: PlanSession, watchHere?: boolean) => (
  <ol>
    <SessionRow
      session={s}
      today="2026-11-11"
      editable
      canUndo={false}
      ownUid={null}
      onComplete={async () => {}}
      onSkip={async () => {}}
      onUndo={async () => {}}
      onReschedule={() => {}}
      watchHere={watchHere}
    />
  </ol>
)

describe('SessionRow: where to watch', () => {
  it('offers it on a pending film', () => {
    render(row(session('pending'), true))
    expect(screen.getByRole('button', { name: /where to watch/i })).toBeInTheDocument()
  })

  it.each([
    ['a watched film', session('done'), true],
    ['a skipped film', session('skipped'), true],
    ['a series (shown once at the top of the plan)', session('pending', 'tv_1399'), false],
  ])('does not offer it on %s', (_, s, watchHere) => {
    render(row(s, watchHere))
    expect(screen.queryByRole('button', { name: /where to watch/i })).toBeNull()
  })
})
