import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppNotification, SharedNotification } from '../../types/notifications'

const state = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
}))
vi.mock('../../hooks/useNotifications', () => ({ useNotifications: () => state.value }))

import NotificationBell from './NotificationBell'

const note = (over: Partial<SharedNotification> = {}): AppNotification => ({
  id: 'n1',
  type: 'shared',
  collection: 'lists',
  targetId: 'abc123',
  targetTitle: 'Weeknight comfort',
  role: 'editor',
  fromName: 'Dana',
  createdAt: new Date().toISOString(),
  read: false,
  ...over,
})

const markRead = vi.fn(() => Promise.resolve())
const markAllRead = vi.fn(() => Promise.resolve())
const decline = vi.fn(() => Promise.resolve())

function setup(items: AppNotification[], status = 'success') {
  state.value = {
    status,
    items,
    unread: items.filter((i) => !i.read).length,
    retry: vi.fn(),
    markRead,
    markAllRead,
    decline,
  }
  render(
    <MemoryRouter>
      <NotificationBell />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

describe('NotificationBell', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the unread count in the button name', () => {
    setup([note(), note({ id: 'n2' }), note({ id: 'n3', read: true })])
    expect(screen.getByRole('button', { name: 'Notifications, 2 unread' })).toBeInTheDocument()
  })

  it('has a plain name and no counter when everything is read', () => {
    setup([note({ read: true })])
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument()
  })

  it('shows an empty state when there is nothing', async () => {
    const user = setup([])
    await user.click(screen.getByRole('button', { name: 'Notifications' }))
    expect(screen.getByText('No notifications yet')).toBeInTheDocument()
  })

  it('describes the invitation and links to the list', async () => {
    const user = setup([note()])
    await user.click(screen.getByRole('button', { name: /Notifications/ }))
    expect(
      screen.getByText(/Dana invited you to edit the list “Weeknight comfort”/),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/lists/abc123')
  })

  it('links a plan to the planner', async () => {
    const user = setup([note({ collection: 'plans', targetId: 'p9', role: 'viewer' })])
    await user.click(screen.getByRole('button', { name: /Notifications/ }))
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/planner/p9')
  })

  it('opening an unread notification marks it read and closes the panel', async () => {
    const user = setup([note()])
    await user.click(screen.getByRole('button', { name: /Notifications/ }))
    await user.click(screen.getByRole('link', { name: 'Open' }))
    expect(markRead).toHaveBeenCalledWith('n1')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('marks one and all as read; a read item has no "Mark as read"', async () => {
    const user = setup([note(), note({ id: 'n2', read: true })])
    await user.click(screen.getByRole('button', { name: /Notifications/ }))
    expect(screen.getAllByRole('button', { name: 'Mark as read' })).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Mark as read' }))
    expect(markRead).toHaveBeenCalledWith('n1')
    await user.click(screen.getByRole('button', { name: 'Mark all as read' }))
    expect(markAllRead).toHaveBeenCalled()
  })

  it('declines', async () => {
    const item = note()
    const user = setup([item])
    await user.click(screen.getByRole('button', { name: /Notifications/ }))
    await user.click(screen.getByRole('button', { name: 'Decline' }))
    expect(decline).toHaveBeenCalledWith(item)
  })

  it('tells the owner about a suggestion and the author about the answer', async () => {
    const base = {
      collection: 'plans' as const,
      targetId: 'p9',
      targetTitle: 'Dark Knight marathon',
      fromName: 'Vera',
      createdAt: new Date().toISOString(),
      read: false,
    }
    const user = setup([
      { ...base, id: 'a', type: 'proposal', film: 'Inception', decision: null },
      { ...base, id: 'b', type: 'answer', film: 'Memento', decision: 'accepted', fromName: 'Olga' },
      { ...base, id: 'c', type: 'answer', film: 'Dunkirk', decision: 'rejected', fromName: 'Olga' },
    ])
    await user.click(screen.getByRole('button', { name: /Notifications/ }))
    expect(
      screen.getByText('Vera suggested “Inception” for the plan “Dark Knight marathon”'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Olga accepted your suggestion “Memento” in “Dark Knight marathon”'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Olga declined your suggestion “Dunkirk” in “Dark Knight marathon”'),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Open' })[0]).toHaveAttribute('href', '/planner/p9')
    // Nothing to give up here: the button only removes the notice.
    expect(screen.queryByRole('button', { name: 'Decline' })).toBeNull()
    await user.click(screen.getAllByRole('button', { name: 'Dismiss' })[0] as HTMLElement)
    expect(decline).toHaveBeenCalledTimes(1)
  })

  it('shows a message when an action fails', async () => {
    markRead.mockRejectedValueOnce(new Error('x'))
    const user = setup([note()])
    await user.click(screen.getByRole('button', { name: /Notifications/ }))
    await user.click(screen.getByRole('button', { name: 'Mark as read' }))
    expect(await screen.findByText(/Could not update/)).toBeInTheDocument()
  })

  it('offers a retry when the listener failed', async () => {
    const user = setup([], 'error')
    await user.click(screen.getByRole('button', { name: 'Notifications' }))
    expect(screen.getByText('Could not load notifications.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
