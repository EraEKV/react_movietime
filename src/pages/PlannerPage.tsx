import { translatedOption } from '../shared/i18n'
import { useTranslation } from 'react-i18next'
import { useLocation, useSearchParams } from 'react-router'
import Button from '../shared/ui/Button/Button'
import ButtonLink from '../shared/ui/ButtonLink/ButtonLink'
import CalendarMonth, { type CalendarItem } from '../components/CalendarMonth/CalendarMonth'
import EmptyState from '../shared/ui/EmptyState/EmptyState'
import ErrorState from '../shared/ui/EmptyState/ErrorState'
import IconButton from '../shared/ui/IconButton/IconButton'
import { ActivePlans, TodayCard } from '../components/Planner/PlanSide'
import SegmentedControl from '../shared/ui/SegmentedControl/SegmentedControl'
import SessionChip from '../components/SessionChip/SessionChip'
import Skeleton from '../shared/ui/Skeleton/Skeleton'
import Toast from '../shared/ui/Toast/Toast'
import { useMediaQuery } from '../shared/hooks/useMediaQuery'
import { useAuth } from '../hooks/useAuth'
import { usePlanActions, usePlanner } from '../hooks/usePlanner'
import { useTimedState } from '../shared/hooks/useTimedState'
import type { Plan, PlannedSession } from '../types/plan'
import {
  formatDay,
  formatMonth,
  localToday,
  monthKey,
  monthOf,
  parseMonthKey,
  relativeDay,
  shiftMonth,
  type MonthRef,
} from '../utils/calendar'
import { noticeFromState } from '../shared/lib/notice'
import { canEditSessions, planErrorMessage, sessionPoster } from '../utils/planner'
import { roleOf } from '../utils/sharing'
import { unitsLabel } from '../utils/schedule'
import styles from './PlannerPage.module.css'

type Show = 'all' | 'mine' | 'shared'
const SHOWS = [
  translatedOption<Show>('all', 'planner:show.all'),
  translatedOption<Show>('mine', 'planner:show.mine'),
  translatedOption<Show>('shared', 'planner:show.shared'),
]

const chipTitle = (plan: Plan) => plan.media?.title ?? plan.title

function toItem({ plan, session }: PlannedSession, editable = false): CalendarItem {
  return {
    key: `${plan.id}/${session.id}`,
    date: session.date,
    color: plan.color,
    title: chipTitle(plan),
    range: unitsLabel(session.units),
    time: session.time,
    status: session.status,
    posterPath: sessionPoster(plan, session.units),
    to: `/planner/${plan.id}`,
    movable: editable && session.status === 'pending',
  }
}

/**
 * Month calendar of every plan (desktop), compact dots (tablet) or an agenda by day
 * (phones), with Today and active plans alongside. Month and filter live in the URL
 * (?month=2026-11&show=mine), so Back and shared links keep them.
 */
