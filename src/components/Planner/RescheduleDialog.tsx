import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import styles from './Planner.module.css'
import type { PlanSession } from '../../types/plan'
import { bySchedule, unitsLabel } from '../../utils/schedule'
import Banner from '../../shared/ui/Banner/Banner'
import Button from '../../shared/ui/Button/Button'
import Checkbox from '../../shared/ui/Checkbox/Checkbox'
import DatePicker from '../DatePicker/DatePicker'
import Dialog from '../../shared/ui/Dialog/Dialog'
import SelectField from '../../shared/ui/SelectField/SelectField'
import { endTimeOf, findConflicts } from '../../utils/conflicts'
import { timeOptions } from '../../utils/planner'
import { useBookedSessions, usePlans } from '../../hooks/usePlanner'

interface RescheduleDialogProps {
  session: PlanSession
  sessions: PlanSession[]
  today: string
  onMove: (date: string, shiftLater: boolean, time: string) => Promise<void>
  onClose: () => void
}

/** Pick a new day and time; optionally move every later pending session by the same number of days. */
export default function RescheduleDialog({
  session,
  sessions,
  today,
  onMove,
  onClose,
}: RescheduleDialogProps) {
  const { t } = useTranslation(['planner', 'common'])
  const [date, setDate] = useState(session.date < today ? today : session.date)
  const [time, setTime] = useState(session.time)
  const [shiftLater, setShiftLater] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const later = sessions.filter(
    (s) => s.status === 'pending' && s.id !== session.id && bySchedule(s, session) > 0,
  ).length
  const marked = sessions
    .filter((s) => s.id !== session.id && s.status !== 'skipped')
    .map((s) => s.date)

  // The other evenings already taken, by any of my plans (only while this dialog is open).
  const plans = usePlans()
  const bookings = useBookedSessions(plans.plans)
  const overlaps = findConflicts(
    { date, time, minutes: session.minutes },
    bookings,
    `${session.planId}/${session.id}`,
  )

  async function move() {
    setSaving(true)
    setError(null)
    try {
      await onMove(date, shiftLater && later > 0, time)
      onClose()
    } catch (e) {
      setSaving(false)
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Dialog
      open
      onClose={() => !saving && onClose()}
      title={t('move.title', { units: unitsLabel(session.units) })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="primary"
            loading={saving}
            disabled={date === session.date && time === session.time}
            onClick={() => void move()}
          >
            {t('move.submit')}
          </Button>
        </>
      }
    >
      <DatePicker
        label={t('move.date')}
        value={date}
        onChange={setDate}
        today={today}
        min={today}
        marked={marked}
      />
      <SelectField
        label={t('schedule.time')}
        value={time}
        options={timeOptions(time)}
        onChange={setTime}
      />
      {overlaps.length > 0 && (
        <Banner tone="warning" icon="alert">
          <ul className={styles.overlaps}>
            {overlaps.slice(0, 3).map((booking) => (
              <li key={booking.id}>
                {t('move.overlap', {
                  title: booking.title,
                  from: booking.time,
                  to: endTimeOf(booking),
                })}
              </li>
            ))}
          </ul>
        </Banner>
      )}
      {later > 0 && (
        <Checkbox
          label={t('move.shift', { sessions: t('common:count.sessions', { count: later }) })}
          checked={shiftLater}
          onChange={setShiftLater}
        />
      )}
      {error && (
        <Banner tone="warning" icon="alert">
          {error}
        </Banner>
      )}
    </Dialog>
  )
}
