import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { MediaSummary } from '../../types/media'
import SourceStep from './SourceStep'

const found: MediaSummary[] = [
  {
    mediaType: 'movie',
    id: 438631,
    title: 'Dune',
    posterPath: '/d.jpg',
    date: '2021-09-15',
    rating: 8,
    genreIds: [],
  },
  {
    mediaType: 'tv',
    id: 1,
    title: 'Dune: Prophecy',
    posterPath: null,
    date: '2024-11-17',
    rating: 7,
    genreIds: [],
  },
  {
    mediaType: 'movie',
    id: 841,
    title: 'Dune (1984)',
    posterPath: null,
    date: '1984-12-14',
    rating: 6,
    genreIds: [],
  },
]

vi.mock('../../hooks/useTitleSearch', () => ({
  useTitleSearch: (query: string) =>
    query.trim().length >= 2
      ? { status: 'success', data: found, tooShort: false, pending: false, reload: () => {} }
      : { status: 'idle', data: null, tooShort: true, pending: false, reload: () => {} },
}))
vi.mock('../../hooks/useLibrary', () => ({ useLibrary: () => ({ entries: [] }) }))
vi.mock('../../hooks/useLists', () => ({
  useMyLists: () => ({ status: 'success', data: [], retry: () => {} }),
  useSharedLists: () => ({ status: 'success', data: [] }),
}))

function renderStep(kind: 'series' | 'movie' | 'list', onPick = vi.fn(), onKindChange = vi.fn()) {
  render(
    <MemoryRouter>
      <SourceStep kind={kind} onKindChange={onKindChange} pick={null} onPick={onPick} />
    </MemoryRouter>,
  )
  return { onPick, onKindChange }
}

describe('SourceStep', () => {
  it('offers a series, a movie and a list of movies', () => {
    renderStep('series')
    expect(screen.getByRole('radio', { name: 'Series' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Movie' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Movie list' })).toBeInTheDocument()
  })

  it('switches to the movie search', async () => {
    const { onKindChange } = renderStep('series')
    await userEvent.setup().click(screen.getByRole('radio', { name: 'Movie' }))
    expect(onKindChange).toHaveBeenCalledWith('movie')
  })

  it('searches movies only and picks one as a movie', async () => {
    const user = userEvent.setup()
    const { onPick } = renderStep('movie')
    expect(screen.getByText(/search for a movie to plan/i)).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Search movies by title'), 'dune')
    expect(screen.getByRole('radio', { name: /^Dune\b(?!:)/ })).toBeInTheDocument()
    expect(screen.queryByText('Dune: Prophecy')).toBeNull()
    expect(screen.getByText('Dune (1984)')).toBeInTheDocument()

    await user.click(screen.getByText('Dune (1984)'))
    expect(onPick).toHaveBeenCalledWith({
      kind: 'movie',
      id: 841,
      title: 'Dune (1984)',
      posterPath: null,
    })
  })

  it('still searches series on the series tab', async () => {
    const user = userEvent.setup()
    const { onPick } = renderStep('series')
    await user.type(screen.getByPlaceholderText('Search series by title'), 'dune')
    expect(screen.queryByText('Dune (1984)')).toBeNull()
    await user.click(screen.getByText('Dune: Prophecy'))
    expect(onPick).toHaveBeenCalledWith({
      kind: 'series',
      id: 1,
      title: 'Dune: Prophecy',
      posterPath: null,
    })
  })
})
