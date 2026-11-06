import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import InviteLink from './InviteLink'

const props = {
  email: 'dan@example.com',
  url: 'https://movietime.test/signup?invite=lists/abc&email=dan%40example.com',
  name: 'Weeknight comfort',
  ownerName: 'Era',
  onDismiss: () => {},
}

describe('InviteLink', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows the link and a prefilled mailto', () => {
    render(<InviteLink {...props} />)
    expect(screen.getByDisplayValue(props.url)).toBeInTheDocument()
    const href = screen.getByRole('link', { name: 'Email' }).getAttribute('href') ?? ''
    expect(href.startsWith('mailto:dan%40example.com?subject=')).toBe(true)
    expect(decodeURIComponent(href)).toContain(
      'Era invited you to “Weeknight comfort” on Movietime',
    )
    expect(decodeURIComponent(href)).toContain(props.url)
  })

  it('hides Share when the browser has no Web Share API', () => {
    vi.stubGlobal('navigator', { ...navigator, share: undefined })
    render(<InviteLink {...props} />)
    expect(screen.queryByRole('button', { name: /Share/ })).not.toBeInTheDocument()
  })

  it('shares through the Web Share API when it exists', async () => {
    const share = vi.fn(() => Promise.resolve())
    vi.stubGlobal('navigator', { ...navigator, share })
    render(<InviteLink {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /Share/ }))
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: props.url }))
  })

  it('copies the link', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    render(<InviteLink {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Copy invite link' }))
    expect(writeText).toHaveBeenCalledWith(props.url)
    expect(screen.getByRole('button', { name: 'Link copied' })).toBeInTheDocument()
  })
})
