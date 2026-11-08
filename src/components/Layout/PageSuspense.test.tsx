import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { lazy } from 'react'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import PageSuspense from './PageSuspense'

describe('PageSuspense', () => {
  it('shows the skeleton at once when a navigation reaches a page that is still loading', async () => {
    let finish: (page: { default: () => React.JSX.Element }) => void = () => {}
    const Slow = lazy(() => new Promise<{ default: () => React.JSX.Element }>((r) => (finish = r)))

    render(
      <MemoryRouter initialEntries={['/']}>
        <Link to="/slow">Go</Link>
        <PageSuspense>
          <Routes>
            <Route path="/" element={<p>Home page</p>} />
            <Route path="/slow" element={<Slow />} />
          </Routes>
        </PageSuspense>
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('link', { name: 'Go' }))
    // The old page is gone and the skeleton is up while the chunk is pending.
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
    expect(screen.queryByText('Home page')).not.toBeInTheDocument()

    await act(async () => finish({ default: () => <p>Slow page</p> }))
    expect(await screen.findByText('Slow page')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
