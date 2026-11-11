import { useTranslation } from 'react-i18next'
import SelectField from '../../shared/ui/SelectField/SelectField'
import TextField from '../../shared/ui/TextField/TextField'
import { timeOptions } from '../../utils/planner'
import DatePicker from '../DatePicker/DatePicker'
import styles from './Planner.module.css'

interface MovieWhenStepProps {
  title: string
  onTitleChange: (title: string) => void
  titleError: string | null
  date: string
  onDateChange: (date: string) => void
  time: string
  onTimeChange: (time: string) => void
  today: string
}

/** Step 2 of a one-film plan: the evening, the time and the plan's name. No schedule to build. */
export default function MovieWhenStep({
  title,
  onTitleChange,
  titleError,
  date,
  onDateChange,
  time,
  onTimeChange,
  today,
}: MovieWhenStepProps) {
  const { t } = useTranslation('planner')
  return (
    <div className={styles.stack}>
      <DatePicker
        label={t('movie.date')}
        value={date}
        onChange={onDateChange}
        today={today}
        min={today}
      />
      <SelectField
        label={t('schedule.time')}
        value={time}
        options={timeOptions(time)}
        onChange={onTimeChange}
      />
      <TextField
        label={t('preview.name')}
        value={title}
        onChange={onTitleChange}
        maxLength={120}
        error={titleError}
      />
    </div>
  )
}
