import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import SegmentedControl from '../../shared/ui/SegmentedControl/SegmentedControl'
import type { PlannedSession } from '../../types/plan'
import ActivityMonth from './ActivityMonth'
import ActivityYear from './ActivityYear'
import styles from './Dashboard.module.css'

type View = 'year' | 'month'

/** Watched sessions as day tiles: the last year (default) or one month at a time. */
export default function ActivityCalendar({
  sessions,
  today,
}: {
  sessions: PlannedSession[]
  today: string
}) {
  const { t } = useTranslation('dashboard')
  const [view, setView] = useState<View>('year')
  return (
    <div className={styles.activityRoot}>
      <SegmentedControl
        label={t('cards.activity')}
        value={view}
        onChange={setView}
        options={[
          { value: 'year', label: t('cards.activityYear') },
          { value: 'month', label: t('cards.activityMonth') },
        ]}
      />
      {view === 'year' ? (
        <ActivityYear sessions={sessions} today={today} />
      ) : (
        <ActivityMonth sessions={sessions} today={today} />
      )}
    </div>
  )
}
