import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ErrorBoundary from './ErrorBoundary'

function Broken({ message }: { message: string }): never {
  throw new TypeError(message)
}

describe('ErrorBoundary', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows a message instead of an empty page when a page fails', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    render(
      <ErrorBoundary>
        <Broken message="x is undefined" />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows the offline card when the page file could not be fetched offline', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    render(
      <ErrorBoundary>
        <Broken message="Failed to fetch dynamically imported module" />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('renders its children when nothing fails', () => {
    render(
      <ErrorBoundary>
        <p>fine</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('fine')).toBeInTheDocument()
  })
})
