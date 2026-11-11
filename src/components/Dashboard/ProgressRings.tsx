import { useTranslation } from 'react-i18next'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { Cell, PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts'
import { prefersReducedMotion } from './chartTheme'
import styles from './Dashboard.module.css'

const SIZE = 148

export interface ProgressRing {
  key: string
  label: string
  done: number
  total: number
  /** Any CSS colour: the chart token for the week, the plan's own colour for a plan. */
  color: string
  to: string
}

const share = (ring: ProgressRing) => (ring.total ? Math.round((ring.done / ring.total) * 100) : 0)

/**
 * Concentric rings, one per row: this week's sessions and each active plan, every ring as
 * full as its done/total. The rows beside it carry the same numbers as text and link to the
 * planner; the picture itself is hidden from assistive technology behind its summary.
 */
export default function ProgressRings({ rings }: { rings: ProgressRing[] }) {
  const { t } = useTranslation('dashboard')
  const data = rings.map((ring) => ({ ...ring, percent: share(ring) }))
  const summary = rings
    .map((ring) => t('chart.progress', { label: ring.label, done: ring.done, total: ring.total }))
    .join('. ')
  return (
    <div className={styles.split}>
      <div className={styles.donut} role="img" aria-label={summary}>
        <RadialBarChart
          width={SIZE}
          height={SIZE}
          data={data}
          innerRadius={22}
          outerRadius={72}
          barSize={8}
          startAngle={90}
          endAngle={-270}
          role="presentation"
          accessibilityLayer={false}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            dataKey="percent"
            cornerRadius={4}
            background={{ fill: 'var(--surface-sunken)' }}
            isAnimationActive={!prefersReducedMotion()}
            animationDuration={700}
          >
            {data.map((ring) => (
              <Cell key={ring.key} fill={ring.color} />
            ))}
          </RadialBar>
        </RadialBarChart>
      </div>
      <ul className={styles.legend}>
        {data.map((ring) => (
          <li key={ring.key}>
            <Link
              to={ring.to}
              className={styles.legendRow}
              style={{ '--swatch': ring.color } as CSSProperties}
            >
              <span className={styles.swatch} aria-hidden="true" />
              <span className={styles.legendLabel}>{ring.label}</span>
              <strong className={styles.legendValue}>
                {ring.done}/{ring.total}
              </strong>
              <span className={styles.legendShare}>{ring.percent}%</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
