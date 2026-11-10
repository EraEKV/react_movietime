import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PlanUnit } from '../../types/plan'
import { buildSchedule } from '../../utils/schedule'
import PreviewSchedule from './PreviewSchedule'

// 2026-11-09 is a Monday.
const options = {
  startDate: '2026-11-09',
  weekdays: [1, 3, 5] as never,
  time: '21:00',
  perSession: 1,
}
const TODAY = '2026-11-10'

const film = (id: number, title: string, year: string, runtime: number): PlanUnit => ({
  mediaKey: `movie_${id}`,
  title,
  season: null,
  episode: null,
  ordinal: null,
  runtime,
  media: {
    mediaType: 'movie',
    tmdbId: id,
    title,
    posterPath: null,
    year,
    genreIds: [],
    tmdbRating: null,
    runtime,
    totalEpisodes: null,
  },
})

const episode = (n: number): PlanUnit => ({
  mediaKey: 'tv_1',
  title: `Pilot ${n}`,
  season: 1,
  episode: n,
  ordinal: n,
  runtime: 45,
  media: null,
})

describe('PreviewSchedule for a marathon', () => {
  const sessions = buildSchedule(
    [film(1, 'Batman Begins', '2005', 140), film(2, 'The Dark Knight', '2008', 152)],
    options,
  )

  it('names every film in full with its date, time, year and runtime', () => {
    render(<PreviewSchedule sessions={sessions} today={TODAY} movies />)
    const rows = within(
      screen.getByRole('list', { name: 'Sessions of the plan, in order' }),
    ).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Mon, Nov 9')
    expect(rows[0]).toHaveTextContent('21:00')
    expect(rows[0]).toHaveTextContent('Batman Begins')
    expect(rows[0]).toHaveTextContent('2005 · 2h 20m')
    expect(rows[1]).toHaveTextContent('Wed, Nov 11')
    expect(rows[1]).toHaveTextContent('The Dark Knight')
  })

  it('has no "show all" button: a marathon is always shown whole', () => {
    render(<PreviewSchedule sessions={sessions} today={TODAY} movies />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('PreviewSchedule reordering a marathon', () => {
  const sessions = buildSchedule(
    [film(1, 'Batman Begins', '2005', 140), film(2, 'The Dark Knight', '2008', 152)],
    options,
  )

  it('gives every film a drag handle and explains how it works', () => {
    render(<PreviewSchedule sessions={sessions} today={TODAY} movies onMove={() => {}} />)
    expect(screen.getByRole('button', { name: 'Move Batman Begins' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move The Dark Knight' })).toBeInTheDocument()
    expect(screen.getByText(/The dates stay, the films move/)).toBeInTheDocument()
  })

  it('shows the dates of the slots, so a moved film takes the date of its new place', () => {
    render(<PreviewSchedule sessions={sessions} today={TODAY} movies onMove={() => {}} />)
    const rows = screen.getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('Mon, Nov 9')
    expect(rows[1]).toHaveTextContent('Wed, Nov 11')
  })

  it('offers to restore the order only when the caller says it was changed', async () => {
    const onReset = vi.fn()
    const { rerender } = render(
      <PreviewSchedule sessions={sessions} today={TODAY} movies onMove={() => {}} />,
    )
    expect(screen.queryByRole('button', { name: 'Restore original order' })).not.toBeInTheDocument()
    rerender(
      <PreviewSchedule
        sessions={sessions}
        today={TODAY}
        movies
        onMove={() => {}}
        onReset={onReset}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Restore original order' }))
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('has no handles without onMove, or with a single film', () => {
    const { rerender } = render(<PreviewSchedule sessions={sessions} today={TODAY} movies />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    rerender(
      <PreviewSchedule sessions={sessions.slice(0, 1)} today={TODAY} movies onMove={() => {}} />,
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('PreviewSchedule for a series', () => {
  const sessions = buildSchedule(
    Array.from({ length: 20 }, (_, i) => episode(i + 1)),
    {
      ...options,
      perSession: 2,
    },
  )

  it('groups sessions by week and shows the episode range with the names', () => {
    render(<PreviewSchedule sessions={sessions} today={TODAY} movies={false} />)
    expect(screen.getByRole('heading', { name: /^This week/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^Next week/ })).toBeInTheDocument()
    expect(screen.getByText('S1E1–E2')).toBeInTheDocument()
    expect(screen.getByText(/Pilot 1 · Pilot 2/)).toBeInTheDocument()
  })

  it('cuts a long plan after 8 sessions and shows the rest on request', async () => {
    render(<PreviewSchedule sessions={sessions} today={TODAY} movies={false} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(8)
    const toggle = screen.getByRole('button', { name: 'Show all 10 sessions' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(screen.getAllByRole('listitem')).toHaveLength(10)
    await userEvent.click(screen.getByRole('button', { name: 'Show fewer' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(8)
  })

  it('has no toggle for a short plan', () => {
    render(<PreviewSchedule sessions={sessions.slice(0, 5)} today={TODAY} movies={false} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders nothing without sessions', () => {
    const { container } = render(<PreviewSchedule sessions={[]} today={TODAY} movies={false} />)
    expect(container).toBeEmptyDOMElement()
  })
})
