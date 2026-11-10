import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserProfile } from '../../types/auth'
import type * as Calendar from '../../utils/calendar'
import CalendarFeed from './CalendarFeed'

const TOKEN = 'abcdefghijklmnopqrstuvwxyz012345'
const profile = (changes: Partial<UserProfile>): UserProfile => ({
  displayName: 'Ada',
  email: 'ada@example.com',
  photoURL: null,
  providers: [],
  settings: null,
  icsToken: null,
  icsTimeZone: null,
  createdAt: null,
  updatedAt: null,
  ...changes,
})

const mocks = vi.hoisted(() => ({
  profile: null as UserProfile | null,
  renew: vi.fn(),
  remove: vi.fn(),
  sync: vi.fn(),
}))
vi.mock('../../hooks/useProfile', () => ({
  useProfile: () => ({ status: 'success', profile: mocks.profile, error: null }),
}))
vi.mock('../../services/profileService', () => ({
  renewCalendarFeed: mocks.renew,
  removeCalendarFeed: mocks.remove,
  syncCalendarZone: mocks.sync,
}))
vi.mock('../../utils/calendar', async (original) => ({
  ...(await original<typeof Calendar>()),
  localTimeZone: () => 'Asia/Almaty',
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.renew.mockResolvedValue(TOKEN)
  mocks.remove.mockResolvedValue(undefined)
  mocks.sync.mockResolvedValue(undefined)
})

describe('CalendarFeed', () => {
  it('offers to create the link when there is none', async () => {
    mocks.profile = profile({})
    const user = userEvent.setup()
    render(<CalendarFeed uid="u1" />)
    expect(screen.queryByRole('textbox')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Create calendar link' }))
    expect(mocks.renew).toHaveBeenCalledWith('u1')
  })

  it('shows the address with the secret, and how to use it', () => {
    mocks.profile = profile({ icsToken: TOKEN, icsTimeZone: 'Asia/Almaty' })
    render(<CalendarFeed uid="u1" />)
    expect(screen.getByRole('textbox')).toHaveValue(
      `${window.location.origin}/api/calendar/${TOKEN}.ics`,
    )
    expect(screen.getByText(/Other calendars → From URL/)).toBeInTheDocument()
    expect(screen.getByText(/every few hours/)).toBeInTheDocument()
    expect(screen.getByText(/Asia\/Almaty/)).toBeInTheDocument()
    expect(mocks.sync).not.toHaveBeenCalled()
  })

  it('asks before replacing the link, and replaces it only on confirm', async () => {
    mocks.profile = profile({ icsToken: TOKEN, icsTimeZone: 'Asia/Almaty' })
    const user = userEvent.setup()
    render(<CalendarFeed uid="u1" />)
    await user.click(screen.getByRole('button', { name: 'New link' }))
    expect(mocks.renew).not.toHaveBeenCalled()
    expect(screen.getByText(/stops working at once/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Make a new link' }))
    expect(mocks.renew).toHaveBeenCalledWith('u1')
  })

  it('turns the link off after a confirm, and can back out', async () => {
    mocks.profile = profile({ icsToken: TOKEN, icsTimeZone: 'Asia/Almaty' })
    const user = userEvent.setup()
    render(<CalendarFeed uid="u1" />)
    await user.click(screen.getByRole('button', { name: 'Turn off' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(mocks.remove).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Turn off' }))
    await user.click(screen.getByRole('button', { name: 'Turn off the link' }))
    expect(mocks.remove).toHaveBeenCalledWith('u1')
  })

  it('moves the saved zone to this device when they differ', () => {
    mocks.profile = profile({ icsToken: TOKEN, icsTimeZone: 'Europe/Berlin' })
    render(<CalendarFeed uid="u1" />)
    expect(mocks.sync).toHaveBeenCalledWith('u1')
  })
})
