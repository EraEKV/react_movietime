import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { CrewMember } from '../../types/tmdb'
import FullCrew from './FullCrew'

const member = (id: number, name: string, job: string, department: string): CrewMember => ({
  id,
  credit_id: `${id}-${job}`,
  name,
  job,
  department,
})

const crew = [
  member(1, 'Lana Wachowski', 'Director', 'Directing'),
  member(1, 'Lana Wachowski', 'Screenplay', 'Writing'),
  member(3, 'Bill Pope', 'Director of Photography', 'Camera'),
  member(4, 'Jo Gaffer', 'Gaffer', 'Lighting'),
  member(5, 'Ann Wrangler', 'Animal Wrangler', 'Fauna'),
]

const view = (list: CrewMember[]) =>
  render(
    <MemoryRouter>
      <FullCrew crew={list} />
    </MemoryRouter>,
  )

describe('FullCrew', () => {
  it('is closed at first and says how many people worked on the title', () => {
    view(crew)
    const toggle = screen.getByRole('button', { name: /full crew \(4\)/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
  })

  it('opens into departments with linked people and their jobs', async () => {
    const user = userEvent.setup()
    view(crew)
    await user.click(screen.getByRole('button', { name: /full crew/i }))

    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(headings).toEqual(['Directing1', 'Writing1', 'Camera1', 'Lighting1', 'Fauna1'])

    const link = screen.getByRole('link', { name: /Bill Pope/ })
    expect(link).toHaveAttribute('href', '/person/3')
    expect(link).toHaveTextContent('Director of Photography')

    await user.click(screen.getByRole('button', { name: /hide full crew/i }))
    expect(screen.getByRole('button', { name: /full crew/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('renders nothing for a title without crew', () => {
    const { container } = view([])
    expect(container).toBeEmptyDOMElement()
  })
})
