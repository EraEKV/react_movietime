import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useTranslation } from 'react-i18next'
import { useState, type ReactNode } from 'react'
import type { PlanColor, SessionStatus } from '../../types/plan'
import { formatDay, monthOf, WEEK_ORDER, weekdayShort, type MonthRef } from '../../utils/calendar'
import { cx } from '../../shared/lib/cx'

import SessionChip from '../SessionChip/SessionChip'
import styles from './CalendarMonth.module.css'

export interface CalendarItem {
  key: string
  date: string
  color: PlanColor
  title: string
  range: string
  time?: string
  status: SessionStatus
  posterPath?: string | null
  to?: string
  /** Can be dragged to another day (pending sessions of plans you may edit). */
  movable?: boolean
}

interface CalendarMonthProps {
  month: MonthRef
  /** Days to show (utils/calendar monthGrid): whole weeks, Monday first. */
  days: string[]
  today: string
  items: CalendarItem[]
  maxPerDay?: number
  /** Dot chips without posters (tablet, previews). */
  compact?: boolean
  /** Smaller day cells for previews. */
  size?: 'md' | 'sm'
  label: string
  /** A chip was dropped on `date`. Without it nothing is draggable. */
  onMove?: (key: string, date: string) => void
}

/**
 * A month grid for the planner. Each day lists up to `maxPerDay` sessions, then "+N more"
 * opens the rest in place. Days are labelled groups ("Friday, November 6, today, 2
 * sessions"), so a screen reader hears the day before its sessions.
 *
 * With `onMove`, pending sessions can be dragged onto another day (mouse or a short touch
 * press). Dragging has no keyboard path here: the plan page's Reschedule does the same.
 */
export default function CalendarMonth({
  month,
  days,
  today,
  items,
  maxPerDay = 2,
  compact = false,
  size = 'md',
  label,
  onMove,
}: CalendarMonthProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  // A few pixels of travel (or a short touch hold) before a drag starts, so a plain click
  // still opens the plan and a touch swipe still scrolls the page.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )
  // Grouped once per render: O(n) instead of filtering all items for each of 42 days.
  const byDay = new Map<string, CalendarItem[]>()
  for (const item of items) byDay.set(item.date, [...(byDay.get(item.date) ?? []), item])
  const itemOf = (key: string | number) => items.find((i) => i.key === key)
  const dayName = (day: string) =>
    formatDay(day, { weekday: 'long', month: 'long', day: 'numeric' })

  const announcements: Announcements = {
    onDragStart: ({ active }) => t('calendar.dragStart', { title: itemOf(active.id)?.title }),
    onDragOver: () => undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? t('calendar.dragEnd', { title: itemOf(active.id)?.title, day: dayName(String(over.id)) })
        : t('calendar.dragCancel', { title: itemOf(active.id)?.title }),
    onDragCancel: ({ active }) => t('calendar.dragCancel', { title: itemOf(active.id)?.title }),
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragging(null)
    const item = itemOf(active.id)
    if (over && item && item.date !== over.id) onMove?.(item.key, String(over.id))
  }

  const dragged = dragging ? itemOf(dragging) : undefined

  const chip = (item: CalendarItem, to = item.to) => (
    <SessionChip
      color={item.color}
      title={item.title}
      range={item.range}
      time={item.time}
      status={item.status}
      posterPath={item.posterPath}
      compact={compact}
      to={to}
    />
  )

  return (
    <DndContext
      sensors={sensors}
      accessibility={{ announcements }}
      onDragStart={({ active }) => setDragging(String(active.id))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div
        className={cx(styles.calendar, size === 'sm' && styles.small)}
        role="group"
        aria-label={label}
      >
        {WEEK_ORDER.map((d) => (
          <div key={d} className={styles.weekday} aria-hidden="true">
            {weekdayShort(d)}
          </div>
        ))}
        {days.map((day) => {
          const list = byDay.get(day) ?? []
          const open = expanded === day
          const shown = open ? list : list.slice(0, maxPerDay)
          const name = [
            dayName(day),
            day === today && t('calendar.today'),
            list.length > 0 && t('count.sessions', { count: list.length }),
          ]
            .filter(Boolean)
            .join(', ')
          return (
            <Day
              key={day}
              day={day}
              name={name}
              outside={monthOf(day).month !== month.month}
              today={day === today}
              // Sessions can't be moved into the past.
              droppable={Boolean(onMove) && day >= today}
            >
              {shown.map((item) =>
                onMove && item.movable ? (
                  <Draggable key={item.key} id={item.key} active={dragging === item.key}>
                    {chip(item)}
                  </Draggable>
                ) : (
                  <div key={item.key}>{chip(item)}</div>
                ),
              )}
              {list.length > maxPerDay && (
                <button
                  type="button"
                  className={styles.more}
                  aria-expanded={open}
                  onClick={() => setExpanded(open ? null : day)}
                >
                  {open
                    ? t('actions.showLess')
                    : t('actions.more', { count: list.length - maxPerDay })}
                </button>
              )}
            </Day>
          )
        })}
      </div>
      <DragOverlay>{dragged ? chip(dragged, undefined) : null}</DragOverlay>
    </DndContext>
  )
}

/** One day cell; a drop target when sessions may land on it. */
function Day({
  day,
  name,
  outside,
  today,
  droppable,
  children,
}: {
  day: string
  name: string
  outside: boolean
  today: boolean
  droppable: boolean
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: day, disabled: !droppable })
  return (
    <div
      ref={setNodeRef}
      role="group"
      aria-label={name}
      className={cx(
        styles.day,
        outside && styles.outside,
        today && styles.today,
        isOver && styles.over,
      )}
    >
      <span className={styles.number} aria-hidden="true">
        {Number(day.slice(8))}
      </span>
      {children}
    </div>
  )
}

/** Wraps a chip so the whole chip is the drag handle; the link inside still works on click. */
function Draggable({ id, active, children }: { id: string; active: boolean; children: ReactNode }) {
  const { setNodeRef, listeners } = useDraggable({ id })
  return (
    <div ref={setNodeRef} {...listeners} className={cx(styles.draggable, active && styles.lifted)}>
      {children}
    </div>
  )
}
