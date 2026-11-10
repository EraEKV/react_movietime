import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { CollectionFilm } from '../../utils/collection'
import CollectionActions from './CollectionActions'

vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }))

const film = (id: number, title: string): CollectionFilm => ({
  key: `movie_${id}`,
  id,
  title,
  posterPath: null,
  date: '2005-01-01',
  rating: 7,
  overview: '',
  genreIds: [],
})
const films = [film(1, 'Batman Begins'), film(2, 'The Dark Knight')]

function setup(resume: CollectionFilm | null) {
  render(
    <MemoryRouter>
      <CollectionActions
        collectionId={263}
        name="The Dark Knight Collection"
        films={films}
        releasedCount={2}
        resume={resume}
      />
    </MemoryRouter>,
  )
}

describe('CollectionActions', () => {
  it('plans the whole marathon when there is nothing to continue', () => {
    setup(null)
    expect(screen.getByRole('link', { name: 'Plan a marathon' })).toHaveAttribute(
      'href',
      '/planner/new?collection=263',
    )
    expect(screen.queryByRole('link', { name: /Continue/ })).toBeNull()
  })

  it('offers to continue after the last seen film, and keeps the full marathon as the second choice', () => {
    setup(films[1] as CollectionFilm)
    expect(screen.getByRole('link', { name: 'Continue with The Dark Knight' })).toHaveAttribute(
      'href',
      '/planner/new?collection=263&from=2',
    )
    expect(screen.getByRole('link', { name: 'Plan all as a marathon' })).toHaveAttribute(
      'href',
      '/planner/new?collection=263',
    )
  })
})
