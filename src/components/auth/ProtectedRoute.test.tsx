import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useAuth = vi.fn()
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => useAuth() }))

import ProtectedRoute from './ProtectedRoute'

function Where() {
  const { pathname, search } = useLocation()
  return <p>login at {pathname + search}</p>
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<Where />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/lists" element={<p>my lists</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuth.mockReset()
  })

  it('sends guests to login and remembers where they were going', () => {
    useAuth.mockReturnValue({ status: 'guest' })
    renderAt('/lists?x=1')
    expect(screen.getByText('login at /login?redirect=%2Flists%3Fx%3D1')).toBeInTheDocument()
    expect(screen.queryByText('my lists')).not.toBeInTheDocument()
  })

  it('does not redirect while the session is being restored', () => {
    useAuth.mockReturnValue({ status: 'loading' })
    renderAt('/lists')
    expect(screen.queryByText(/login at/)).not.toBeInTheDocument()
    expect(screen.queryByText('my lists')).not.toBeInTheDocument()
  })

  it('renders the page for a signed-in user', () => {
    useAuth.mockReturnValue({ status: 'authenticated' })
    renderAt('/lists')
    expect(screen.getByText('my lists')).toBeInTheDocument()
  })
})
