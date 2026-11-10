import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LibraryEntry } from '../../types/library'
import type { CollectionDetails, CollectionPart } from '../../types/tmdb'
import CollectionBlock from './CollectionBlock'

type State =
  | { status: 'loading'; data: null; error: null; reload: () => void }
  | { status: 'error'; data: null; error: Error; reload: () => void }
  | { status: 'success'; data: CollectionDetails; error: null; reload: () => void }

let state: State
let entries: Pick<LibraryEntry, 'key' | 'status'>[] = []
const reload = vi.fn()

vi.mock('../../shared/hooks/useFetch', () => ({ useFetch: () => state }))
vi.mock('../../hooks/useLibrary', () => ({ useLibrary: () => ({ entries }) }))

const part = (id: number, date: string): CollectionPart => ({
  id,
  title: `Film ${id}`,
  overview: '',
  poster_path: null,
  release_date: date,
  vote_average: 7,
  popularity: 1,
  genre_ids: [],
})

const summary = { id: 10, name: 'Star Wars Collection', poster_path: null, backdrop_path: null }
const full = (parts: CollectionPart[]): State => ({
  status: 'success',
  data: { ...summary, overview: '', parts },
  error: null,
  reload,
})

function setup(currentId = 2) {
  return render(
    <MemoryRouter>
      <CollectionBlock collection={summary} currentId={currentId} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  entries = []
  reload.mockClear()
  state = full([part(3, '1983-05-25'), part(1, '1977-05-25'), part(2, '1980-05-21')])
})

describe('CollectionBlock', () => {
  it('shows the other films in release order, without the current one', () => {
    setup(2)
    const row = screen.getByRole('list', { name: 'Other films of Star Wars Collection' })
    expect(
      within(row)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['Film 1', 'Film 3'])
    expect(screen.getByText('Part of Star Wars Collection')).toBeInTheDocument()
  })

  it('links to the collection page', () => {
    setup()
    expect(screen.getByRole('link', { name: 'Open the collection' })).toHaveAttribute(
      'href',
      '/collection/10',
    )
  })

  it('marks films from your library', () => {
    entries = [{ key: 'movie_1', status: 'completed' }]
    setup()
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('shows a skeleton while loading', () => {
    state = { status: 'loading', data: null, error: null, reload }
    setup()
    expect(screen.getByRole('status', { name: 'Loading…' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open the collection' })).toBeInTheDocument()
  })

  it('keeps the link and offers a retry when the films fail to load', async () => {
    state = { status: 'error', data: null, error: new Error('x'), reload }
    setup()
    expect(screen.getByRole('alert')).toHaveTextContent('couldn’t load the other films')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reload).toHaveBeenCalledOnce()
    expect(screen.getByRole('link', { name: 'Open the collection' })).toBeInTheDocument()
  })

  it('renders nothing when the movie is the only one in its collection', () => {
    state = full([part(2, '1980-05-21')])
    const { container } = setup(2)
    expect(container).toBeEmptyDOMElement()
  })
})
