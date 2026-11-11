import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { useTranslation } from 'react-i18next'
import { formatDay } from '../../utils/calendar'
import type { WeekPoint } from '../../utils/stats'
import ChartTooltip from './ChartTooltip'
import { AXIS_TICK, prefersReducedMotion } from './chartTheme'
import styles from './Dashboard.module.css'

/**
 * Watched sessions per week for the last weeks, as a soft area. Like the other charts the
 * SVG is decoration; the numbers are in a list for screen readers.
 */
export default function WeeklyActivity({ weeks }: { weeks: WeekPoint[] }) {
  const { t } = useTranslation('dashboard')
  const data = weeks.map((w) => ({
    ...w,
    short: formatDay(w.week, { day: 'numeric', month: 'short' }),
  }))
  return (
    <div className={styles.plot}>
      <ul className="sr-only">
        {data.map((d) => (
          <li key={d.week}>{t('chart.weekOf', { week: d.short, count: d.count })}</li>
        ))}
      </ul>
      <div className={styles.chartBox} aria-hidden="true">
        <ResponsiveContainer
          width="100%"
          height={168}
          initialDimension={{ width: 320, height: 168 }}
        >
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="weeklyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="short"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              minTickGap={24}
            />
            <Tooltip
              isAnimationActive={false}
              cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                const d = payload?.[0]?.payload as (typeof data)[number] | undefined
                return (
                  <ChartTooltip
                    active={active && !!d}
                    title={t('chart.weekStarting', { week: d?.short ?? '' })}
                    value={t('chart.sessionsShort', { count: d?.count ?? 0 })}
                  />
                )
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              fill="url(#weeklyFill)"
              dot={false}
              activeDot={{ r: 5, fill: 'var(--chart-1)', stroke: 'var(--surface)', strokeWidth: 2 }}
              isAnimationActive={!prefersReducedMotion()}
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
