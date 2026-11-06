import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useAuth = vi.fn()
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => useAuth() }))

import GuestRoute from './GuestRoute'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<GuestRoute unverifiedTo="/verify-email" />}>
          <Route path="/signup" element={<p>sign-up form</p>} />
        </Route>
        <Route path="/lists/:id" element={<p>the list</p>} />
        <Route path="/planner/:id" element={<p>the plan</p>} />
        <Route path="/verify-email" element={<p>check your email</p>} />
        <Route path="/" element={<p>home</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const verified = {
  status: 'authenticated',
  pending: null,
  user: { emailVerified: true, providers: ['password'] },
}

describe('GuestRoute with an invite link', () => {
  beforeEach(() => useAuth.mockReset())

  it('shows the form to a guest', () => {
    useAuth.mockReturnValue({ status: 'guest', pending: null, user: null })
    renderAt('/signup?invite=lists/abc&email=a%40b.co')
    expect(screen.getByText('sign-up form')).toBeInTheDocument()
  })

  it('sends a signed-in user to the invited list or plan', () => {
    useAuth.mockReturnValue(verified)
    renderAt('/signup?invite=lists/abc')
    expect(screen.getByText('the list')).toBeInTheDocument()
  })

  it('sends a plan invite to the planner', () => {
    useAuth.mockReturnValue(verified)
    renderAt('/signup?invite=plans/p1')
    expect(screen.getByText('the plan')).toBeInTheDocument()
  })

  it('ignores a malformed invite', () => {
    useAuth.mockReturnValue(verified)
    renderAt('/signup?invite=https://evil.site')
    expect(screen.getByText('home')).toBeInTheDocument()
  })

  it('an unverified new account goes to the verification page first', () => {
    useAuth.mockReturnValue({
      ...verified,
      user: { emailVerified: false, providers: ['password'] },
    })
    renderAt('/signup?invite=lists/abc')
    expect(screen.getByText('check your email')).toBeInTheDocument()
  })
})
