import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { ScheduleOptions } from '../../types/plan'
import ScheduleStep from './ScheduleStep'

// What the step last reported, read after each interaction.
const seen: ScheduleOptions[] = []
const latest = () => seen[seen.length - 1] as ScheduleOptions
function Harness({ initial }: { initial: ScheduleOptions }) {
  const [options, setOptions] = useState(initial)
  const change = (next: ScheduleOptions) => {
    seen.push(next)
    setOptions(next)
  }
  return <ScheduleStep kind="series" options={options} onChange={change} today="2026-11-10" />
}
const base: ScheduleOptions = {
  startDate: '2026-11-10',
  weekdays: [5, 6],
  time: '21:00',
  perSession: 1,
}

const day = (name: string) => screen.getByRole('combobox', { name })
async function pick(user: ReturnType<typeof userEvent.setup>, name: string, time: string) {
  await user.click(day(name))
  await user.click(await screen.findByRole('option', { name: time }))
}

describe('ScheduleStep own times', () => {
  it('sets a weekday apart from the usual time and drops it when it matches again', async () => {
    const user = userEvent.setup()
    render(<Harness initial={base} />)
    await user.click(screen.getByRole('button', { name: 'Different time on some days' }))
    await pick(user, 'Friday', '22:30')
    expect(latest().times).toEqual({ 5: '22:30' })
    await pick(user, 'Friday', '21:00')
    expect(latest().times).toBeUndefined()
  })

  it('clears the own times with "Same time on every day"', async () => {
    const user = userEvent.setup()
    render(<Harness initial={{ ...base, times: { 5: '22:30' } }} />)
    expect(day('Friday')).toHaveTextContent('22:30')
    await user.click(screen.getByRole('button', { name: 'Same time on every day' }))
    expect(latest().times).toBeUndefined()
    expect(screen.queryByRole('combobox', { name: 'Friday' })).toBeNull()
  })

  it('forgets the time of a weekday that is switched off', async () => {
    const user = userEvent.setup()
    render(<Harness initial={{ ...base, times: { 5: '22:30' } }} />)
    await user.click(screen.getByRole('button', { name: 'Friday' }))
    expect(latest().weekdays).toEqual([6])
    expect(latest().times).toBeUndefined()
  })
})

describe('ScheduleStep day presets', () => {
  it('sets the weekdays in one tap and marks the matching preset', async () => {
    const user = userEvent.setup()
    render(<Harness initial={base} />)
    expect(screen.getByRole('button', { name: 'Weekends' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    await user.click(screen.getByRole('button', { name: 'Weekends' }))
    expect(latest().weekdays).toEqual([0, 6])
    expect(screen.getByRole('button', { name: 'Weekends' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Every day' }))
    expect(latest().weekdays).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('drops the own time of a day the preset leaves out', async () => {
    const user = userEvent.setup()
    render(<Harness initial={{ ...base, times: { 5: '22:30' } }} />)
    await user.click(screen.getByRole('button', { name: 'Weekends' }))
    expect(latest().times).toBeUndefined()
  })
})
