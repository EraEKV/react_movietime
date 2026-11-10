import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/tmdb'
import type { LibraryEntry } from '../../types/library'
import type { CollectionDetails as Collection, CollectionPart } from '../../types/tmdb'
import CollectionDetails from './CollectionDetails'

type State =
  | { status: 'loading'; data: null; error: null; reload: () => void }
  | { status: 'error'; data: null; error: Error; reload: () => void }
  | { status: 'success'; data: Collection; error: null; reload: () => void }

let state: State
let online = true
let entries: Pick<LibraryEntry, 'key' | 'status'>[] = []

vi.mock('../../shared/hooks/useFetch', () => ({ useFetch: () => state }))
vi.mock('../../shared/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => online }))
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: false }) }))
vi.mock('../../hooks/useLibrary', () => ({ useLibrary: () => ({ entries }) }))

const reload = vi.fn()

const part = (id: number, date: string, over: Partial<CollectionPart> = {}): CollectionPart => ({
  id,
  title: `Film ${id}`,
  overview: '',
  poster_path: null,
  release_date: date,
  vote_average: 7,
  popularity: 1,
  genre_ids: [],
  ...over,
})

const collection = (over: Partial<Collection> = {}): Collection => ({
  id: 10,
  name: 'Star Wars Collection',
  overview: 'A long time ago.',
  poster_path: null,
  backdrop_path: null,
  parts: [],
  ...over,
})

const success = (data: Collection): State => ({ status: 'success', data, error: null, reload })

function setup() {
  return render(
    <MemoryRouter>
      <CollectionDetails collectionId="10" />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  online = true
  entries = []
  reload.mockClear()
  state = success(collection())
})

describe('CollectionDetails states', () => {
  it('shows a labelled skeleton while loading', () => {
    state = { status: 'loading', data: null, error: null, reload }
    setup()
    expect(screen.getByLabelText('Loading collection')).toHaveAttribute('aria-busy', 'true')
  })

  it('shows the error with Try again, which reloads', async () => {
    state = { status: 'error', data: null, error: new Error('boom'), reload }
    setup()
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load this collection')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reload).toHaveBeenCalledOnce()
  })

  it('says so when the failed request was offline', () => {
    online = false
    state = { status: 'error', data: null, error: new ApiError('Network', 0), reload }
    setup()
    expect(screen.getByRole('alert')).toHaveTextContent('You’re offline')
  })

  it('shows "not found" without Try again for a 404', () => {
    state = { status: 'error', data: null, error: new ApiError('Not found', 404), reload }
    setup()
    expect(screen.getByRole('alert')).toHaveTextContent('Collection not found')
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('shows the empty state and the "nothing to watch" line for a collection without films', () => {
    setup()
    expect(screen.queryByRole('link', { name: 'Plan a marathon' })).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Star Wars Collection', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByText('No films yet')).toBeInTheDocument()
    expect(screen.getByText('Nothing released to watch yet')).toBeInTheDocument()
  })

  it('says when the collection has no description', () => {
    state = success(collection({ overview: '  ' }))
    setup()
    expect(screen.getByText('There is no description for this collection yet.')).toBeInTheDocument()
  })
})

describe('CollectionDetails films and progress', () => {
  beforeEach(() => {
    state = success(
      collection({
        parts: [
          part(3, '2005-05-19'),
          part(1, '1977-05-25'),
          part(2, '1980-05-21'),
          part(4, '2099-01-01'),
          part(5, ''),
        ],
      }),
    )
  })

  it('lists released films by date and puts announced ones apart', () => {
    setup()
    const released = screen.getByRole('list', {
      name: 'Films of Star Wars Collection, in order of release',
    })
    const titles = within(released)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent)
    expect(titles).toEqual(['Film 1', 'Film 2', 'Film 3'])

    const upcoming = screen.getByRole('list', { name: 'Not released yet' })
    expect(within(upcoming).getAllByRole('link')).toHaveLength(2)
    expect(within(upcoming).getByText('Date to be announced')).toBeInTheDocument()
  })

  it('shows the size and span of the franchise', () => {
    setup()
    expect(screen.getByText('5 movies · 1977–2099')).toBeInTheDocument()
  })

  it('counts what you have watched among released films and marks the cards', () => {
    entries = [
      { key: 'movie_1', status: 'completed' },
      { key: 'movie_2', status: 'plan' },
      { key: 'movie_4', status: 'completed' }, // not out yet: not counted
    ]
    setup()
    expect(screen.getByText('You’ve watched 1 of 3')).toBeInTheDocument()
    expect(screen.getByText('In your plan: 1')).toBeInTheDocument()
    expect(
      screen.getByRole('progressbar', { name: 'Watched from this collection' }),
    ).toHaveAttribute('aria-valuenow', '33')
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Plan to watch').length).toBeGreaterThan(0)
  })

  it('offers the marathon, and sign-in instead of adding to a list, for a guest', () => {
    setup()
    expect(screen.getByRole('link', { name: 'Plan a marathon' })).toHaveAttribute(
      'href',
      '/planner/new?collection=10',
    )
    expect(screen.getByRole('link', { name: 'Add all to a list' })).toHaveAttribute(
      'href',
      expect.stringContaining('/login'),
    )
  })

  it('links every film to its movie page', () => {
    setup()
    expect(screen.getByRole('link', { name: /Film 1/ })).toHaveAttribute('href', '/movies/1')
  })
})
