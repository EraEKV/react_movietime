import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import Select from './Select'

const OPTIONS = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry' },
]

function Harness() {
  const [value, setValue] = useState('a')
  return (
    <>
      <label htmlFor="fruit">Fruit</label>
      <Select id="fruit" label="Fruit" value={value} options={OPTIONS} onChange={setValue} />
    </>
  )
}

describe('Select', () => {
  it('shows the selected label and opens the options on click', async () => {
    render(<Harness />)
    const trigger = screen.getByRole('combobox', { name: 'Fruit' })
    expect(trigger).toHaveTextContent('Apple')
    await userEvent.click(trigger)
    expect(screen.getAllByRole('option')).toHaveLength(3)
    expect(screen.getByRole('option', { name: 'Apple' })).toHaveAttribute('aria-selected', 'true')
  })

  it('picks an option and closes', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('combobox', { name: 'Fruit' }))
    await userEvent.click(screen.getByRole('option', { name: 'Cherry' }))
    expect(screen.getByRole('combobox', { name: 'Fruit' })).toHaveTextContent('Cherry')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('moves with arrows, selects with Enter and closes with Esc', async () => {
    render(<Harness />)
    const trigger = screen.getByRole('combobox', { name: 'Fruit' })
    trigger.focus()
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(trigger).toHaveTextContent('Banana')

    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getAllByRole('option')).toHaveLength(3)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('jumps to an option by typing its first letter', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('combobox', { name: 'Fruit' }))
    await userEvent.keyboard('c')
    expect(screen.getByRole('option', { name: 'Cherry' })).toHaveFocus()
  })
})
