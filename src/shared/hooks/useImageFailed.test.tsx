import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useImageFailed } from './useImageFailed'

function Poster({ src }: { src: string | null }) {
  const { failed, onError } = useImageFailed(src)
  return failed ? <p>stand-in</p> : <img src={src ?? ''} alt="poster" onError={onError} />
}

describe('useImageFailed', () => {
  it('treats a missing address as failed', () => {
    render(<Poster src={null} />)
    expect(screen.getByText('stand-in')).toBeInTheDocument()
  })

  it('switches to the stand-in when the image fails to load', () => {
    render(<Poster src="/a.jpg" />)
    fireEvent.error(screen.getByAltText('poster'))
    expect(screen.getByText('stand-in')).toBeInTheDocument()
  })

  it('gives a different address a fresh try', () => {
    const { rerender } = render(<Poster src="/a.jpg" />)
    fireEvent.error(screen.getByAltText('poster'))
    rerender(<Poster src="/b.jpg" />)
    expect(screen.getByAltText('poster')).toBeInTheDocument()
  })
})
