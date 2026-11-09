import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useListAuthor } from '../../hooks/useLists'
import { loadPlannerService, usePlans } from '../../hooks/usePlanner'
import type { LibraryMedia } from '../../types/library'
import { localToday } from '../../utils/calendar'
import { offlineMessage } from '../../utils/listErrors'
import { moviePlanDraft, nextPlanColor, planErrorMessage, timeOptions } from '../../utils/planner'
import Banner from '../../shared/ui/Banner/Banner'
import Button from '../../shared/ui/Button/Button'
import DatePicker from '../DatePicker/DatePicker'
import Dialog from '../../shared/ui/Dialog/Dialog'
import SelectField from '../../shared/ui/SelectField/SelectField'
import styles from './Planner.module.css'

interface PlanMovieDialogProps {
  media: LibraryMedia
  onClose: () => void
}

/**
 * One movie on one evening: pick a day and a time, done. No recurrence and no stepper —
 * the session lands in the calendar, where it can be dragged to another day.
 */
export default function PlanMovieDialog({ media, onClose }: PlanMovieDialogProps) {
  const { t } = useTranslation(['planner', 'common'])
  const navigate = useNavigate()
  const author = useListAuthor()
  const plans = usePlans()
  const today = localToday()
  const [date, setDate] = useState(today)
  const [time, setTime] = useState('21:00')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create() {
    if (!author) return
    if (!navigator.onLine) return setError(offlineMessage())
    setSaving(true)
    setError(null)
    try {
      const service = await loadPlannerService()
      const id = await service.createPlan(
        author,
        moviePlanDraft(media, date, time),
        nextPlanColor(plans.plans ?? []),
      )
      navigate(`/planner/${id}`, {
        state: { notice: t('movie.created', { title: media.title }) },
      })
    } catch (e) {
      setSaving(false)
      setError(planErrorMessage(e))
    }
  }

  return (
    <Dialog
      open
      onClose={() => !saving && onClose()}
      title={t('movie.title', { title: media.title })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t('common:actions.cancel')}
          </Button>
          <Button variant="primary" icon="calendar" loading={saving} onClick={() => void create()}>
            {t('movie.submit')}
          </Button>
        </>
      }
    >
      <div className={styles.stack}>
        <DatePicker
          label={t('movie.date')}
          value={date}
          onChange={setDate}
          today={today}
          min={today}
        />
        <SelectField
          label={t('schedule.time')}
          value={time}
          options={timeOptions(time)}
          onChange={setTime}
        />
        {error && (
          <Banner tone="warning" icon="alert">
            {error}
          </Banner>
        )}
      </div>
    </Dialog>
  )
}
