import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { PersonDetails } from '../../types/tmdb'
import PersonHero from './PersonHero'

const person: PersonDetails = {
  id: 525,
  name: 'Christopher Nolan',
  biography: 'A director.',
  birthday: null,
  deathday: null,
  place_of_birth: null,
  profile_path: null,
  known_for_department: 'Directing',
  combined_credits: { cast: [], crew: [] },
}

const setup = (marathonFilms?: number) =>
  render(
    <MemoryRouter>
      <PersonHero person={person} marathonFilms={marathonFilms} />
    </MemoryRouter>,
  )

describe('PersonHero marathon button', () => {
  it('plans a marathon of the directed films, counting them', () => {
    setup(12)
    expect(screen.getByRole('link', { name: 'Plan a marathon of 12 films' })).toHaveAttribute(
      'href',
      '/planner/new?person=525',
    )
  })

  it('is not there for someone with fewer than two directed films', () => {
    setup(1)
    expect(screen.queryByRole('link', { name: /Plan a marathon/ })).toBeNull()
    setup()
    expect(screen.queryByRole('link', { name: /Plan a marathon/ })).toBeNull()
  })
})