export default function PlannerPage() {
  const { t } = useTranslation(['planner', 'common'])
  const [params, setParams] = useSearchParams()
  const desktop = useMediaQuery('(min-width: 1024px)')
  const tablet = useMediaQuery('(min-width: 768px)')
  const location = useLocation()
  // "Deleted …" / "You left …" arrive from the plan page through history state.
  const passed = noticeFromState(location.state)
  const [toast, showToast] = useTimedState<{ text: string; error?: boolean }>(
    6000,
    passed ? { text: passed } : null,
  )

  // An invalid ?month= falls back to the current month instead of an error.
  const month: MonthRef = parseMonthKey(params.get('month')) ?? monthOf(localToday())
  const { plans, grid, today, visible, todays } = usePlanner(month)
  const { user } = useAuth()
  const actions = usePlanActions()
  const show: Show = SHOWS.some((s) => s.value === params.get('show'))
    ? (params.get('show') as Show) // checked against SHOWS on the line above
    : 'all'

  const setParam = (key: string, value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === null) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )
  const goMonth = (ref: MonthRef) =>
    setParam('month', monthKey(ref) === monthKey(monthOf(today)) ? null : monthKey(ref))

  const included = (plan: Plan) =>
    show === 'all' || (show === 'shared') === plans.sharedIds.has(plan.id)
  const shownPlans = plans.plans?.filter(included) ?? null
  const monthSessions = visible.sessions?.filter((s) => included(s.plan)) ?? null
  const todaySessions = todays.sessions?.filter((s) => included(s.plan)) ?? null

  const header = (
    <header className={styles.header}>
      <h1 className={styles.title}>{t('title')}</h1>
      <div className={styles.tools}>
        <SegmentedControl
          label={t('plansLabel')}
          value={show}
          onChange={(value) => setParam('show', value === 'all' ? null : value)}
          options={SHOWS}
        />
        {tablet && (
          <ButtonLink to="/planner/new" variant="primary" icon="plus">
            {t('newPlan')}
          </ButtonLink>
        )}
      </div>
    </header>
  )

  if (plans.status === 'error') {
    return (
      <div className={styles.page}>
        <title>{t('pageTitle')}</title>
        {header}
        <ErrorState title={t('loadError')} body={t('loadErrorBody')} onRetry={plans.retry} />
      </div>
    )
  }

  if (plans.status === 'success' && plans.plans.length === 0) {
    return (
      <div className={styles.page}>
        <title>{t('pageTitle')}</title>
        {header}
        <EmptyState
          icon="calendar"
          title={t('emptyTitle')}
          body={t('emptyBody')}
          actions={
            <>
              <ButtonLink to="/planner/new" variant="primary" icon="plus">
                {t('create')}
              </ButtonLink>
              <ButtonLink to="/series" icon="tv">
                {t('browseSeries')}
              </ButtonLink>
            </>
          }
        />
      </div>
    )
  }

  const monthNav = (
    <div className={styles.monthNav}>
      <div className={styles.monthSwitch}>
        <IconButton
          icon="chevron-left"
          label={t('common:calendar.previousMonth')}
          onClick={() => goMonth(shiftMonth(month, -1))}
        />
        <h2 className={styles.month} aria-live="polite">
          {formatMonth(month)}
        </h2>
        <IconButton
          icon="chevron-right"
          label={t('common:calendar.nextMonth')}
          onClick={() => goMonth(shiftMonth(month, 1))}
        />
      </div>
      <Button size="sm" onClick={() => goMonth(monthOf(today))}>
        {t('today')}
      </Button>
    </div>
  )

  // Drop on another day: that one session moves, later ones stay (the plan page's
  // Reschedule can shift them too).
  async function moveSession(key: string, date: string) {
    const found = monthSessions?.find((s) => `${s.plan.id}/${s.session.id}` === key)
    if (!found) return
    try {
      await actions.reschedule(found.plan, found.session, date, false)
      showToast({
        text: t('moved', {
          title: chipTitle(found.plan),
          date: formatDay(date, { weekday: 'short', month: 'short', day: 'numeric' }),
        }),
      })
    } catch (error) {
      showToast({ text: planErrorMessage(error), error: true })
    }
  }

  let schedule
  if (visible.status === 'error') {
    schedule = (
      <ErrorState
        title={t('scheduleError')}
        body={t('scheduleErrorBody')}
        onRetry={visible.retry}
        headingLevel="h3"
      />
    )
  } else if (!monthSessions) {
    schedule = <Skeleton height={tablet ? 640 : 320} radius="md" />
  } else if (tablet) {
    schedule = (
      <CalendarMonth
        label={t('sessionsIn', { month: formatMonth(month) })}
        month={month}
        days={grid}
        today={today}
        compact={!desktop}
        items={monthSessions.map((item) => {
          const role = roleOf(item.plan, user)
          return toItem(item, role !== null && canEditSessions(role))
        })}
        onMove={(key, date) => void moveSession(key, date)}
      />
    )
  } else {
    schedule = <Agenda sessions={monthSessions} today={today} month={month} />
  }

  const side = (
    <div className={styles.side}>
      <TodayCard
        today={today}
        sessions={todaySessions}
        onError={(text) => showToast({ text, error: true })}
      />
      <ActivePlans plans={shownPlans} />
    </div>
  )

  return (
    <div className={styles.page}>
      <title>{t('pageTitle')}</title>
      {header}
      <div className={styles.layout}>
        {!tablet && side}
        <section className={styles.calendar} aria-label={t('scheduleTitle')}>
          {monthNav}
          {schedule}
        </section>
        {tablet && side}
      </div>
      {toast && <Toast icon={toast.error ? 'alert' : 'check'}>{toast.text}</Toast>}
    </div>
  )
}

/** Phones: the month's sessions grouped by day (from today on in the current month). */
function Agenda({
  sessions,
  today,
  month,
}: {
  sessions: PlannedSession[]
  today: string
  month: MonthRef
}) {
  const { t } = useTranslation('planner')
  const current = monthKey(month) === monthKey(monthOf(today))
  const inMonth = sessions.filter(
    (s) =>
      monthKey(monthOf(s.session.date)) === monthKey(month) &&
      (!current || s.session.date >= today),
  )
  if (inMonth.length === 0) {
    return <p className={styles.empty}>{t(current ? 'noMoreMonth' : 'noneMonth')}</p>
  }
  const days = new Map<string, PlannedSession[]>()
  for (const s of inMonth) days.set(s.session.date, [...(days.get(s.session.date) ?? []), s])

  return (
    <ol className={styles.agenda}>
      {[...days].map(([day, list]) => (
        <li key={day} className={styles.agendaDay}>
          <h3 className={styles.agendaTitle}>{relativeDay(day, today)}</h3>
          <ul className={styles.agendaList}>
            {list.map((item) => {
              const chip = toItem(item)
              return (
                <li key={chip.key}>
                  <SessionChip
                    color={chip.color}
                    title={chip.title}
                    range={chip.range}
                    time={chip.time}
                    status={chip.status}
                    posterPath={chip.posterPath}
                    to={chip.to}
                  />
                </li>
              )
            })}
          </ul>
        </li>
      ))}
    </ol>
  )
}
