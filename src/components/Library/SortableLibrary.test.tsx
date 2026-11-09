import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { LibraryEntry } from '../../types/library'
import SortableLibrary from './SortableLibrary'

const entry = (id: number): LibraryEntry =>
  ({ key: `movie_${id}`, title: `Title ${id}` }) as LibraryEntry

describe('SortableLibrary', () => {
  it('renders every row with a labelled drag handle and its place', () => {
    render(
      <SortableLibrary
        entries={[entry(1), entry(2)]}
        onReorder={vi.fn()}
        renderItem={(e, handle, position) => (
          <div>
            {handle}
            <span>{`${position}. ${e.title}`}</span>
          </div>
        )}
      />,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Reorder Title 2' })).toBeInTheDocument()
    expect(screen.getByText('2. Title 2')).toBeInTheDocument()
  })
})
