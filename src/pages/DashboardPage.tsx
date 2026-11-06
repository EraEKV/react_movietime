import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import Banner from '../components/Banner/Banner'
import ButtonLink from '../components/ButtonLink/ButtonLink'
import BarList from '../components/Dashboard/BarList'
import DashboardCard from '../components/Dashboard/DashboardCard'
import SplitBar from '../components/Dashboard/SplitBar'
import WeekdayColumns from '../components/Dashboard/WeekdayColumns'
import dash from '../components/Dashboard/Dashboard.module.css'
import EmptyState from '../components/EmptyState/EmptyState'
import ErrorState from '../components/EmptyState/ErrorState'
import SectionHeader from '../components/SectionHeader/SectionHeader'
import SectionLink from '../components/SectionHeader/SectionLink'
import SegmentedControl from '../components/SegmentedControl/SegmentedControl'
import SessionChip from '../components/SessionChip/SessionChip'
import Skeleton from '../components/Skeleton/Skeleton'
import StatTile from '../components/StatTile/StatTile'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { relativeDay } from '../utils/calendar'
import { sessionPoster } from '../utils/planner'
import { unitsLabel } from '../utils/schedule'
import { hoursValue, parsePeriod, STATS_PERIODS, type StatsPeriod } from '../utils/stats'
import styles from './DashboardPage.module.css'

const SIGN_IN = '/login?redirect=/dashboard'

const plural = (count: number, word: string) => `${count} ${count === 1 ? word : `${word}s`}`

function ChartSkeleton() {
  return (
    <div className={dash.skeletonRows} aria-busy="true" aria-label="Loading">
      <Skeleton height={14} />
      <Skeleton height={14} width="80%" />
      <Skeleton height={14} width="60%" />
      <Skeleton height={14} width="40%" />
    </div>
  )
}

/**
 * Statistics from the user's own data: the library (Redux, guests included) and plans
 * (Firestore, accounts only). The period lives in the URL (?period=30d), so a reload or
 * a shared link keeps it; an unknown value means all time. Tiles and bars are links to
 * the library filtered the same way, upcoming sessions open their plan.
 */
