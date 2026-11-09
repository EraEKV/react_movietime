import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import CrewList from '../CrewList/CrewList'
import CastList from './CastList'

describe('CastList', () => {
  it('links each member to their person page', () => {
    render(
      <MemoryRouter>
        <CastList
          cast={[
            {
              id: 6384,
              credit_id: 'a',
              name: 'Keanu Reeves',
              profile_path: null,
              character: 'Neo',
            },
            {
              id: 6385,
              credit_id: 'b',
              name: 'Carrie-Anne Moss',
              profile_path: null,
              character: '',
            },
          ]}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /Keanu Reeves: profile · Neo/ })).toHaveAttribute(
      'href',
      '/person/6384',
    )
    expect(screen.getByRole('link', { name: 'Carrie-Anne Moss: profile' })).toHaveAttribute(
      'href',
      '/person/6385',
    )
  })
})

describe('CrewList', () => {
  it('links people to their pages and names their jobs in the interface language', () => {
    render(
      <MemoryRouter>
        <CrewList crew={[{ id: 9, name: 'Lana Wachowski', jobs: ['director', 'writer'] }]} />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: /Lana Wachowski/ })
    expect(link).toHaveAttribute('href', '/person/9')
    expect(link).toHaveTextContent('Director, Writer')
  })
})
