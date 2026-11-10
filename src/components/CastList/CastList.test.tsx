import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

describe('CastList preview', () => {
  const many = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    credit_id: `c${i}`,
    name: `Actor ${i + 1}`,
    profile_path: null,
    character: '',
  }))

  it('shows 12 people and reveals everyone on request', async () => {
    render(
      <MemoryRouter>
        <CastList cast={many} />
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('link')).toHaveLength(12)
    const toggle = screen.getByRole('button', { name: 'Show all 30' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(screen.getAllByRole('link')).toHaveLength(30)
    await userEvent.click(screen.getByRole('button', { name: 'Show fewer' }))
    expect(screen.getAllByRole('link')).toHaveLength(12)
  })

  it('has no toggle for a short cast', () => {
    render(
      <MemoryRouter>
        <CastList cast={many.slice(0, 5)} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
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

describe('CrewList preview', () => {
  const many = Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    name: `Person ${i + 1}`,
    jobs: ['producer' as const],
  }))

  it('shows 12 people and reveals the rest on request', async () => {
    render(
      <MemoryRouter>
        <CrewList crew={many} />
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('link')).toHaveLength(12)
    const toggle = screen.getByRole('button', { name: 'Show all 15' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(screen.getAllByRole('link')).toHaveLength(15)
    expect(screen.getByRole('button', { name: 'Show fewer' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('has no toggle for a short crew', () => {
    render(
      <MemoryRouter>
        <CrewList crew={many.slice(0, 5)} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