export default function DashboardPage() {
  const [params, setParams] = useSearchParams()
  const period = parsePeriod(params.get('period'))
  const { today, todayWeekday, library, genres, plans } = useDashboardStats(period)

  const setPeriod = (next: StatsPeriod) =>
    setParams((prev) => {
      const nextParams = new URLSearchParams(prev)
      if (next === 'all') nextParams.delete('period')
      else nextParams.set('period', next)
      return nextParams
    })

  const header = (
    <header className={styles.header}>
      <h1 className={styles.title}>Dashboard</h1>
      <SegmentedControl
        label="Period"
        options={STATS_PERIODS}
        value={period}
        onChange={setPeriod}
      />
    </header>
  )

  // A brand-new user has nothing to count yet: one welcome state instead of zeros.
  const noPlans =
    plans.status === 'guest' || (plans.status === 'ready' && !plans.stats?.activePlans)
  if (library.status === 'ready' && library.isEmpty && noPlans && !plans.upcoming?.length) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Dashboard</h1>
        <EmptyState
          icon="chart"
          title="Your stats start with your first title"
          body="Add a few movies or series to your library and Movietime will chart what you watch, when and how you rate it."
          actions={
            <ButtonLink to="/series" variant="primary" icon="plus">
              Add your first titles
            </ButtonLink>
          }
        />
      </div>
    )
  }

  const libLoading = library.status === 'loading'
  const libError = library.status === 'error'
  const { stats } = library
  const hours = hoursValue(stats.minutes)

  /** Library charts share one rule set: skeleton, error with retry, empty period, chart. */
  const libraryChart = (chart: ReactNode) => {
    if (libLoading) return <ChartSkeleton />
    if (libError) {
      return (
        <ErrorState
          headingLevel="h3"
          title="Couldn’t load your library"
          body="Check your connection and try again."
          onRetry={library.retry}
        />
      )
    }
    if (library.entries.length === 0) {
      return <p className={dash.note}>Nothing added or changed in this period.</p>
    }
    return chart
  }

  const plansChart = (chart: () => ReactNode) => {
    if (plans.status === 'loading') return <ChartSkeleton />
    // The banner above already offers to sign in; here a short line is enough.
    if (plans.status === 'guest') {
      return <p className={dash.note}>Plans need an account: sign in to count sessions here.</p>
    }
    if (plans.status === 'error') {
      return (
        <ErrorState
          headingLevel="h3"
          title="Couldn’t load your plans"
          body="Check your connection and try again."
          onRetry={plans.retry}
        />
      )
    }
    return chart()
  }

  const week = plans.stats
  const plansTile = (
    label: string,
    icon: 'calendar' | 'list',
    value: () => { value: ReactNode; unit?: string; detail: string },
  ) => {
    if (plans.status === 'guest') {
      return <StatTile label={label} icon={icon} value="—" detail="Sign in to plan" to={SIGN_IN} />
    }
    if (plans.status === 'error') {
      return <StatTile label={label} icon={icon} value="—" detail="Couldn’t load plans" />
    }
    const shown = plans.status === 'ready' ? value() : { value: null, detail: '' }
    return (
      <StatTile
        label={label}
        icon={icon}
        loading={plans.status === 'loading'}
        to="/planner"
        {...shown}
      />
    )
  }

  return (
    <div className={styles.page}>
      {header}

      {library.isGuest && library.status === 'ready' && (
        <Banner
          action={
            <ButtonLink to={SIGN_IN} variant="primary" size="sm">
              Sign in
            </ButtonLink>
          }
        >
          These stats come from the library saved on this device. Plans and sessions need an
          account.
        </Banner>
      )}

      <section aria-label="Statistics" className={styles.tiles}>
        <StatTile
          label="Titles in library"
          icon="bookmark"
          loading={libLoading}
          value={libError ? '—' : stats.titles}
          detail={
            libError
              ? 'Couldn’t load the library'
              : `${library.byType[0]?.count ?? 0} series · ${plural(library.byType[1]?.count ?? 0, 'movie')}`
          }
          to="/library"
        />
        <StatTile
          label="Completed"
          icon="check"
          loading={libLoading}
          value={libError ? '—' : stats.completed}
          detail={
            stats.titles ? `${Math.round(stats.completedShare * 100)}% of these titles` : undefined
          }
          to="/library?status=completed"
        />
        <StatTile
          label="Average score"
          icon="heat"
          loading={libLoading}
          value={stats.averageScore === null ? '—' : stats.averageScore.toFixed(1)}
          unit={stats.averageScore === null ? undefined : '/10'}
          detail={
            stats.scored
              ? `From ${plural(stats.scored, 'scored title')}`
              : 'Score titles in the library'
          }
          to="/library?sort=score"
        />
        <StatTile
          label="Hours watched"
          icon="clock"
          loading={libLoading}
          value={libError ? '—' : hours.value}
          unit={libError ? undefined : hours.unit}
          detail={
            stats.noRuntime
              ? `${plural(stats.noRuntime, 'title')} without runtime not counted`
              : stats.minutes >= 1440
                ? `≈ ${(stats.minutes / 1440).toFixed(1)} days`
                : 'Completed movies and watched episodes'
          }
          to="/library?status=completed"
        />
        {plansTile('Sessions this week', 'calendar', () => ({
          value: week?.weekDone ?? 0,
          unit: `of ${week?.weekPlanned ?? 0}`,
          detail: week?.tonight
            ? `${week.tonight} tonight`
            : week?.weekPlanned
              ? 'Nothing left tonight'
              : 'Nothing planned this week',
        }))}
        {plansTile('Active plans', 'list', () => ({
          value: week?.activePlans ?? 0,
          detail: week?.sharedActive
            ? `${week.sharedActive} shared with you`
            : week?.activePlans
              ? 'All yours'
              : 'Create one in the planner',
        }))}
      </section>

      {period !== 'all' && (
        <p className={styles.periodNote}>
          Library figures cover titles added or changed in this period; sessions count by their
          date. “This week” and active plans are always current.
        </p>
      )}

      <div className={styles.charts}>
        <DashboardCard title="Titles by status" hint="Bars open the library">
          {libraryChart(
            <BarList bars={library.byStatus} hrefOf={(status) => `/library?status=${status}`} />,
          )}
        </DashboardCard>

        <DashboardCard title="Top genres" hint="A title counts in each of its genres">
          {libraryChart(
            genres.status === 'loading' ? (
              <ChartSkeleton />
            ) : genres.status === 'error' ? (
              <ErrorState
                headingLevel="h3"
                title="Couldn’t load genre names"
                body="TMDB didn’t answer. Try again in a moment."
                onRetry={genres.retry}
              />
            ) : genres.bars.length === 0 ? (
              <p className={dash.note}>No genres on these titles.</p>
            ) : (
              <BarList bars={genres.bars} hrefOf={(genre) => `/library?genre=${genre}`} />
            ),
          )}
        </DashboardCard>

        <DashboardCard title="Movies vs series">
          {libraryChart(<SplitBar parts={library.byType} />)}
        </DashboardCard>

        <DashboardCard title="Sessions by weekday" hint="Watched sessions">
          {plansChart(() =>
            plans.weekdays?.some((d) => d.count > 0) ? (
              <WeekdayColumns days={plans.weekdays} today={todayWeekday} />
            ) : (
              <p className={dash.note}>No watched sessions in this period yet.</p>
            ),
          )}
        </DashboardCard>
      </div>

      {plans.status !== 'guest' && (
        <section className={styles.upcoming} aria-labelledby="upcoming-title">
          <SectionHeader
            id="upcoming-title"
            title="Upcoming sessions"
            action={plans.status === 'ready' && <SectionLink to="/planner">Planner</SectionLink>}
          />
          {plansChart(() =>
            plans.upcoming?.length ? (
              <ul className={styles.sessions}>
                {plans.upcoming.map(({ plan, session }) => (
                  <li key={`${plan.id}/${session.id}`}>
                    <SessionChip
                      color={plan.color}
                      title={plan.media?.title ?? plan.title}
                      range={`${relativeDay(session.date, today)} · ${unitsLabel(session.units)}`}
                      time={session.time}
                      posterPath={sessionPoster(plan, session.units)}
                      to={`/planner/${plan.id}`}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                headingLevel="h3"
                icon="calendar"
                title="Nothing planned"
                body="Plan a series or a movie marathon and the next sessions show up here."
                actions={
                  <ButtonLink to="/planner/new" variant="secondary" size="sm" icon="plus">
                    Create a plan
                  </ButtonLink>
                }
              />
            ),
          )}
        </section>
      )}
    </div>
  )
}
