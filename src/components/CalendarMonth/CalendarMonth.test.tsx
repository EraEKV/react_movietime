import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { monthGrid } from '../../utils/calendar'
import CalendarMonth, { type CalendarItem } from './CalendarMonth'

const month = { year: 2026, month: 10 }
const item: CalendarItem = {
  key: 'a',
  date: '2026-11-10',
  color: 1,
  title: 'The Dark Knight Rises',
  range: '',
  time: '21:00',
  status: 'pending',
}

const view = () =>
  render(
    <MemoryRouter>
      <CalendarMonth
        label="Calendar"
        month={month}
        days={monthGrid(month)}
        today="2026-11-01"
        items={[item]}
        compact
      />
    </MemoryRouter>,
  )

describe('CalendarMonth hover card', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the full title and day of a session on hover', () => {
    view()
    fireEvent.pointerEnter(screen.getByRole('img', { name: /Dark Knight Rises/ }), {
      pointerType: 'mouse',
    })
    act(() => void vi.advanceTimersByTime(300))
    expect(screen.getByText(/Tuesday, November 10/)).toBeInTheDocument()
  })
})
