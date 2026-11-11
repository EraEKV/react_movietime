import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { cx } from '../../shared/lib/cx'
import { addDays, formatDay, monthKey, weekdayShort, WEEK_ORDER } from '../../utils/calendar'
import type { PlannedSession } from '../../types/plan'
import { activityLevel, activityWeeks, countSessionsByDay, monthLabels } from '../../utils/stats'
import styles from './Dashboard.module.css'

/**
 * The last year of watched sessions in the layout of a contribution graph: one column per
 * week (Monday on top), month names above, Mon/Wed/Fri on the left, shade = sessions that
 * day against the busiest day, a Less → More legend below. Tiles are buttons named by
 * day and count; the line under the graph shows the hovered, focused or tapped day (or the
 * year's total). One tab stop, arrow keys move by day (up/down) and week (left/right).
 */
export default function ActivityYear({
  sessions,
  today,
}: {
  sessions: PlannedSession[]
  today: string
}) {
  const { t } = useTranslation('dashboard')
  const weeks = useMemo(() => activityWeeks(today), [today])
  const first = weeks[0]?.[0] ?? today
  const counts = useMemo(() => countSessionsByDay(sessions, first, today), [sessions, first, today])
  const labels = useMemo(() => monthLabels(weeks), [weeks])
  const max = Math.max(0, ...counts.values())
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0)

  const [active, setActive] = useState<string | null>(null)
  const [focusDay, setFocusDay] = useState<string | null>(null)
  const stop = focusDay ?? today
  const scroller = useRef<HTMLDivElement>(null)
  const grid = useRef<HTMLDivElement>(null)

  // On a phone the graph is wider than the screen: start at today, the right edge.
  useEffect(() => {
    const box = scroller.current
    if (box) box.scrollLeft = box.scrollWidth
  }, [])

  const inRange = (day: string) => day >= first && day <= today
  const label = (day: string) =>
    t('chart.sessions', {
      day: formatDay(day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      count: counts.get(day) ?? 0,
    })

  function onKey(event: KeyboardEvent<HTMLButtonElement>, day: string) {
    const step = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }[event.key]
    if (step === undefined) return
    event.preventDefault()
    const next = addDays(day, step)
    if (!inRange(next)) return
    setFocusDay(next)
    setActive(next)
    grid.current?.querySelector<HTMLElement>(`[data-day="${next}"]`)?.focus()
  }

  const caption = active
    ? label(active)
    : t('chart.sessions', { day: t('cards.activityLast12'), count: total })

  return (
    <div className={styles.year}>
      <div ref={scroller} className={styles.yearScroll}>
        <div className={styles.yearBox}>
          <div className={styles.yearMonths} aria-hidden="true">
            {labels.map(({ index, month }) => (
              <span key={monthKey(month)} style={{ gridColumn: index + 1 }}>
                {formatDay(`${monthKey(month)}-01`, { month: 'short' })}
              </span>
            ))}
          </div>
          <div className={styles.yearDays} aria-hidden="true">
            {WEEK_ORDER.map((d, i) => (
              <span key={d}>{i % 2 === 0 && i < 6 ? weekdayShort(d) : ''}</span>
            ))}
          </div>
          <div
            ref={grid}
            className={styles.yearGrid}
            role="group"
            aria-label={t('cards.activityLast12')}
          >
            {weeks.flat().map((day) =>
              inRange(day) ? (
                <button
                  key={day}
                  type="button"
                  data-day={day}
                  data-level={activityLevel(counts.get(day) ?? 0, max)}
                  className={cx(styles.tile, styles.cell, day === today && styles.tileToday)}
                  tabIndex={day === stop ? 0 : -1}
                  aria-label={label(day)}
                  onMouseEnter={() => setActive(day)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => {
                    setFocusDay(day)
                    setActive(day)
                  }}
                  onBlur={() => setActive(null)}
                  onClick={() => setActive(day)}
                  onKeyDown={(e) => onKey(e, day)}
                />
              ) : (
                <span key={day} aria-hidden="true" />
              ),
            )}
          </div>
        </div>
      </div>
      <div className={styles.yearFoot}>
        <p className={styles.tileCaption} aria-hidden="true">
          {caption}
        </p>
        <div className={styles.legendScale} aria-hidden="true">
          <span>{t('cards.activityLess')}</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <i key={level} className={cx(styles.tile, styles.cell)} data-level={level} />
          ))}
          <span>{t('cards.activityMore')}</span>
        </div>
      </div>
    </div>
  )
}
