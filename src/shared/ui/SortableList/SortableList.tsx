import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import Icon from '../Icon/Icon'
import styles from './SortableList.module.css'

/** Texts for screen readers; `place` is 1-based. The caller owns the language. */
export interface SortableTexts<T> {
  /** Spoken once on a focused handle: how to lift, move and drop. */
  instructions: string
  /** Accessible name of a row's handle. */
  handle: (item: T) => string
  pickedUp: (item: T) => string
  movedTo: (item: T, place: number) => string
  dropped: (item: T, place: number) => string
  cancelled: (item: T) => string
}

interface SortableListProps<T> {
  items: T[]
  getId: (item: T) => string
  /** One row: the item, the drag handle to put where it fits, and its 1-based place. */
  renderItem: (item: T, handle: ReactNode, place: number) => ReactNode
  /** `activeId` was dropped where `overId` is. */
  onMove: (activeId: string, overId: string) => void
  texts: SortableTexts<T>
  /** Accessible name of the list. */
  label: string
  className?: string
  rowClassName?: string
}

/**
 * A vertically sortable ordered list. A row moves only by its handle, so links and buttons
 * inside keep working and a touch scroll over the row doesn't pick it up. Keyboard: focus the
 * handle, Space to lift, arrows to move, Space to drop, Esc to cancel. The list doesn't keep
 * the order: it reports the drop and the caller re-renders `items` in the new order.
 */
export default function SortableList<T>({
  items,
  getId,
  renderItem,
  onMove,
  texts,
  label,
  className,
  rowClassName,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    // A short press on the handle lifts the row; scrolling elsewhere stays scrolling.
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const ids = items.map(getId)
  const itemOf = (id: string | number) => items.find((item) => getId(item) === String(id))
  const placeOf = (id: string | number) => ids.indexOf(String(id)) + 1

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const item = itemOf(active.id)
      return item ? texts.pickedUp(item) : ''
    },
    onDragOver: ({ active, over }) => {
      const item = itemOf(active.id)
      return item && over ? texts.movedTo(item, placeOf(over.id)) : ''
    },
    onDragEnd: ({ active, over }) => {
      const item = itemOf(active.id)
      return item && over ? texts.dropped(item, placeOf(over.id)) : ''
    },
    onDragCancel: ({ active }) => {
      const item = itemOf(active.id)
      return item ? texts.cancelled(item) : ''
    },
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id) onMove(String(active.id), String(over.id))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
      accessibility={{ announcements, screenReaderInstructions: { draggable: texts.instructions } }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ol className={className} aria-label={label}>
          {items.map((item, index) => (
            <SortableRow
              key={getId(item)}
              id={getId(item)}
              handleLabel={texts.handle(item)}
              className={rowClassName}
            >
              {(handle) => renderItem(item, handle, index + 1)}
            </SortableRow>
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}

function SortableRow({
  id,
  handleLabel,
  className,
  children,
}: {
  id: string
  handleLabel: string
  className?: string
  children: (handle: ReactNode) => ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className={styles.handle}
      aria-label={handleLabel}
      {...attributes}
      {...listeners}
    >
      <Icon name="grip" size={20} />
    </button>
  )

  return (
    <li
      ref={setNodeRef}
      className={cx(styles.row, className, isDragging && styles.dragging)}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      {children(handle)}
    </li>
  )
}
