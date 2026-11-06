import { useId } from 'react'
import type { ScheduleOptions } from '../../types/plan'
import DatePicker from '../DatePicker/DatePicker'
import Icon from '../Icon/Icon'
import SelectField from '../SelectField/SelectField'
import WeekdayToggle from '../WeekdayToggle/WeekdayToggle'
import styles from './Planner.module.css'

/** 18:00 … 23:30 every half hour, plus the current value if it's something else. */
function timeOptions(current: string) {
  const times: string[] = []
  for (let h = 17; h <= 23; h++) times.push(`${h}:00`, `${h}:30`)
  if (!times.includes(current)) times.push(current)
  return times.toSorted().map((t) => ({ value: t, label: t }))
}

interface ScheduleStepProps {
  kind: 'series' | 'list'
  options: ScheduleOptions
  onChange: (options: ScheduleOptions) => void
  today: string
}

/** Step 3: start date, weekdays, time, episodes per session. */
export default function ScheduleStep({ kind, options, onChange, today }: ScheduleStepProps) {
  const errorId = useId()
  const set = (changes: Partial<ScheduleOptions>) => onChange({ ...options, ...changes })
  const noDays = options.weekdays.length === 0

  return (
    <div className={styles.schedule}>
      <div className={styles.stack}>
        <span className={styles.fieldLabel} aria-hidden="true">
          Start date
        </span>
        <DatePicker
          label="Start date"
          value={options.startDate}
          onChange={(startDate) => set({ startDate })}
          today={today}
          min={today}
        />
      </div>
      <div className={styles.stack}>
        <WeekdayToggle
          legend="Watch on"
          value={options.weekdays}
          onChange={(weekdays) => set({ weekdays })}
          errorId={noDays ? errorId : undefined}
        />
        {noDays && (
          <p id={errorId} className={styles.error} role="alert">
            <Icon name="alert" size={16} />
            Pick at least one weekday.
          </p>
        )}
        <div className={styles.row}>
          <SelectField
            label="Time"
            value={options.time}
            options={timeOptions(options.time)}
            onChange={(time) => set({ time })}
          />
          {kind === 'series' && (
            <SelectField
              label="Episodes per session"
              value={String(options.perSession)}
              options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))}
              onChange={(value) => set({ perSession: Number(value) })}
            />
          )}
        </div>
      </div>
    </div>
  )
}
