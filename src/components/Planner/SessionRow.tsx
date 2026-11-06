import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import type { PlanSession } from '../../types/plan'
import { daysBetween, formatDay, relativeDay } from '../../utils/calendar'
import { cx } from '../../shared/lib/cx'
import { formatRuntime } from '../../shared/lib/format'
import { unitsLabel } from '../../utils/schedule'
import Badge from '../../shared/ui/Badge/Badge'
import Button from '../../shared/ui/Button/Button'
import IconButton from '../../shared/ui/IconButton/IconButton'
import styles from './SessionRow.module.css'

interface SessionRowProps {
  session: PlanSession
  today: string
  /** Owner or editor: the actions are shown. */
  editable: boolean
  /** A skip can't be undone once its copy at the end was watched. */
  canUndo: boolean
  ownUid: string | null
  onComplete: () => Promise<void>
  onSkip: () => Promise<void>
  onUndo: () => Promise<void>
  onReschedule: () => void
}

/** One session on the plan page: when, what, status, and what you can do with it. */
export default function SessionRow({
  session,
  today,
  editable,
  canUndo,
  ownUid,
  onComplete,
  onSkip,
  onUndo,
  onReschedule,
}: SessionRowProps) {
  const { t } = useTranslation(['planner', 'common'])
  const [busy, setBusy] = useState<'complete' | 'skip' | 'undo' | null>(null)
  const isToday = session.date === today
  const by = session.doneBy && (session.doneBy.uid === ownUid ? t('you') : session.doneBy.name)
  const single = session.units.length === 1 ? session.units[0] : undefined

  // The row stays mounted while the batch runs; the snapshot then changes its status.
  const run = (kind: 'complete' | 'skip' | 'undo', action: () => Promise<void>) => {
    setBusy(kind)
    void action().finally(() => setBusy(null))
  }

  const day = relativeDay(session.date, today)
  const date = formatDay(session.date, { weekday: 'short', month: 'short', day: 'numeric' })
  const diff = daysBetween(today, session.date)
  const when = isToday
    ? t('row.tonight', { date })
    : Math.abs(diff) === 1
      ? t('row.relative', { day, date })
      : day

  return (
    <li
      id={`session-${session.id}`}
      className={cx(
        styles.row,
        isToday && styles.today,
        session.status === 'skipped' && styles.skipped,
      )}
    >
      <div className={styles.when}>
        <strong>{when}</strong>
        <span className={styles.muted}>
          {[session.time, formatRuntime(session.minutes)].filter(Boolean).join(' · ')}
        </span>
      </div>
      <div className={styles.what}>
        <span className={styles.units}>{unitsLabel(session.units)}</span>
        {single && single.season !== null && <span className={styles.muted}>{single.title}</span>}
      </div>
      <div className={styles.status}>
        {session.status === 'done' ? (
          <Badge icon="check" tone="success">
            {by ? t('row.watchedBy', { name: by }) : t('row.watched')}
          </Badge>
        ) : session.status === 'skipped' ? (
          <Badge icon="skip">{by ? t('row.skippedBy', { name: by }) : t('row.skipped')}</Badge>
        ) : session.date < today ? (
          <Badge icon="clock">{t('row.missed')}</Badge>
        ) : (
          <Badge icon="clock">{t('row.pending')}</Badge>
        )}
      </div>
      {editable && (
        <div className={styles.actions}>
          {session.status === 'pending' ? (
            <>
              <Button
                size="sm"
                variant={isToday ? 'primary' : 'secondary'}
                icon="check"
                loading={busy === 'complete'}
                disabled={busy !== null}
                onClick={() => run('complete', onComplete)}
              >
                {t('row.mark')}
              </Button>
              <IconButton
                size="sm"
                icon="calendar"
                label={t('row.reschedule', { units: unitsLabel(session.units) })}
                disabled={busy !== null}
                onClick={onReschedule}
              />
              <IconButton
                size="sm"
                icon="skip"
                label={t('row.skip', { units: unitsLabel(session.units) })}
                disabled={busy !== null}
                onClick={() => run('skip', onSkip)}
              />
            </>
          ) : (
            canUndo && (
              <Button
                size="sm"
                variant="ghost"
                icon="undo"
                aria-label={t(session.status === 'done' ? 'row.undoWatched' : 'row.undoSkip', {
                  units: unitsLabel(session.units),
                })}
                loading={busy === 'undo'}
                onClick={() => run('undo', onUndo)}
              >
                {t('common:actions.undo')}
              </Button>
            )
          )}
        </div>
      )}
    </li>
  )
}
