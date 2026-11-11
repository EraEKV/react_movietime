import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { useTranslation } from 'react-i18next'
import type { Bar as StatBar } from '../../utils/stats'
import { weekdayLong } from '../../utils/calendar'
import type { Weekday } from '../../types/plan'
import ChartTooltip from './ChartTooltip'
import { AXIS_TICK, CURSOR, prefersReducedMotion } from './chartTheme'
import styles from './Dashboard.module.css'

interface WeekdayColumnsProps {
  days: StatBar<`${Weekday}`>[]
  /** Today's weekday: its column is the bright one. */
  today: Weekday
}

/**
 * Watched sessions per weekday as rounded columns, Monday first, with a tooltip on hover
 * or touch. The chart is a picture: a list for screen readers says "Monday, 3 sessions"
 * for every day, and the SVG is hidden from them.
 */
export default function WeekdayColumns({ days, today }: WeekdayColumnsProps) {
  const { t } = useTranslation('dashboard')
  const data = days.map((day) => {
    const weekday = Number(day.value) as Weekday // values are built from Weekday numbers
    return { ...day, weekday, long: weekdayLong(weekday), isToday: weekday === today }
  })
  return (
    <div className={styles.plot}>
      <ul className="sr-only">
        {data.map((d) => (
          <li key={d.value}>
            {t('chart.sessions', { day: d.long, count: d.count })}
            {d.isToday ? ` (${t('chart.today')})` : ''}
          </li>
        ))}
      </ul>
      <div className={styles.chartBox} aria-hidden="true">
        <ResponsiveContainer
          width="100%"
          height={168}
          initialDimension={{ width: 320, height: 168 }}
        >
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            <XAxis
              dataKey="label"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              interval={0}
            />
            <Tooltip
              cursor={CURSOR}
              isAnimationActive={false}
              content={({ active, payload }) => {
                const d = payload?.[0]?.payload as (typeof data)[number] | undefined
                return (
                  <ChartTooltip
                    active={active && !!d}
                    title={d?.long ?? ''}
                    value={t('chart.sessionsShort', { count: d?.count ?? 0 })}
                  />
                )
              }}
            />
            <Bar
              dataKey="count"
              radius={[8, 8, 3, 3]}
              maxBarSize={36}
              minPointSize={4}
              isAnimationActive={!prefersReducedMotion()}
              animationDuration={600}
            >
              {data.map((d) => (
                <Cell key={d.value} fill="url(#weekdayFill)" fillOpacity={d.isToday ? 1 : 0.55} />
              ))}
            </Bar>
            <defs>
              <linearGradient id="weekdayFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
