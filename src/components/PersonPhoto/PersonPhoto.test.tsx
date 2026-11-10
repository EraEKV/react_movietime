import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PersonPhoto from './PersonPhoto'

describe('PersonPhoto', () => {
  it('shows the photo when there is one', () => {
    render(<PersonPhoto path="/a.jpg" size="w185" alt="Ada" />)
    expect(screen.getByRole('img', { name: 'Ada' })).toHaveAttribute(
      'src',
      'https://image.tmdb.org/t/p/w185/a.jpg',
    )
    expect(screen.queryByTestId('person-photo-fallback')).not.toBeInTheDocument()
  })

  it('shows a silhouette when the person has no photo', () => {
    render(<PersonPhoto path={null} size="w185" />)
    expect(screen.getByTestId('person-photo-fallback')).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
  })

  it('swaps a broken image for the silhouette', () => {
    const { container } = render(<PersonPhoto path="/gone.jpg" size="w185" />)
    fireEvent.error(container.querySelector('img') as HTMLImageElement)
    expect(screen.getByTestId('person-photo-fallback')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('tries again when the path changes', () => {
    const { container, rerender } = render(<PersonPhoto path="/gone.jpg" size="w185" />)
    fireEvent.error(container.querySelector('img') as HTMLImageElement)
    rerender(<PersonPhoto path="/other.jpg" size="w185" />)
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://image.tmdb.org/t/p/w185/other.jpg',
    )
  })
})
