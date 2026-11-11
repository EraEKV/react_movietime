import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import Banner from '../shared/ui/Banner/Banner'
import ButtonLink from '../shared/ui/ButtonLink/ButtonLink'
import ActivityCalendar from '../components/Dashboard/ActivityCalendar'
import BarList from '../components/Dashboard/BarList'
import DashboardCard from '../components/Dashboard/DashboardCard'
import Donut from '../components/Dashboard/Donut'
import WeekdayColumns from '../components/Dashboard/WeekdayColumns'
import WeeklyActivity from '../components/Dashboard/WeeklyActivity'
import dash from '../components/Dashboard/Dashboard.module.css'
import EmptyState from '../shared/ui/EmptyState/EmptyState'
import ErrorState from '../shared/ui/EmptyState/ErrorState'
import SectionHeader from '../shared/ui/SectionHeader/SectionHeader'
import SectionLink from '../shared/ui/SectionHeader/SectionLink'
import SegmentedControl from '../shared/ui/SegmentedControl/SegmentedControl'
import SessionChip from '../components/SessionChip/SessionChip'
import Skeleton from '../shared/ui/Skeleton/Skeleton'
import StatTile from '../shared/ui/StatTile/StatTile'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { relativeDay } from '../utils/calendar'
import { sessionPoster } from '../utils/planner'
import { unitsLabel } from '../utils/schedule'
import { hoursValue, parsePeriod, STATS_PERIODS, type StatsPeriod } from '../utils/stats'
import { formatRating } from '../shared/lib/format'
import { statusLabel } from '../utils/library'
import { weekdayShort } from '../utils/calendar'
import type { LibraryStatus } from '../types/library'
import type { MediaType } from '../types/media'
import type { Weekday } from '../types/plan'
import styles from './DashboardPage.module.css'

const SIGN_IN = '/login?redirect=/dashboard'

const STATUS_COLOR: Record<LibraryStatus, string> = {
  plan: 'var(--chart-2)',
  watching: 'var(--chart-1)',
  completed: 'var(--chart-3)',
  dropped: 'var(--chart-4)',
}
const TYPE_COLOR: Record<MediaType, string> = { tv: 'var(--chart-1)', movie: 'var(--chart-2)' }

