import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Link } from 'react-router'
import { imageUrl } from '../../shared/api/tmdb'
import { useAuth } from '../../hooks/useAuth'
import { usePlanActions } from '../../hooks/usePlanner'
import type { Plan, PlannedSession } from '../../types/plan'
import { formatDay } from '../../utils/calendar'
import { formatRuntime } from '../../utils/format'
import { canEditSessions, planErrorMessage, planProgress, sessionPoster } from '../../utils/planner'
import { unitsLabel } from '../../utils/schedule'
import { roleOf } from '../../utils/sharing'
import Button from '../Button/Button'
import ButtonLink from '../ButtonLink/ButtonLink'
import ProgressRing from '../ProgressRing/ProgressRing'
import Skeleton from '../Skeleton/Skeleton'
import styles from './PlanSide.module.css'

interface TodayCardProps {
  today: string
  sessions: PlannedSession[] | null
  onError: (message: string) => void
}

/** "Today": tonight's sessions with "Mark as watched" for the people who may mark them. */
export function TodayCard({ today, sessions, onError }: TodayCardProps) {
  const { t } = useTranslation('planner')
  return (
    <section className={styles.today} aria-labelledby="today-title">
      <h2 id="today-title" className={styles.kicker}>
        {t('side.today', {
          date: formatDay(today, { weekday: 'short', month: 'short', day: 'numeric' }),
        })}
      </h2>
      {sessions === null ? (
        <Skeleton height={56} radius="sm" />
      ) : sessions.length === 0 ? (
        <p className={styles.muted}>{t('side.nothing')}</p>
      ) : (
        <ul className={styles.todayList}>
          {sessions.map((item) => (
            <TodaySession key={item.session.id} item={item} onError={onError} />
          ))}
        </ul>
      )}
    </section>
  )
}

function TodaySession({
  item: { plan, session },
  onError,
}: {
  item: PlannedSession
  onError: (message: string) => void
}) {
  const { t } = useTranslation('planner')
  const { user } = useAuth()
  const actions = usePlanActions()
  const [busy, setBusy] = useState(false)
  const role = roleOf(plan, user)
  const poster = imageUrl(sessionPoster(plan, session.units), 'w92')
  const done = session.status === 'done'

  async function mark() {
    setBusy(true)
    try {
      await actions.complete(plan, session)
    } catch (error) {
      onError(planErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className={styles.todayItem}>
      <span className={styles.thumb} aria-hidden="true">
        {poster && <img src={poster} alt="" />}
      </span>
      <div className={styles.todayText}>
        <Link to={`/planner/${plan.id}`} className={styles.todayTitle}>
          {plan.media?.title ?? plan.title} · {unitsLabel(session.units)}
        </Link>
        <span className={styles.muted}>
          {[session.time, formatRuntime(session.minutes)].filter(Boolean).join(' · ')}
        </span>
        {session.status === 'pending' && role && canEditSessions(role) && (
          <Button
            size="sm"
            variant="primary"
            icon="check"
            loading={busy}
            onClick={() => void mark()}
          >
            {t('side.mark')}
          </Button>
        )}
        {done && (
          <span className={styles.watched}>
            {session.doneBy
              ? t('side.watchedBy', {
                  name: session.doneBy.uid === user?.uid ? t('you') : session.doneBy.name,
                })
              : t('side.watched')}
          </span>
        )}
        {session.status === 'skipped' && <span className={styles.muted}>{t('side.skipped')}</span>}
      </div>
    </li>
  )
}

/** Active plans with their colour ring, progress and finish date. */
export function ActivePlans({ plans }: { plans: Plan[] | null }) {
  const { t } = useTranslation('planner')
  const active = plans?.filter((p) => p.status === 'active') ?? null
  return (
    <section className={styles.plans} aria-labelledby="active-plans-title">
      <h2 id="active-plans-title" className={styles.title}>
        {t('side.active')}
      </h2>
      {active === null ? (
        <>
          <Skeleton height={52} radius="sm" />
          <Skeleton height={52} radius="sm" />
        </>
      ) : active.length === 0 ? (
        <p className={styles.muted}>{t('side.noActive')}</p>
      ) : (
        <ul className={styles.planList}>
          {active.map((plan) => (
            <li key={plan.id}>
              <Link to={`/planner/${plan.id}`} className={styles.planRow}>
                <ProgressRing
                  value={planProgress(plan)}
                  size={44}
                  color={plan.color}
                  label={t('side.progress', { title: plan.title })}
                />
                <span className={styles.planText}>
                  <strong>{plan.title}</strong>
                  <span className={styles.muted}>
                    {t('side.finishes', {
                      done: plan.doneUnits,
                      total: plan.totalUnits,
                      date: plan.endDate
                        ? formatDay(plan.endDate, { month: 'short', day: 'numeric' })
                        : '—',
                    })}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <ButtonLink to="/planner/new" icon="plus">
        {t('newPlan')}
      </ButtonLink>
    </section>
  )
}
