import { useState } from 'react'
import type { PlanSession } from '../../types/plan'
import { formatDay, relativeDay } from '../../utils/calendar'
import { cx } from '../../utils/cx'
import { formatRuntime } from '../../utils/format'
import { unitsLabel } from '../../utils/schedule'
import Badge from '../Badge/Badge'
import Button from '../Button/Button'
import IconButton from '../IconButton/IconButton'
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
  const [busy, setBusy] = useState<'complete' | 'skip' | 'undo' | null>(null)
  const isToday = session.date === today
  const by = session.doneBy && (session.doneBy.uid === ownUid ? 'you' : session.doneBy.name)
  const single = session.units.length === 1 ? session.units[0] : undefined

  // The row stays mounted while the batch runs; the snapshot then changes its status.
  const run = (kind: 'complete' | 'skip' | 'undo', action: () => Promise<void>) => {
    setBusy(kind)
    void action().finally(() => setBusy(null))
  }

  const day = relativeDay(session.date, today)
  const when =
    day === 'Today'
      ? `Tonight · ${formatDay(session.date, { weekday: 'short', month: 'short', day: 'numeric' })}`
      : day === 'Tomorrow' || day === 'Yesterday'
        ? `${day} · ${formatDay(session.date, { weekday: 'short', month: 'short', day: 'numeric' })}`
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
            Watched{by ? ` · marked by ${by}` : ''}
          </Badge>
        ) : session.status === 'skipped' ? (
          <Badge icon="skip">Skipped{by ? ` by ${by}` : ''}</Badge>
        ) : session.date < today ? (
          <Badge icon="clock">Missed?</Badge>
        ) : (
          <Badge icon="clock">Pending</Badge>
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
                Mark watched
              </Button>
              <IconButton
                size="sm"
                icon="calendar"
                label={`Reschedule ${unitsLabel(session.units)}`}
                disabled={busy !== null}
                onClick={onReschedule}
              />
              <IconButton
                size="sm"
                icon="skip"
                label={`Skip ${unitsLabel(session.units)}`}
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
                loading={busy === 'undo'}
                onClick={() => run('undo', onUndo)}
              >
                Undo
              </Button>
            )
          )}
        </div>
      )}
    </li>
  )
}
