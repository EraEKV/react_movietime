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
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslation } from 'react-i18next'
import { cx } from '../../shared/lib/cx'
import Icon from '../../shared/ui/Icon/Icon'
import type { LibraryEntry } from '../../types/library'
import type { MediaKey } from '../../types/media'
import styles from './Library.module.css'

interface SortableLibraryProps {
  entries: LibraryEntry[]
  className?: string
  /** The dragged title was dropped where `overKey` is. */
  onReorder: (movedKey: MediaKey, overKey: MediaKey) => void
  renderItem: (entry: LibraryEntry, handle: React.ReactNode, position: number) => React.ReactNode
}

/**
 * A vertically sortable list. The row moves only by its handle, so links and buttons inside
 * keep working and a touch scroll over the row doesn't pick it up. Keyboard: focus the
 * handle, Space to lift, arrows to move, Space to drop, Esc to cancel.
 */
export default function SortableLibrary({
  entries,
  className,
  onReorder,
  renderItem,
}: SortableLibraryProps) {
  const { t } = useTranslation('library')
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    // A short press on the handle lifts the row; scrolling elsewhere stays scrolling.
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const titleOf = (id: string | number) => entries.find((e) => e.key === id)?.title ?? ''
  const placeOf = (id: string | number) => entries.findIndex((e) => e.key === id) + 1

  const announcements: Announcements = {
    onDragStart: ({ active }) => t('reorder.pickedUp', { title: titleOf(active.id) }),
    onDragOver: ({ active, over }) =>
      over ? t('reorder.movedTo', { title: titleOf(active.id), place: placeOf(over.id) }) : '',
    onDragEnd: ({ active, over }) =>
      over ? t('reorder.dropped', { title: titleOf(active.id), place: placeOf(over.id) }) : '',
    onDragCancel: ({ active }) => t('reorder.cancelled', { title: titleOf(active.id) }),
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    // Ids are the entries' own keys; looking them up keeps the MediaKey type.
    const moved = entries.find((e) => e.key === active.id)
    const target = entries.find((e) => e.key === over.id)
    if (moved && target) onReorder(moved.key, target.key)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: t('reorder.instructions') },
      }}
    >
      <SortableContext items={entries.map((e) => e.key)} strategy={verticalListSortingStrategy}>
        <ul className={className}>
          {entries.map((entry, index) => (
            <SortableRow key={entry.key} entry={entry}>
              {(handle) => renderItem(entry, handle, index + 1)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

function SortableRow({
  entry,
  children,
}: {
  entry: LibraryEntry
  children: (handle: React.ReactNode) => React.ReactNode
}) {
  const { t } = useTranslation('library')
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.key })

  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className={styles.handle}
      aria-label={t('reorder.handle', { title: entry.title })}
      {...attributes}
      {...listeners}
    >
      <Icon name="grip" size={20} />
    </button>
  )

  return (
    <li
      ref={setNodeRef}
      className={cx(styles.row, isDragging && styles.dragging)}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      {children(handle)}
    </li>
  )
}
