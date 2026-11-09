import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MediaSummary } from '../../types/media'
import HeaderSearchResults from './HeaderSearchResults'

type Search =
  | { status: 'success'; data: MediaSummary[]; error: null }
  | { status: 'loading'; data: null; error: null }
  | { status: 'error'; data: null; error: Error }

type Hook = Search & { pending: boolean; tooShort: boolean; reload: () => void }
let current: Hook
const base = { pending: false, tooShort: false, reload: () => {} }
vi.mock('../../hooks/useTitleSearch', () => ({ useTitleSearch: () => current }))

const item = (
  mediaType: 'movie' | 'tv',
  id: number,
  title: string,
  date: string,
): MediaSummary => ({
  mediaType,
  id,
  title,
  posterPath: null,
  date,
  rating: 8,
  genreIds: [],
})

function setup(props: Partial<Parameters<typeof HeaderSearchResults>[0]> = {}) {
  const onPick = vi.fn()
  const onExitUp = vi.fn()
  render(
    <MemoryRouter>
      <HeaderSearchResults
        query="dune"
        catalog="/series"
        variant="popover"
        onPick={onPick}
        onExitUp={onExitUp}
        {...props}
      />
    </MemoryRouter>,
  )
  return { onPick, onExitUp }
}

beforeEach(() => {
  current = {
    ...base,
    status: 'success',
    error: null,
    data: [
      item('movie', 438631, 'Dune', '2021-09-15'),
      item('tv', 1396, 'Breaking Bad', '2008-01-20'),
    ],
  }
})

describe('HeaderSearchResults', () => {
  it('lists titles as links to their pages, with year and type', () => {
    setup()
    expect(screen.getByRole('link', { name: /Dune/ })).toHaveAttribute('href', '/movies/438631')
    expect(screen.getByRole('link', { name: /Breaking Bad/ })).toHaveAttribute(
      'href',
      '/series/1396',
    )
    expect(screen.getByText('2021 · Movie')).toBeInTheDocument()
    expect(screen.getByText('2008 · Series')).toBeInTheDocument()
  })

  it('links to the full catalog search and tells the caller a result was picked', async () => {
    const { onPick } = setup()
    const all = screen.getByRole('link', { name: /All results/ })
    expect(all).toHaveAttribute('href', '/series?q=dune')
    await userEvent.click(screen.getByRole('link', { name: /Dune/ }))
    expect(onPick).toHaveBeenCalled()
  })

  it('renders nothing for a query that is too short', () => {
    current = { ...base, tooShort: true, status: 'loading', data: null, error: null }
    setup({ query: 'd' })
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByText(/No titles/)).not.toBeInTheDocument()
  })

  it('shows skeleton rows while loading', () => {
    current = { ...base, status: 'loading', data: null, error: null }
    setup()
    expect(screen.getByLabelText('Searching')).toHaveAttribute('aria-busy', 'true')
  })

  it('says so when nothing matches', () => {
    current = { ...base, status: 'success', data: [], error: null }
    setup({ query: 'zzzz' })
    expect(screen.getByText('No titles for “zzzz”.')).toBeInTheDocument()
  })

  it('offers a retry when the search fails', async () => {
    const reload = vi.fn()
    current = { ...base, reload, status: 'error', data: null, error: new Error('x') }
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reload).toHaveBeenCalled()
  })

  it('moves between cards with the arrow keys and back to the field from the first one', async () => {
    const { onExitUp } = setup()
    const [first, second] = screen.getAllByRole('link', { name: /Dune|Breaking Bad/ })
    first?.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(second).toHaveFocus()
    await userEvent.keyboard('{ArrowUp}{ArrowUp}')
    expect(onExitUp).toHaveBeenCalled()
  })
})
