import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { HeaderSearchOverlay } from './HeaderSearch'

function Where() {
  const { pathname, search } = useLocation()
  return <output>{pathname + search}</output>
}

function setup(path: string, onClose = vi.fn()) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<HeaderSearchOverlay onClose={onClose} />} />
      </Routes>
      <Where />
    </MemoryRouter>,
  )
  return onClose
}

describe('HeaderSearchOverlay', () => {
  it('focuses the field and searches series from any page', async () => {
    const onClose = setup('/library')
    const field = screen.getByRole('searchbox')
    expect(field).toHaveFocus()
    await userEvent.type(field, 'breaking bad{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('/series?q=breaking+bad')
    expect(onClose).toHaveBeenCalled()
  })

  it('searches movies on a movies page', async () => {
    setup('/movies')
    await userEvent.type(screen.getByRole('searchbox'), 'dune{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('/movies?q=dune')
  })

  it('closes on Escape without searching', async () => {
    const onClose = setup('/')
    await userEvent.type(screen.getByRole('searchbox'), 'x{Escape}')
    expect(onClose).toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent(/^\/$/)
  })

  it('ignores an empty query', async () => {
    const onClose = setup('/')
    await userEvent.type(screen.getByRole('searchbox'), '   {Enter}')
    expect(onClose).not.toHaveBeenCalled()
  })
})
