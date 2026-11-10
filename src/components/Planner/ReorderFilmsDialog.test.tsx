import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PlanSession, PlanUnit } from '../../types/plan'
import ReorderFilmsDialog from './ReorderFilmsDialog'

const film = (id: number, title: string): PlanUnit => ({
  mediaKey: `movie_${id}`,
  title,
  season: null,
  episode: null,
  ordinal: null,
  runtime: 100,
  media: null,
})
const session = (id: string, date: string, unit: PlanUnit): PlanSession => ({
  id,
  planId: 'p',
  index: Number(id.slice(1)),
  date,
  time: '21:00',
  units: [unit],
  minutes: 100,
  status: 'pending',
  doneAt: null,
  doneBy: null,
  copyOf: null,
})
const sessions = [
  session('s0', '2026-11-10', film(1, 'Batman Begins')),
  session('s1', '2026-11-11', film(2, 'The Dark Knight')),
  session('s2', '2026-11-13', film(3, 'The Dark Knight Rises')),
]

describe('ReorderFilmsDialog', () => {
  it('lists the films by evening and keeps Save off until the order changes', () => {
    render(<ReorderFilmsDialog sessions={sessions} onSave={vi.fn()} onClose={() => {}} />)
    const rows = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('Batman Begins')
    expect(rows[2]).toHaveTextContent('The Dark Knight Rises')
    expect(screen.getByRole('button', { name: 'Save order' })).toBeDisabled()
  })

  it('saves the ids in the new order after a keyboard move', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<ReorderFilmsDialog sessions={sessions} onSave={onSave} onClose={() => {}} />)
    const handle = screen.getByRole('button', { name: 'Move The Dark Knight Rises' })
    handle.focus()
    for (const key of [' ', '{ArrowUp}', '{ArrowUp}', ' ']) {
      await userEvent.keyboard(key)
      await new Promise((r) => setTimeout(r, 50))
    }
    await new Promise((r) => setTimeout(r, 300))
    await userEvent.click(screen.getByRole('button', { name: 'Save order' }))
    expect(onSave).toHaveBeenCalledWith(['s2', 's0', 's1'])
  })
})
