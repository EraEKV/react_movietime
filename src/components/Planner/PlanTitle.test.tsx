import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import PlanTitle from './PlanTitle'

const setup = (props: Partial<Parameters<typeof PlanTitle>[0]> = {}) => {
  const onRename = vi.fn(async () => {})
  render(<PlanTitle title="Dark Knight marathon" canRename onRename={onRename} {...props} />)
  return { onRename, user: userEvent.setup() }
}

describe('PlanTitle', () => {
  it('shows the name and no pencil to someone who may not rename', () => {
    setup({ canRename: false })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dark Knight marathon')
    expect(screen.queryByRole('button', { name: 'Rename plan' })).toBeNull()
  })

  it('renames with Save and trims the name', async () => {
    const { onRename, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Rename plan' }))
    const input = screen.getByRole('textbox', { name: 'Plan name' })
    expect(input).toHaveValue('Dark Knight marathon')
    await user.clear(input)
    await user.type(input, '  Nolan nights  ')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onRename).toHaveBeenCalledWith('Nolan nights')
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull())
  })

  it('saves with Enter and cancels with Escape', async () => {
    const { onRename, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Rename plan' }))
    await user.type(screen.getByRole('textbox'), '!{Enter}')
    expect(onRename).toHaveBeenCalledWith('Dark Knight marathon!')
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull())

    await user.click(screen.getByRole('button', { name: 'Rename plan' }))
    await user.type(screen.getByRole('textbox'), 'x{Escape}')
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(onRename).toHaveBeenCalledTimes(1)
  })

  it('refuses an empty name and does not call out for an unchanged one', async () => {
    const { onRename, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Rename plan' }))
    await user.clear(screen.getByRole('textbox'))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Give the plan a name.')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox'), 'Dark Knight marathon')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onRename).not.toHaveBeenCalled()
  })

  it('keeps the input open and says why when saving fails', async () => {
    const { user } = setup({
      onRename: vi.fn(async () =>
        Promise.reject(Object.assign(new Error('x'), { code: 'permission-denied' })),
      ),
    })
    await user.click(screen.getByRole('button', { name: 'Rename plan' }))
    await user.type(screen.getByRole('textbox'), '2')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('textbox')).toBeInTheDocument()
    expect(screen.getByText('You don’t have permission to change this plan.')).toBeInTheDocument()
  })
})
