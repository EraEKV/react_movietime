import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HoverCard from './HoverCard'

const hover = (el: Element, pointerType = 'mouse') => fireEvent.pointerEnter(el, { pointerType })

describe('HoverCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens after a short delay on a mouse hover and closes on leave', () => {
    render(
      <HoverCard content={<p>Full title of the film</p>}>
        <button type="button">chip</button>
      </HoverCard>,
    )
    const trigger = screen.getByRole('button', { name: 'chip' })
    hover(trigger)
    expect(screen.queryByText('Full title of the film')).not.toBeInTheDocument()
    act(() => void vi.advanceTimersByTime(300))
    expect(screen.getByText('Full title of the film')).toBeInTheDocument()

    fireEvent.pointerLeave(trigger)
    act(() => void vi.advanceTimersByTime(200))
    expect(screen.queryByText('Full title of the film')).not.toBeInTheDocument()
  })

  it('ignores touch so a tap or a drag is not interrupted', () => {
    render(
      <HoverCard content={<p>Details</p>}>
        <button type="button">chip</button>
      </HoverCard>,
    )
    hover(screen.getByRole('button'), 'touch')
    act(() => void vi.advanceTimersByTime(500))
    expect(screen.queryByText('Details')).not.toBeInTheDocument()
  })

  it('closes on Escape and stays hidden from screen readers', () => {
    render(
      <HoverCard content={<p>Details</p>}>
        <button type="button">chip</button>
      </HoverCard>,
    )
    hover(screen.getByRole('button'))
    act(() => void vi.advanceTimersByTime(300))
    expect(screen.getByText('Details').parentElement).toHaveAttribute('aria-hidden', 'true')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('Details')).not.toBeInTheDocument()
  })

  it('does not show while disabled', () => {
    render(
      <HoverCard content={<p>Details</p>} disabled>
        <button type="button">chip</button>
      </HoverCard>,
    )
    hover(screen.getByRole('button'))
    act(() => void vi.advanceTimersByTime(300))
    expect(screen.queryByText('Details')).not.toBeInTheDocument()
  })
})
