import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WatchDisclosure from './WatchDisclosure'

const offers = {
  id: 603,
  'watch/providers': {
    results: {
      US: {
        link: 'https://www.themoviedb.org/movie/603/watch?locale=US',
        flatrate: [
          { provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg', display_priority: 1 },
        ],
      },
    },
  },
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  localStorage.clear()
  fetchMock = vi.fn(async () => Response.json(offers))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('WatchDisclosure', () => {
  it('asks nothing until it is opened', () => {
    render(<WatchDisclosure mediaType="movie" tmdbId={603} />)
    expect(screen.getByRole('button', { name: /where to watch/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('loads the services of that one title when opened, and hides them again', async () => {
    const user = userEvent.setup()
    render(<WatchDisclosure mediaType="movie" tmdbId={603} />)
    const toggle = screen.getByRole('button', { name: /where to watch/i })

    await user.click(toggle)
    expect(await screen.findByText('Netflix')).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = String((fetchMock.mock.calls[0] as unknown[])[0])
    expect(url).toContain('/api/tmdb/movie/603')
    expect(url).toContain('append_to_response=watch%2Fproviders')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Netflix')).not.toBeVisible()
  })

  it('says so and offers a retry when the request fails', async () => {
    fetchMock.mockImplementation(async () =>
      Response.json({ status_message: 'Boom' }, { status: 500 }),
    )
    const user = userEvent.setup()
    render(<WatchDisclosure mediaType="tv" tmdbId={1399} />)
    await user.click(screen.getByRole('button', { name: /where to watch/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Boom')
    fetchMock.mockImplementation(async () => Response.json(offers))
    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByText('Netflix')).toBeInTheDocument()
  })
})
