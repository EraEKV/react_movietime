import { useTranslation } from 'react-i18next'
import { useId, useState } from 'react'
import type { ScheduleOptions, Weekday } from '../../types/plan'
import Button from '../../shared/ui/Button/Button'
import DatePicker from '../DatePicker/DatePicker'
import Icon from '../../shared/ui/Icon/Icon'
import SelectField from '../../shared/ui/SelectField/SelectField'
import WeekdayToggle from '../WeekdayToggle/WeekdayToggle'
import { WEEK_ORDER, weekdayLong } from '../../utils/calendar'
import { timeOptions } from '../../utils/planner'
import styles from './Planner.module.css'

interface ScheduleStepProps {
  kind: 'series' | 'list'
  options: ScheduleOptions
  onChange: (options: ScheduleOptions) => void
  today: string
}

/** Step 3: start date, weekdays, time, episodes per session. */
export default function ScheduleStep({ kind, options, onChange, today }: ScheduleStepProps) {
  const { t } = useTranslation('planner')
  const errorId = useId()
  const set = (changes: Partial<ScheduleOptions>) => onChange({ ...options, ...changes })
  const noDays = options.weekdays.length === 0
  const [ownTimes, setOwnTimes] = useState(Object.keys(options.times ?? {}).length > 0)
  const days = WEEK_ORDER.filter((day) => options.weekdays.includes(day))

  // A weekday that matches the usual time needs no entry of its own.
  function setDayTime(day: Weekday, time: string) {
    const { [day]: _, ...rest } = options.times ?? {}
    const times = time === options.time ? rest : { ...rest, [day]: time }
    onChange({ ...options, ...(Object.keys(times).length > 0 ? { times } : { times: undefined }) })
  }

  function toggleOwnTimes() {
    if (ownTimes) onChange({ ...options, times: undefined })
    setOwnTimes(!ownTimes)
  }

  return (
    <div className={styles.schedule}>
      <div className={styles.stack}>
        <span className={styles.fieldLabel} aria-hidden="true">
          {t('schedule.startDate')}
        </span>
        <DatePicker
          label={t('schedule.startDate')}
          value={options.startDate}
          onChange={(startDate) => set({ startDate })}
          today={today}
          min={today}
        />
      </div>
      <div className={styles.stack}>
        <WeekdayToggle
          legend={t('schedule.watchOn')}
          value={options.weekdays}
          onChange={(weekdays) => {
            const times = Object.fromEntries(
              Object.entries(options.times ?? {}).filter(([day]) =>
                weekdays.includes(Number(day) as Weekday),
              ),
            )
            set({ weekdays, times: Object.keys(times).length > 0 ? times : undefined })
          }}
          errorId={noDays ? errorId : undefined}
        />
        {noDays && (
          <p id={errorId} className={styles.error} role="alert">
            <Icon name="alert" size={16} />
            {t('problem.weekdays')}
          </p>
        )}
        <div className={styles.row}>
          <SelectField
            label={t('schedule.time')}
            value={options.time}
            options={timeOptions(options.time)}
            onChange={(time) => set({ time })}
          />
          {kind === 'series' && (
            <SelectField
              label={t('schedule.perSession')}
              value={String(options.perSession)}
              options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))}
              onChange={(value) => set({ perSession: Number(value) })}
            />
          )}
        </div>
        {days.length > 1 && (
          <>
            <Button
              variant="ghost"
              aria-expanded={ownTimes}
              onClick={toggleOwnTimes}
              className={styles.ownTimes}
            >
              {ownTimes ? t('schedule.sameTime') : t('schedule.ownTimes')}
            </Button>
            {ownTimes && (
              <div className={styles.row}>
                {days.map((day) => (
                  <SelectField
                    key={day}
                    label={weekdayLong(day)}
                    value={options.times?.[day] ?? options.time}
                    options={timeOptions(options.times?.[day] ?? options.time)}
                    onChange={(time) => setDayTime(day, time)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
