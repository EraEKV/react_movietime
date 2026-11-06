import type { Weekday } from '../../types/plan'
import { WEEK_ORDER, weekdayLong, weekdayShort } from '../../utils/calendar'
import styles from './WeekdayToggle.module.css'

interface WeekdayToggleProps {
  legend: string
  value: Weekday[]
  onChange: (days: Weekday[]) => void
  /** id of the error text, so the toggles announce it. */
  errorId?: string
}

/**
 * Seven toggle buttons, Monday first. Values are Date.getDay() numbers (0 = Sunday), the
 * same as stored in the plan, so nothing is converted on save.
 */
export default function WeekdayToggle({ legend, value, onChange, errorId }: WeekdayToggleProps) {
  const toggle = (day: Weekday) =>
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].toSorted())

  return (
    <fieldset className={styles.group} aria-describedby={errorId}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.days}>
        {WEEK_ORDER.map((day) => (
          <button
            key={day}
            type="button"
            className={styles.day}
            aria-pressed={value.includes(day)}
            aria-label={weekdayLong(day)}
            onClick={() => toggle(day)}
          >
            {weekdayShort(day)}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
