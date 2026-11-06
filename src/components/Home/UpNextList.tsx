import { useState } from 'react'
import { Link } from 'react-router'
import { imageUrl } from '../../api/tmdb'
import { useAuth } from '../../hooks/useAuth'
import { usePlanActions, useUpcoming } from '../../hooks/usePlanner'
import type { PlannedSession } from '../../types/plan'
import { formatDay, relativeDay } from '../../utils/calendar'
import { formatRuntime } from '../../utils/format'
import {
  canEditSessions,
  planErrorMessage,
  planProgress,
  sessionPoster,
  unitWord,
} from '../../utils/planner'
import { unitsLabel } from '../../utils/schedule'
import { roleOf } from '../../utils/sharing'
import Badge from '../Badge/Badge'
import Button from '../Button/Button'
import ButtonLink from '../ButtonLink/ButtonLink'
import Card from '../Card/Card'
import EmptyState from '../EmptyState/EmptyState'
import ErrorState from '../EmptyState/ErrorState'
import ProgressBar from '../ProgressBar/ProgressBar'
import Skeleton from '../Skeleton/Skeleton'
import styles from './Home.module.css'

const SHOWN = 2

/** Lazy part of "Up next": the planner hooks load only for signed-in users on Home. */
export default function UpNextList() {
  const upcoming = useUpcoming()
  const [error, setError] = useState<string | null>(null)

  if (upcoming.plans.status === 'error' || upcoming.status === 'error') {
    return (
      <Card>
        <ErrorState
          title="We couldn’t load your plans"
          body="Check your connection and try again."
          onRetry={() => {
            upcoming.plans.retry()
            upcoming.retry()
          }}
          headingLevel="h3"
        />
      </Card>
    )
  }
  if (!upcoming.sessions) return <UpNextSkeleton />

  // Still to watch first; a session marked tonight stays visible with its "Watched" state.
  const next = upcoming.sessions
    .filter(
      (s) =>
        s.session.status === 'pending' ||
        (s.session.status === 'done' && s.session.date === upcoming.today),
    )
    .slice(0, SHOWN)

  if (next.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="calendar"
          headingLevel="h3"
          title="Nothing planned tonight"
          body="Plan a series or a movie night, and your next sessions will show up here."
          actions={
            <ButtonLink to="/planner/new" variant="primary" icon="plus">
              Create a plan
            </ButtonLink>
          }
        />
      </Card>
    )
  }

  return (
    <>
      <div className={styles.upNext}>
        {next.map((item, i) => (
          <UpNextCard
            key={item.session.id}
            item={item}
            today={upcoming.today}
            primary={i === 0}
            onError={setError}
          />
        ))}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </>
  )
}

function UpNextCard({
  item: { plan, session },
  today,
  primary,
  onError,
}: {
  item: PlannedSession
  today: string
  primary: boolean
  onError: (message: string | null) => void
}) {
  const { user } = useAuth()
  const actions = usePlanActions()
  const [busy, setBusy] = useState(false)
  const role = roleOf(plan, user)
  const poster = imageUrl(sessionPoster(plan, session.units), 'w154')
  const day = relativeDay(session.date, today)
  const when = `${day === 'Today' ? 'Tonight' : day} · ${session.time}`
  const finish = plan.endDate ? formatDay(plan.endDate, { month: 'short', day: 'numeric' }) : '—'

  async function mark() {
    setBusy(true)
    onError(null)
    try {
      await actions.complete(plan, session)
    } catch (error) {
      onError(planErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className={styles.upNextCard}>
      <Link
        to={`/planner/${plan.id}`}
        className={styles.upNextPoster}
        tabIndex={-1}
        aria-hidden="true"
      >
        {poster && <img src={poster} alt="" />}
      </Link>
      <div className={styles.upNextBody}>
        <div className={styles.upNextMeta}>
          <Badge icon="clock">{when}</Badge>
          <span className={styles.muted}>
            {[unitsLabel(session.units), formatRuntime(session.minutes)]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
        <h3 className={styles.upNextTitle}>
          <Link to={`/planner/${plan.id}`}>{plan.media?.title ?? plan.title}</Link>
        </h3>
        <ProgressBar
          value={planProgress(plan)}
          label={`${plan.title} progress`}
          caption={`${plan.doneUnits} of ${unitWord(plan, plan.totalUnits)} · ends ${finish}`}
        />
      </div>
      {session.status === 'done' ? (
        <Badge icon="check" tone="success">
          Watched
        </Badge>
      ) : (
        role &&
        canEditSessions(role) && (
          <Button
            variant={primary ? 'primary' : 'secondary'}
            icon="check"
            loading={busy}
            onClick={() => void mark()}
            className={styles.upNextAction}
          >
            Mark watched
          </Button>
        )
      )}
    </article>
  )
}

function UpNextSkeleton() {
  return (
    <div className={styles.upNext} aria-busy="true" aria-label="Loading your next sessions">
      <Skeleton height={120} radius="md" />
      <Skeleton height={120} radius="md" />
    </div>
  )
}
