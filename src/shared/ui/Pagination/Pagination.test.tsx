import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Pagination from './Pagination'

const pageButtons = () =>
  screen.getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? '')

describe('Pagination', () => {
  it('renders nothing for a single page without a size control', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the edges and the neighbours with gaps in between', () => {
    render(<Pagination page={10} totalPages={50} onPageChange={() => {}} />)
    const labels = pageButtons().filter((l) => /\d/.test(l))
    expect(labels).toHaveLength(5) // 1, 9, 10, 11, 50
    expect(screen.getByRole('button', { name: /^Page 10$/ })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getAllByText('…')).toHaveLength(2)
  })

  it('disables Previous on the first page and Next on the last', () => {
    const { rerender } = render(<Pagination page={1} totalPages={3} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
    rerender(<Pagination page={3} totalPages={3} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('reports the clicked page', async () => {
    const onPageChange = vi.fn()
    render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />)
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    await userEvent.click(screen.getByRole('button', { name: /previous/i }))
    await userEvent.click(screen.getByRole('button', { name: /^Page 5$/ }))
    expect(onPageChange.mock.calls.map(([p]) => p)).toEqual([3, 1, 5])
  })
})
