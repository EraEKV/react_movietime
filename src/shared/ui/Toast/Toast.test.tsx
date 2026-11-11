import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Toast from './Toast'

describe('Toast', () => {
  it('is announced as a status and drawn directly on <body>, outside the page tree', () => {
    const { container } = render(
      <div style={{ transform: 'translateZ(0)' }}>
        <Toast>Saved</Toast>
      </div>,
    )
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Saved')
    // Not inside the page's own (possibly stacking-context-creating) wrappers.
    expect(container.contains(status)).toBe(false)
    expect(status.parentElement?.parentElement).toBe(document.body)
  })

  it('runs its action', async () => {
    const onAction = vi.fn()
    render(
      <Toast actionLabel="Undo" onAction={onAction}>
        Removed
      </Toast>,
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Undo' }))
    expect(onAction).toHaveBeenCalledOnce()
  })
})
