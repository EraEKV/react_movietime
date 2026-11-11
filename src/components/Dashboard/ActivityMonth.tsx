import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import IconButton from '../../shared/ui/IconButton/IconButton'
import { cx } from '../../shared/lib/cx'
import {
  addDays,
  formatDay,
  formatMonth,
  monthKey,
  monthOf,
  shiftMonth,
  weekdayOf,
  weekdayShort,
  WEEK_ORDER,
  type MonthRef,
} from '../../utils/calendar'
import type { PlannedSession } from '../../types/plan'
import { activityLevel, sessionsByDay } from '../../utils/stats'
import styles from './Dashboard.module.css'

/**
 * A month of watched sessions as GitHub-style tiles: one tile per day, shade = sessions
 * that day against the busiest day of the month. Arrows switch months (not past the
 * current one). Tiles are buttons with the day and count as their name; the line under
 * the grid shows the hovered, focused or tapped day (or the month's total). The grid is
 * one tab stop; arrow keys move between days.
 */
export default function ActivityMonth({
  sessions,
  today,
}: {
  sessions: PlannedSession[]
  today: string
}) {
  const { t } = useTranslation(['dashboard', 'common'])
  const current = monthOf(today)
  const [month, setMonth] = useState<MonthRef>(current)
  const [active, setActive] = useState<string | null>(null)
  const [focusDay, setFocusDay] = useState<string | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const days = useMemo(() => sessionsByDay(sessions, month, today), [sessions, month, today])
  const max = Math.max(0, ...days.map((d) => d.count))
  const total = days.reduce((sum, d) => sum + d.count, 0)
  const counts = new Map(days.map((d) => [d.day, d.count]))
  const offset = (WEEK_ORDER.indexOf(weekdayOf(days[0]?.day ?? today)) + 7) % 7
  const atCurrent = monthKey(month) === monthKey(current)

  // The one tab stop: the chosen day, else today (this month) or the 1st.
  const stop =
    focusDay && counts.has(focusDay) ? focusDay : atCurrent ? today : (days[0]?.day ?? today)

  const goMonth = (by: number) => {
    setMonth((m) => shiftMonth(m, by))
    setActive(null)
    setFocusDay(null)
  }

  const label = (day: string, count: number) =>
    t('chart.sessions', {
      day: formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' }),
      count,
    })

  function onKey(event: KeyboardEvent<HTMLButtonElement>, day: string) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key]
    if (step === undefined) return
    event.preventDefault()
    const next = addDays(day, step)
    if (!counts.has(next)) return
    setFocusDay(next)
    setActive(next)
    gridRef.current?.querySelector<HTMLElement>(`[data-day="${next}"]`)?.focus()
  }

  const shown = active && counts.has(active) ? active : null
  const caption = shown
    ? label(shown, counts.get(shown) ?? 0)
    : t('chart.sessions', { day: formatMonth(month), count: total })

  return (
    <div className={styles.activity}>
      <div className={styles.monthSwitch}>
        <IconButton
          icon="chevron-left"
          size="sm"
          label={t('common:calendar.previousMonth')}
          onClick={() => goMonth(-1)}
        />
        <h3 className={styles.monthName} aria-live="polite">
          {formatMonth(month)}
        </h3>
        <IconButton
          icon="chevron-right"
          size="sm"
          label={t('common:calendar.nextMonth')}
          disabled={atCurrent}
          onClick={() => goMonth(1)}
        />
      </div>
      <div className={styles.tileHead} aria-hidden="true">
        {WEEK_ORDER.map((d) => (
          <span key={d}>{weekdayShort(d)}</span>
        ))}
      </div>
      <div ref={gridRef} className={styles.tiles} role="group" aria-label={formatMonth(month)}>
        {Array.from({ length: offset }, (_, i) => (
          <span key={`gap${i}`} aria-hidden="true" />
        ))}
        {days.map(({ day, count }) => (
          <button
            key={day}
            type="button"
            data-day={day}
            data-level={activityLevel(count, max)}
            className={cx(styles.tile, day === today && styles.tileToday)}
            tabIndex={day === stop ? 0 : -1}
            aria-label={label(day, count)}
            onMouseEnter={() => setActive(day)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => {
              setFocusDay(day)
              setActive(day)
            }}
            onBlur={() => setActive(null)}
            onClick={() => setActive(day)}
            onKeyDown={(e) => onKey(e, day)}
          >
            <span aria-hidden="true">{Number(day.slice(8))}</span>
          </button>
        ))}
      </div>
      <p className={styles.tileCaption} aria-hidden="true">
        {caption}
      </p>
    </div>
  )
}
