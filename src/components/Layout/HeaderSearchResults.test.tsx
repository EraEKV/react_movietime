import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MediaSummary } from '../../types/media'
import type { SiteSearchData } from '../../utils/search'
import HeaderSearchResults from './HeaderSearchResults'

type Search =
  | { status: 'success'; data: SiteSearchData; error: null }
  | { status: 'loading'; data: null; error: null }
  | { status: 'error'; data: null; error: Error }

type Hook = Search & { pending: boolean; tooShort: boolean; reload: () => void }
let current: Hook
const base = { pending: false, tooShort: false, reload: () => {} }
vi.mock('../../hooks/useSiteSearch', () => ({ useSiteSearch: () => current }))

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

const titles: MediaSummary[] = [
  item('movie', 438631, 'Dune', '2021-09-15'),
  item('tv', 1396, 'Breaking Bad', '2008-01-20'),
]

const success = (data: Partial<SiteSearchData> = {}): Hook => ({
  ...base,
  status: 'success',
  error: null,
  data: { titles, people: [], collections: [], ...data },
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
  current = success()
})

describe('HeaderSearchResults', () => {
  it('lists titles as links to their pages, with year and type', () => {
    setup()
    const group = screen.getByRole('list', { name: 'Titles' })
    expect(within(group).getByRole('link', { name: /Dune/ })).toHaveAttribute(
      'href',
      '/movies/438631',
    )
    expect(within(group).getByRole('link', { name: /Breaking Bad/ })).toHaveAttribute(
      'href',
      '/series/1396',
    )
    expect(screen.getByText('2021 · Movie')).toBeInTheDocument()
    expect(screen.getByText('2008 · Series')).toBeInTheDocument()
  })

  it('shows people and collections in their own groups', () => {
    current = success({
      people: [
        { id: 9, name: 'Frank Herbert', photoPath: null, department: 'Writing' },
        { id: 10, name: 'Denis Villeneuve', photoPath: null, department: 'Directing' },
        { id: 11, name: 'Someone', photoPath: null, department: 'Sound' },
      ],
      collections: [{ id: 3, name: 'Dune Collection', posterPath: null }],
    })
    setup()

    const people = screen.getByRole('list', { name: 'People' })
    expect(within(people).getByRole('link', { name: /Frank Herbert/ })).toHaveAttribute(
      'href',
      '/person/9',
    )
    expect(within(people).getByText('Writer')).toBeInTheDocument()
    expect(within(people).getByText('Director')).toBeInTheDocument()
    // A craft without a translation is left out rather than shown raw.
    expect(within(people).getByRole('link', { name: /Someone/ })).not.toHaveTextContent('Sound')

    const collections = screen.getByRole('list', { name: 'Collections' })
    expect(within(collections).getByRole('link', { name: /Dune Collection/ })).toHaveAttribute(
      'href',
      '/collection/3',
    )
    expect(within(collections).getByText('Collection')).toBeInTheDocument()
  })

  it('omits a group that has no results', () => {
    setup()
    expect(screen.queryByRole('list', { name: 'People' })).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Collections' })).not.toBeInTheDocument()
  })

  it('finds a person even when there are no matching titles', () => {
    current = success({
      titles: [],
      people: [{ id: 6384, name: 'Keanu Reeves', photoPath: null, department: 'Acting' }],
    })
    setup({ query: 'keanu' })
    expect(screen.queryByRole('list', { name: 'Titles' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Keanu Reeves/ })).toHaveAttribute(
      'href',
      '/person/6384',
    )
    expect(screen.queryByText(/Nothing found/)).not.toBeInTheDocument()
  })

  it('links to the full catalog search and tells the caller a result was picked', async () => {
    const { onPick } = setup()
    const all = screen.getByRole('link', { name: /All results/ })
    expect(all).toHaveAttribute('href', '/series?q=dune')
    await userEvent.click(screen.getByRole('link', { name: /Dune/ }))
    expect(onPick).toHaveBeenCalled()
  })

  it('tells the caller when a person or a collection was picked', async () => {
    current = success({
      people: [{ id: 9, name: 'Frank Herbert', photoPath: null, department: 'Writing' }],
      collections: [{ id: 3, name: 'Dune Collection', posterPath: null }],
    })
    const { onPick } = setup()
    await userEvent.click(screen.getByRole('link', { name: /Frank Herbert/ }))
    await userEvent.click(screen.getByRole('link', { name: /Dune Collection/ }))
    expect(onPick).toHaveBeenCalledTimes(2)
  })

  it('renders nothing for a query that is too short', () => {
    current = { ...base, tooShort: true, status: 'loading', data: null, error: null }
    setup({ query: 'd' })
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByText(/Nothing found/)).not.toBeInTheDocument()
  })

  it('shows skeleton rows while loading', () => {
    current = { ...base, status: 'loading', data: null, error: null }
    setup()
    expect(screen.getByLabelText('Searching')).toHaveAttribute('aria-busy', 'true')
  })

  it('says so when nothing matches', () => {
    current = success({ titles: [] })
    setup({ query: 'zzzz' })
    expect(screen.getByText('Nothing found for “zzzz”.')).toBeInTheDocument()
  })

  it('offers a retry when the search fails', async () => {
    const reload = vi.fn()
    current = { ...base, reload, status: 'error', data: null, error: new Error('x') }
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reload).toHaveBeenCalled()
  })

  it('announces how many results there are across all groups', () => {
    current = success({
      people: [{ id: 9, name: 'Frank Herbert', photoPath: null, department: 'Writing' }],
    })
    setup()
    expect(screen.getByRole('status')).toHaveTextContent('3 results')
  })

  it('moves between cards with the arrow keys, across groups, and back to the field', async () => {
    current = success({
      people: [{ id: 9, name: 'Frank Herbert', photoPath: null, department: 'Writing' }],
    })
    const { onExitUp } = setup()
    const [first, second, third] = screen.getAllByRole('link', {
      name: /Dune|Breaking Bad|Frank Herbert/,
    })
    first?.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(second).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(third).toHaveFocus()
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}')
    expect(onExitUp).toHaveBeenCalled()
  })
})
