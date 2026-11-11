import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import PosterCard from './PosterCard'

const card = (posterUrl: string | null) => (
  <MemoryRouter>
    <PosterCard title="Dune" href="/movies/1" posterUrl={posterUrl} />
  </MemoryRouter>
)

describe('PosterCard', () => {
  it('shows the poster', () => {
    const { container } = render(card('/p.jpg'))
    expect(container.querySelector('img')).toHaveAttribute('src', '/p.jpg')
  })

  it('swaps a poster that fails to load for the title stand-in', () => {
    const { container } = render(card('/broken.jpg'))
    fireEvent.error(container.querySelector('img') as HTMLImageElement)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getAllByText('Dune').length).toBeGreaterThan(1)
  })

  it('shows the stand-in when there is no poster at all', () => {
    const { container } = render(card(null))
    expect(container.querySelector('img')).toBeNull()
  })
})