function ChartSkeleton() {
  const { t } = useTranslation('dashboard')
  return (
    <div className={dash.skeletonRows} aria-busy="true" aria-label={t('loading')}>
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
  const { t } = useTranslation(['dashboard', 'common', 'library'])
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
      <h1 className={styles.title}>{t('title')}</h1>
      <SegmentedControl
        label={t('period')}
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
        <h1 className={styles.title}>{t('title')}</h1>
        <EmptyState
          icon="chart"
          title={t('welcomeTitle')}
          body={t('welcomeBody')}
          actions={
            <ButtonLink to="/series" variant="primary" icon="plus">
              {t('welcomeAction')}
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
          title={t('libraryError')}
          body={t('retryBody')}
          onRetry={library.retry}
        />
      )
    }
    if (library.entries.length === 0) {
      return <p className={dash.note}>{t('nothingInPeriod')}</p>
    }
    return chart
  }

  const plansChart = (chart: () => ReactNode) => {
    if (plans.status === 'loading') return <ChartSkeleton />
    // The banner above already offers to sign in; here a short line is enough.
    if (plans.status === 'guest') {
      return <p className={dash.note}>{t('plansNeedAccount')}</p>
    }
    if (plans.status === 'error') {
      return (
        <ErrorState
          headingLevel="h3"
          title={t('plansError')}
          body={t('retryBody')}
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
      return (
        <StatTile label={label} icon={icon} value="—" detail={t('signInToPlan')} to={SIGN_IN} />
      )
    }
    if (plans.status === 'error') {
      return <StatTile label={label} icon={icon} value="—" detail={t('plansFailed')} />
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
              {t('signIn')}
            </ButtonLink>
          }
        >
          {t('guestBanner')}
        </Banner>
      )}

      <section aria-label={t('statistics')} className={styles.tiles}>
        <StatTile
          label={t('tiles.titles')}
          icon="bookmark"
          loading={libLoading}
          value={libError ? '—' : stats.titles}
          detail={
            libError
              ? t('tiles.libraryFailed')
              : t('tiles.titlesDetail', {
                  series: t('common:count.series', { count: library.byType[0]?.count ?? 0 }),
                  movies: t('common:count.movies', { count: library.byType[1]?.count ?? 0 }),
                })
          }
          to="/library"
        />
        <StatTile
          label={t('tiles.completed')}
          icon="check"
          loading={libLoading}
          value={libError ? '—' : stats.completed}
          detail={
            stats.titles
              ? t('tiles.completedShare', { percent: Math.round(stats.completedShare * 100) })
              : undefined
          }
          to="/library?status=completed"
        />
        <StatTile
          label={t('tiles.average')}
          icon="heat"
          loading={libLoading}
          value={stats.averageScore === null ? '—' : formatRating(stats.averageScore)}
          unit={stats.averageScore === null ? undefined : t('tiles.outOf')}
          detail={stats.scored ? t('scored', { count: stats.scored }) : t('tiles.scoreHint')}
          to="/library?sort=score"
        />
        <StatTile
          label={t('tiles.hours')}
          icon="clock"
          loading={libLoading}
          value={libError ? '—' : hours.value}
          unit={libError ? undefined : hours.unit}
          detail={
            stats.noRuntime
              ? t('noRuntime', { count: stats.noRuntime })
              : stats.minutes >= 1440
                ? t('tiles.days', { days: formatRating(stats.minutes / 1440) })
                : t('tiles.hoursHint')
          }
          to="/library?status=completed"
        />
        {plansTile(t('tiles.week'), 'calendar', () => ({
          value: week?.weekDone ?? 0,
          unit: t('tiles.weekOf', { count: week?.weekPlanned ?? 0 }),
          detail: week?.tonight
            ? t('tiles.tonight', { count: week.tonight })
            : week?.weekPlanned
              ? t('tiles.nothingTonight')
              : t('tiles.nothingWeek'),
        }))}
        {plansTile(t('tiles.active'), 'list', () => ({
          value: week?.activePlans ?? 0,
          detail: week?.sharedActive
            ? t('tiles.shared', { count: week.sharedActive })
            : week?.activePlans
              ? t('tiles.allYours')
              : t('tiles.createOne'),
        }))}
      </section>

      {period !== 'all' && <p className={styles.periodNote}>{t('periodNote')}</p>}

      <div className={styles.charts}>
        <DashboardCard title={t('cards.status')} hint={t('cards.statusHint')}>
          {libraryChart(
            <Donut
              parts={library.byStatus.map((bar) => ({
                ...bar,
                label: statusLabel(bar.value),
                color: STATUS_COLOR[bar.value],
                href: `/library?status=${bar.value}`,
              }))}
            />,
          )}
        </DashboardCard>

        <DashboardCard title={t('cards.genres')} hint={t('cards.genresHint')}>
          {libraryChart(
            genres.status === 'loading' ? (
              <ChartSkeleton />
            ) : genres.status === 'error' ? (
              <ErrorState
                headingLevel="h3"
                title={t('cards.genresError')}
                body={t('cards.genresErrorBody')}
                onRetry={genres.retry}
              />
            ) : genres.bars.length === 0 ? (
              <p className={dash.note}>{t('cards.noGenres')}</p>
            ) : (
              <BarList bars={genres.bars} hrefOf={(genre) => `/library?genre=${genre}`} />
            ),
          )}
        </DashboardCard>

        <DashboardCard title={t('cards.split')}>
          {libraryChart(
            <Donut
              parts={library.byType.map((part) => ({
                ...part,
                label: t(part.value === 'tv' ? 'library:types.tv' : 'library:types.movie'),
                color: TYPE_COLOR[part.value],
                href: `/library?type=${part.value}`,
              }))}
            />,
          )}
        </DashboardCard>

        <DashboardCard title={t('cards.weekday')} hint={t('cards.weekdayHint')}>
          {plansChart(() =>
            plans.weekdays?.some((d) => d.count > 0) ? (
              <WeekdayColumns
                days={plans.weekdays.map((day) => ({
                  ...day,
                  label: weekdayShort(Number(day.value) as Weekday),
                }))}
                today={todayWeekday}
              />
            ) : (
              <p className={dash.note}>{t('cards.noWatched')}</p>
            ),
          )}
        </DashboardCard>

        <DashboardCard title={t('cards.weeks')} hint={t('cards.weeksHint')} className={styles.wide}>
          {plansChart(() =>
            plans.weeks?.some((w) => w.count > 0) ? (
              <WeeklyActivity weeks={plans.weeks} />
            ) : (
              <p className={dash.note}>{t('cards.noWeeks')}</p>
            ),
          )}
        </DashboardCard>
      </div>

      {plans.status !== 'guest' && (
        <DashboardCard title={t('cards.activity')} hint={t('cards.activityHint')}>
          {plansChart(() =>
            plans.sessions ? <ActivityCalendar sessions={plans.sessions} today={today} /> : null,
          )}
        </DashboardCard>
      )}

      {plans.status !== 'guest' && (
        <section className={styles.upcoming} aria-labelledby="upcoming-title">
          <SectionHeader
            id="upcoming-title"
            title={t('upcoming.title')}
            action={
              plans.status === 'ready' && (
                <SectionLink to="/planner">{t('upcoming.planner')}</SectionLink>
              )
            }
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
                title={t('upcoming.emptyTitle')}
                body={t('upcoming.emptyBody')}
                actions={
                  <ButtonLink to="/planner/new" variant="secondary" size="sm" icon="plus">
                    {t('upcoming.create')}
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
