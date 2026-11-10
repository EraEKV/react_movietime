import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TitleList } from '../../types/list'
import { filmsByDate } from '../../utils/collection'
import AddCollectionDialog from './AddCollectionDialog'

type Lists =
  | { status: 'loading'; data: null; error: null }
  | { status: 'error'; data: null; error: Error }
  | { status: 'success'; data: TitleList[]; error: null }

let lists: Lists
const createList = vi.fn()
const addMissingItems = vi.fn()

vi.mock('../../hooks/useLists', () => ({
  useMyLists: () => lists,
  useListAuthor: () => ({ uid: 'u1', name: 'Ada' }),
  loadListsService: () => Promise.resolve({ createList, addMissingItems }),
}))

const list = (id: string, name: string, over: Partial<TitleList> = {}): TitleList =>
  ({ id, name, emoji: '🍿', itemCount: 3, covers: ['/c.jpg'], ...over }) as TitleList

const films = filmsByDate(
  [1, 2, 3].map((id) => ({
    id,
    title: `Film ${id}`,
    overview: '',
    poster_path: `/p${id}.jpg`,
    release_date: `200${id}-01-01`,
    vote_average: 7,
    popularity: 1,
    genre_ids: [],
  })),
)

function setup(name = 'Star Wars Collection') {
  const onClose = vi.fn()
  render(
    <MemoryRouter>
      <AddCollectionDialog name={name} films={films} onClose={onClose} />
    </MemoryRouter>,
  )
  return { onClose }
}

beforeEach(() => {
  lists = { status: 'success', data: [list('a', 'Weekend'), list('b', 'Space')], error: null }
  createList.mockReset().mockResolvedValue('new-id')
  addMissingItems.mockReset().mockResolvedValue({ added: 3, skipped: 0 })
})

describe('AddCollectionDialog', () => {
  it('shows a skeleton while the lists load, and an error if they fail', () => {
    lists = { status: 'loading', data: null, error: null }
    const { unmount } = render(
      <MemoryRouter>
        <AddCollectionDialog name="X" films={films} onClose={() => {}} />
      </MemoryRouter>,
    )
    expect(screen.getByLabelText('Loading lists')).toHaveAttribute('aria-busy', 'true')
    unmount()

    lists = { status: 'error', data: null, error: new Error('x') }
    setup()
    expect(screen.getByText(/couldn’t load your lists/)).toBeInTheDocument()
  })

  it('cannot add until a list is chosen', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Add 3 movies' })).toBeDisabled()
  })

  it('adds every film to the chosen list and says how many went in', async () => {
    setup()
    await userEvent.click(screen.getByRole('radio', { name: /Space/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Add 3 movies' }))

    expect(addMissingItems).toHaveBeenCalledOnce()
    const [target, media, author] = addMissingItems.mock.calls[0] ?? []
    expect(target).toMatchObject({ id: 'b' })
    expect((media as { tmdbId: number }[]).map((m) => m.tmdbId)).toEqual([1, 2, 3])
    expect(author).toEqual({ uid: 'u1', name: 'Ada' })
    expect(await screen.findByRole('status')).toHaveTextContent('Added 3 movies to “Space”.')
    expect(screen.getByRole('link', { name: 'Open the list' })).toHaveAttribute('href', '/lists/b')
  })

  it('reports films that were already in the list', async () => {
    addMissingItems.mockResolvedValue({ added: 1, skipped: 2 })
    setup()
    await userEvent.click(screen.getByRole('radio', { name: /Weekend/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Add 3 movies' }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Added 1, skipped 2 already in “Weekend”.',
    )
  })

  it('says so when everything is already there', async () => {
    addMissingItems.mockResolvedValue({ added: 0, skipped: 3 })
    setup()
    await userEvent.click(screen.getByRole('radio', { name: /Weekend/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Add 3 movies' }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'All films are already in “Weekend”.',
    )
  })

  it('creates a list named after the collection, cut to 60 characters, and fills it', async () => {
    const long = 'A'.repeat(80)
    setup(long)
    await userEvent.click(screen.getByRole('radio', { name: /New list/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Add 3 movies' }))

    expect(createList).toHaveBeenCalledWith(
      { uid: 'u1', name: 'Ada' },
      expect.objectContaining({ name: 'A'.repeat(60), description: '' }),
    )
    expect(addMissingItems.mock.calls[0]?.[0]).toMatchObject({ id: 'new-id' })
    expect(await screen.findByRole('status')).toHaveTextContent('Created the list')
    expect(screen.getByRole('link', { name: 'Open the list' })).toHaveAttribute(
      'href',
      '/lists/new-id',
    )
  })

  it('offers only a new list when you have none', () => {
    lists = { status: 'success', data: [], error: null }
    setup()
    expect(screen.getByText(/You don’t have any lists yet/)).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(1)
  })

  it('shows why it failed and keeps the dialog open to retry', async () => {
    addMissingItems.mockRejectedValue(new Error('nope'))
    const { onClose } = setup()
    await userEvent.click(screen.getByRole('radio', { name: /Weekend/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Add 3 movies' }))
    expect(await screen.findByText(/couldn’t save/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add 3 movies' })).toBeEnabled()
    expect(onClose).not.toHaveBeenCalled()
  })
})
