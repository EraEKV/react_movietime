import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const signUp = vi.fn()
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    signUp,
    signInWithGoogle: vi.fn(),
    pending: null,
    error: null,
    clearError: () => {},
  }),
}))

import SignupPage from './SignupPage'

const field = (name: RegExp | string) => screen.getByLabelText(name)

function setup(path = '/') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <SignupPage />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

describe('SignupPage invite link', () => {
  it('prefills the invited email', () => {
    setup('/signup?invite=lists/abc&email=dan%40example.com')
    expect(field('Email')).toHaveValue('dan@example.com')
  })
})

describe('SignupPage validation', () => {
  beforeEach(() => {
    signUp.mockReset()
  })

  it('shows every error and does not submit an empty form', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: /create account|sign up/i }))
    expect(screen.getByText('Enter your email.')).toBeInTheDocument()
    expect(screen.getByText('Create a password.')).toBeInTheDocument()
    expect(screen.getByText('Repeat the password.')).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('rejects an invalid email and a weak password on blur', async () => {
    const user = setup()
    await user.type(field(/^email/i), 'nope')
    await user.tab()
    expect(screen.getByText(/enter an email like/i)).toBeInTheDocument()
    await user.type(field(/^password$/i), 'abcdefgh')
    await user.tab()
    expect(screen.getByText(/8\+ characters with a number/i)).toBeInTheDocument()
  })

  it('reports a mismatching confirmation', async () => {
    const user = setup()
    await user.type(field(/^password$/i), 'abcdef1!')
    await user.type(field(/confirm|repeat/i), 'abcdef1?')
    await user.tab()
    expect(screen.getByText(/match/i)).toBeInTheDocument()
  })

  it('submits valid values', async () => {
    const user = setup()
    await user.type(field(/name/i), 'Ann')
    await user.type(field(/^email/i), 'ann@example.com')
    await user.type(field(/^password$/i), 'abcdef1!')
    await user.type(field(/confirm|repeat/i), 'abcdef1!')
    await user.click(screen.getByRole('button', { name: /create account|sign up/i }))
    expect(signUp).toHaveBeenCalledWith('Ann', 'ann@example.com', 'abcdef1!')
  })
})
