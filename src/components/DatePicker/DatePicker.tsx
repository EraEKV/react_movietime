import { useTranslation } from 'react-i18next'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import {
  addDays,
  formatDay,
  formatMonth,
  monthGrid,
  monthOf,
  shiftMonth,
  WEEK_ORDER,
  weekdayShort,
} from '../../utils/calendar'
import { cx } from '../../shared/lib/cx'
import IconButton from '../../shared/ui/IconButton/IconButton'
import styles from './DatePicker.module.css'

interface DatePickerProps {
  value: string
  onChange: (day: string) => void
  today: string
  /** Days before it are disabled. */
  min?: string
  /** Days with other sessions get a dot. */
  marked?: string[]
  label: string
}

const KEY_STEP: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
}

/**
 * Inline month picker (plan start, rescheduling). One Tab stop: arrow keys move between
 * days (and across months), Enter or Space picks — the "roving tabindex" pattern.
 */
export default function DatePicker({
  value,
  onChange,
  today,
  min,
  marked = [],
  label,
}: DatePickerProps) {
  const { t } = useTranslation()
  const [month, setMonth] = useState(() => monthOf(value || today))
  const [focused, setFocused] = useState(value || today)
  // Set by arrow keys: focus follows the roving day after the next render.
  const moveFocus = useRef(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const days = monthGrid(month)
  const marks = new Set(marked)
  const disabled = (day: string) => monthOf(day).month !== month.month || (min ? day < min : false)

  // After an arrow key, focus follows the roving day (it may be in a newly shown month).
  useEffect(() => {
    if (!moveFocus.current) return
    moveFocus.current = false
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focused}"]`)?.focus()
  }, [focused, month])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = KEY_STEP[event.key]
    if (step === undefined) return
    event.preventDefault()
    const next = addDays(focused, step)
    if (min && next < min) return
    const nextMonth = monthOf(next)
    if (nextMonth.month !== month.month || nextMonth.year !== month.year) setMonth(nextMonth)
    setFocused(next)
    moveFocus.current = true
  }

  // The focusable day: the roving one if it's on screen, else the first enabled day.
  const tabDay =
    days.includes(focused) && !disabled(focused) ? focused : days.find((d) => !disabled(d))

  return (
    <div className={styles.picker} role="group" aria-label={label}>
      <div className={styles.header}>
        <IconButton
          icon="chevron-left"
          size="sm"
          label={t('calendar.previousMonth')}
          onClick={() => setMonth(shiftMonth(month, -1))}
        />
        <span aria-live="polite">{formatMonth(month)}</span>
        <IconButton
          icon="chevron-right"
          size="sm"
          label={t('calendar.nextMonth')}
          onClick={() => setMonth(shiftMonth(month, 1))}
        />
      </div>
      <div className={styles.grid} ref={gridRef} onKeyDown={handleKeyDown}>
        {WEEK_ORDER.map((d) => (
          <span key={d} className={styles.weekday} aria-hidden="true">
            {weekdayShort(d).slice(0, 2)}
          </span>
        ))}
        {days.map((day) => {
          const off = disabled(day)
          const outside = monthOf(day).month !== month.month
          return (
            <button
              key={day}
              type="button"
              data-day={day}
              className={cx(
                styles.day,
                day === today && styles.today,
                marks.has(day) && styles.marked,
              )}
              disabled={off}
              tabIndex={day === tabDay ? 0 : -1}
              aria-pressed={day === value}
              aria-label={[
                formatDay(day, { weekday: 'long', month: 'long', day: 'numeric' }),
                day === today && t('calendar.today'),
                marks.has(day) && t('calendar.hasSession'),
              ]
                .filter(Boolean)
                .join(', ')}
              onClick={() => {
                setFocused(day)
                onChange(day)
              }}
              // Days of the neighbouring months keep their place in the grid but stay empty.
              style={outside ? { visibility: 'hidden' } : undefined}
            >
              {Number(day.slice(8))}
            </button>
          )
        })}
      </div>
    </div>
  )
}
