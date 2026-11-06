import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import type { PlanSession } from '../../types/plan'
import { bySchedule, unitsLabel } from '../../utils/schedule'
import Banner from '../Banner/Banner'
import Button from '../Button/Button'
import Checkbox from '../Checkbox/Checkbox'
import DatePicker from '../DatePicker/DatePicker'
import Dialog from '../Dialog/Dialog'

interface RescheduleDialogProps {
  session: PlanSession
  sessions: PlanSession[]
  today: string
  onMove: (date: string, shiftLater: boolean) => Promise<void>
  onClose: () => void
}

/** Pick a new day; optionally move every later pending session by the same number of days. */
export default function RescheduleDialog({
  session,
  sessions,
  today,
  onMove,
  onClose,
}: RescheduleDialogProps) {
  const { t } = useTranslation(['planner', 'common'])
  const [date, setDate] = useState(session.date < today ? today : session.date)
  const [shiftLater, setShiftLater] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const later = sessions.filter(
    (s) => s.status === 'pending' && s.id !== session.id && bySchedule(s, session) > 0,
  ).length
  const marked = sessions
    .filter((s) => s.id !== session.id && s.status !== 'skipped')
    .map((s) => s.date)

  async function move() {
    setSaving(true)
    setError(null)
    try {
      await onMove(date, shiftLater && later > 0)
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
            disabled={date === session.date}
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
