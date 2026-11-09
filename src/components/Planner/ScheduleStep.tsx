import { useTranslation } from 'react-i18next'
import { useId } from 'react'
import type { ScheduleOptions } from '../../types/plan'
import DatePicker from '../DatePicker/DatePicker'
import Icon from '../../shared/ui/Icon/Icon'
import SelectField from '../../shared/ui/SelectField/SelectField'
import WeekdayToggle from '../WeekdayToggle/WeekdayToggle'
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
          onChange={(weekdays) => set({ weekdays })}
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
      </div>
    </div>
  )
}
