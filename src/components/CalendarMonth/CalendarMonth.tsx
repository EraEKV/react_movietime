import { useState } from 'react'
import type { PlanColor, SessionStatus } from '../../types/plan'
import { formatDay, monthOf, WEEK_ORDER, weekdayShort, type MonthRef } from '../../utils/calendar'
import { cx } from '../../utils/cx'
import { pluralize } from '../../utils/format'
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
}

/**
 * A month grid for the planner. Each day lists up to `maxPerDay` sessions, then "+N more"
 * opens the rest in place. Days are labelled groups ("Friday, November 6, today, 2
 * sessions"), so a screen reader hears the day before its sessions.
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
}: CalendarMonthProps) {
  const [expanded, setExpanded] = useState<string | null>(null)
  // Grouped once per render: O(n) instead of filtering all items for each of 42 days.
  const byDay = new Map<string, CalendarItem[]>()
  for (const item of items) byDay.set(item.date, [...(byDay.get(item.date) ?? []), item])

  return (
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
        const outside = monthOf(day).month !== month.month
        const open = expanded === day
        const shown = open ? list : list.slice(0, maxPerDay)
        const name = [
          formatDay(day, { weekday: 'long', month: 'long', day: 'numeric' }),
          day === today && 'today',
          list.length > 0 && pluralize(list.length, 'session'),
        ]
          .filter(Boolean)
          .join(', ')
        return (
          <div
            key={day}
            role="group"
            aria-label={name}
            className={cx(styles.day, outside && styles.outside, day === today && styles.today)}
          >
            <span className={styles.number} aria-hidden="true">
              {Number(day.slice(8))}
            </span>
            {shown.map((item) => (
              <SessionChip
                key={item.key}
                color={item.color}
                title={item.title}
                range={item.range}
                time={item.time}
                status={item.status}
                posterPath={item.posterPath}
                compact={compact}
                to={item.to}
              />
            ))}
            {list.length > maxPerDay && (
              <button
                type="button"
                className={styles.more}
                aria-expanded={open}
                onClick={() => setExpanded(open ? null : day)}
              >
                {open ? 'Show less' : `+${list.length - maxPerDay} more`}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
