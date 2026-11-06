import type { Bar } from '../../utils/stats'
import { weekdayLong } from '../../utils/calendar'
import type { Weekday } from '../../types/plan'
import { cx } from '../../shared/lib/cx'
import styles from './Dashboard.module.css'

interface WeekdayColumnsProps {
  days: Bar<`${Weekday}`>[]
  /** Today's weekday, marked under its column. */
  today: Weekday
}

/**
 * Watched sessions per weekday as columns, Monday first. A list, so a screen reader reads
 * "Monday, 3 sessions" for each day; the columns are decoration for sighted users.
 */
export default function WeekdayColumns({ days, today }: WeekdayColumnsProps) {
  const max = Math.max(1, ...days.map((d) => d.count))
  return (
    <ul className={styles.columns}>
      {days.map((day) => {
        const weekday = Number(day.value) as Weekday // values are built from Weekday numbers
        const isToday = weekday === today
        return (
          <li key={day.value} className={cx(styles.column, isToday && styles.today)}>
            <span className="sr-only">
              {`${weekdayLong(weekday)}${isToday ? ' (today)' : ''}: ${day.count} ${day.count === 1 ? 'session' : 'sessions'}`}
            </span>
            <span className={styles.columnValue} aria-hidden="true">
              {day.count}
            </span>
            <span className={styles.columnPlot} aria-hidden="true">
              {day.count > 0 && (
                <span
                  className={styles.columnFill}
                  style={{ height: `${(day.count / max) * 100}%` }}
                />
              )}
            </span>
            <span className={styles.columnLabel} aria-hidden="true">
              {day.label}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
