import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Avatar from '../../shared/ui/Avatar/Avatar'
import AvatarDialog from './AvatarDialog'

describe('Avatar', () => {
  it('shows the chosen emoji on its colour, ahead of the Google photo and the initials', () => {
    const { container } = render(
      <Avatar
        name="Ada Lovelace"
        photoUrl="https://example.com/g.png"
        avatar={{ kind: 'emoji', emoji: '🦊', color: 'plan-3' }}
      />,
    )
    expect(screen.getByRole('img', { name: 'Ada Lovelace' })).toHaveTextContent('🦊')
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByRole('img', { name: 'Ada Lovelace' }).getAttribute('style')).toContain(
      'var(--plan-3)',
    )
  })

  it('shows the chosen photo, else the provider photo, else initials', () => {
    const photo = 'data:image/webp;base64,AAAA'
    const { container, rerender } = render(
      <Avatar
        name="Ada Lovelace"
        photoUrl="https://example.com/g.png"
        avatar={{ kind: 'photo', photo }}
      />,
    )
    expect(container.querySelector('img')).toHaveAttribute('src', photo)
    rerender(<Avatar name="Ada Lovelace" photoUrl="https://example.com/g.png" />)
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/g.png')
    rerender(<Avatar name="Ada Lovelace" />)
    expect(screen.getByRole('img', { name: 'Ada Lovelace' })).toHaveTextContent('AL')
  })
})

describe('AvatarDialog', () => {
  it('saves the emoji and colour that were picked', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(<AvatarDialog name="Ada" current={null} onSave={onSave} onClose={onClose} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Rose' }))
    await userEvent.click(screen.getByRole('radio', { name: '🦊' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledWith({ kind: 'emoji', emoji: '🦊', color: 'plan-3' })
    expect(onClose).toHaveBeenCalled()
  })

  it('starts from what is saved and can go back to initials', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <AvatarDialog
        name="Ada"
        current={{ kind: 'emoji', emoji: '🐼', color: 'plan-2' }}
        onSave={onSave}
        onClose={() => {}}
      />,
    )
    expect(screen.getByRole('radio', { name: '🐼' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Iris' })).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Use initials' }))
    expect(onSave).toHaveBeenCalledWith(null)
  })

  it('offers no "Use initials" when nothing is saved, and Save is off on the empty photo tab', async () => {
    render(<AvatarDialog name="Ada" current={null} onSave={vi.fn()} onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Use initials' })).toBeNull()
    await userEvent.click(screen.getByRole('tab', { name: 'Photo' }))
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(screen.getByText(/Choose a photo, then drag and zoom/)).toBeInTheDocument()
  })

  it('keeps the dialog open and says why when saving fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('No connection.'))
    const onClose = vi.fn()
    render(<AvatarDialog name="Ada" current={null} onSave={onSave} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('No connection.')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})
