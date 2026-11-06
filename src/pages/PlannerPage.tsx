import { useSearchParams } from 'react-router'
import Button from '../components/Button/Button'
import ButtonLink from '../components/ButtonLink/ButtonLink'
import CalendarMonth, { type CalendarItem } from '../components/CalendarMonth/CalendarMonth'
import EmptyState from '../components/EmptyState/EmptyState'
import ErrorState from '../components/EmptyState/ErrorState'
import IconButton from '../components/IconButton/IconButton'
import { ActivePlans, TodayCard } from '../components/Planner/PlanSide'
import SegmentedControl from '../components/SegmentedControl/SegmentedControl'
import SessionChip from '../components/SessionChip/SessionChip'
import Skeleton from '../components/Skeleton/Skeleton'
import Toast from '../components/Toast/Toast'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { usePlanner } from '../hooks/usePlanner'
import { useTimedState } from '../hooks/useTimedState'
import type { Plan, PlannedSession } from '../types/plan'
import {
  formatMonth,
  localToday,
  monthKey,
  monthOf,
  parseMonthKey,
  relativeDay,
  shiftMonth,
  type MonthRef,
} from '../utils/calendar'
import { sessionPoster } from '../utils/planner'
import { unitsLabel } from '../utils/schedule'
import styles from './PlannerPage.module.css'

type Show = 'all' | 'mine' | 'shared'
const SHOWS: { value: Show; label: string }[] = [
  { value: 'all', label: 'All plans' },
  { value: 'mine', label: 'Mine' },
  { value: 'shared', label: 'Shared' },
]

const chipTitle = (plan: Plan) => plan.media?.title ?? plan.title

function toItem({ plan, session }: PlannedSession): CalendarItem {
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
  }
}

/**
 * Month calendar of every plan (desktop), compact dots (tablet) or an agenda by day
 * (phones), with Today and active plans alongside. Month and filter live in the URL
 * (?month=2026-11&show=mine), so Back and shared links keep them.
 */
export default function PlannerPage() {
  const [params, setParams] = useSearchParams()
  const desktop = useMediaQuery('(min-width: 1024px)')
  const tablet = useMediaQuery('(min-width: 768px)')
  const [toast, showToast] = useTimedState<string>(6000)

  // An invalid ?month= falls back to the current month instead of an error.
  const month: MonthRef = parseMonthKey(params.get('month')) ?? monthOf(localToday())
  const { plans, grid, today, visible, todays } = usePlanner(month)
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
      <h1 className={styles.title}>Planner</h1>
      <div className={styles.tools}>
        <SegmentedControl
          label="Plans"
          value={show}
          onChange={(value) => setParam('show', value === 'all' ? null : value)}
          options={SHOWS}
        />
        {tablet && (
          <ButtonLink to="/planner/new" variant="primary" icon="plus">
            New plan
          </ButtonLink>
        )}
      </div>
    </header>
  )

  if (plans.status === 'error') {
    return (
      <div className={styles.page}>
        <title>Planner · Movietime</title>
        {header}
        <ErrorState
          title="We couldn’t load your plans"
          body="Your sessions are safe. Check your connection and try again."
          onRetry={plans.retry}
        />
      </div>
    )
  }

  if (plans.status === 'success' && plans.plans.length === 0) {
    return (
      <div className={styles.page}>
        <title>Planner · Movietime</title>
        {header}
        <EmptyState
          icon="calendar"
          title="Nothing planned yet"
          body="Turn a series or a list into a schedule: pick your evenings and Movietime works out the finish date."
          actions={
            <>
              <ButtonLink to="/planner/new" variant="primary" icon="plus">
                Create a plan
              </ButtonLink>
              <ButtonLink to="/series" icon="tv">
                Browse series
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
          label="Previous month"
          onClick={() => goMonth(shiftMonth(month, -1))}
        />
        <h2 className={styles.month} aria-live="polite">
          {formatMonth(month)}
        </h2>
        <IconButton
          icon="chevron-right"
          label="Next month"
          onClick={() => goMonth(shiftMonth(month, 1))}
        />
      </div>
      <Button size="sm" onClick={() => goMonth(monthOf(today))}>
        Today
      </Button>
    </div>
  )

  let schedule
  if (visible.status === 'error') {
    schedule = (
      <ErrorState
        title="Couldn’t load your schedule"
        body="Sessions stay safe. Reconnect and try again."
        onRetry={visible.retry}
        headingLevel="h3"
      />
    )
  } else if (!monthSessions) {
    schedule = <Skeleton height={tablet ? 640 : 320} radius="md" />
  } else if (tablet) {
    schedule = (
      <CalendarMonth
        label={`Sessions in ${formatMonth(month)}`}
        month={month}
        days={grid}
        today={today}
        compact={!desktop}
        items={monthSessions.map(toItem)}
      />
    )
  } else {
    schedule = <Agenda sessions={monthSessions} today={today} month={month} />
  }

  const side = (
    <div className={styles.side}>
      <TodayCard today={today} sessions={todaySessions} onError={showToast} />
      <ActivePlans plans={shownPlans} />
    </div>
  )

  return (
    <div className={styles.page}>
      <title>Planner · Movietime</title>
      {header}
      <div className={styles.layout}>
        {!tablet && side}
        <section className={styles.calendar} aria-label="Schedule">
          {monthNav}
          {schedule}
        </section>
        {tablet && side}
      </div>
      {toast && <Toast icon="alert">{toast}</Toast>}
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
  const current = monthKey(month) === monthKey(monthOf(today))
  const inMonth = sessions.filter(
    (s) =>
      monthKey(monthOf(s.session.date)) === monthKey(month) &&
      (!current || s.session.date >= today),
  )
  if (inMonth.length === 0) {
    return (
      <p className={styles.empty}>
        {current ? 'No more sessions this month.' : 'No sessions this month.'}
      </p>
    )
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
