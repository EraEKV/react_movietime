import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SortableList, { type SortableTexts } from './SortableList'

interface Row {
  id: string
  name: string
}

const texts: SortableTexts<Row> = {
  instructions: 'Press space to lift',
  handle: (row) => `Move ${row.name}`,
  pickedUp: (row) => `Picked up ${row.name}`,
  movedTo: (row, place) => `${row.name} to ${place}`,
  dropped: (row, place) => `${row.name} dropped at ${place}`,
  cancelled: (row) => `${row.name} cancelled`,
}

const rows: Row[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
  { id: 'c', name: 'Gamma' },
]

function setup(items = rows) {
  return render(
    <SortableList
      items={items}
      getId={(row) => row.id}
      onMove={() => {}}
      texts={texts}
      label="Order"
      renderItem={(row, handle, place) => (
        <>
          {handle}
          <span>
            {place}. {row.name}
          </span>
        </>
      )}
    />,
  )
}

describe('SortableList', () => {
  it('renders an ordered list in the order given, with the place of each row', () => {
    setup()
    const list = screen.getByRole('list', { name: 'Order' })
    expect(list.tagName).toBe('OL')
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['1. Alpha', '2. Beta', '3. Gamma'])
  })

  it('gives every row a named drag handle', () => {
    setup()
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Move Alpha',
      'Move Beta',
      'Move Gamma',
    ])
  })

  it('follows a new order passed by the parent', () => {
    const { rerender } = setup()
    rerender(
      <SortableList
        items={[rows[2]!, rows[0]!, rows[1]!]}
        getId={(row) => row.id}
        onMove={() => {}}
        texts={texts}
        label="Order"
        renderItem={(row, handle, place) => (
          <>
            {handle}
            <span>
              {place}. {row.name}
            </span>
          </>
        )}
      />,
    )
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '1. Gamma',
      '2. Alpha',
      '3. Beta',
    ])
  })
})
