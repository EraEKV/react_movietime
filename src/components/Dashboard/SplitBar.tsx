import { useTranslation } from 'react-i18next'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { Cell, Pie, PieChart } from 'recharts'
import type { MediaType } from '../../types/media'
import type { Bar } from '../../utils/stats'
import { prefersReducedMotion } from './chartTheme'
import styles from './Dashboard.module.css'

const COLOR: Record<MediaType, string> = { tv: 'var(--chart-1)', movie: 'var(--chart-2)' }
const SIZE = 148

const percent = (count: number, total: number) =>
  total ? `${Math.round((count / total) * 100)}%` : '0%'

/**
 * Movies vs series as a donut with the total in the middle. The legend rows carry name,
 * count and share as text and link to the library filtered by type; the ring is a picture
 * of the same numbers (role="img" with the summary as its name).
 */
export default function SplitBar({ parts }: { parts: Bar<MediaType>[] }) {
  const { t } = useTranslation('dashboard')
  const total = parts.reduce((sum, p) => sum + p.count, 0)
  const summary = parts.map((p) => `${p.label} ${p.count} (${percent(p.count, total)})`).join(', ')
  const shown = parts.filter((p) => p.count > 0)
  return (
    <div className={styles.split}>
      <div className={styles.donut} role="img" aria-label={summary}>
        <PieChart width={SIZE} height={SIZE} role="presentation" accessibilityLayer={false}>
          <Pie
            data={shown}
            dataKey="count"
            nameKey="label"
            innerRadius={50}
            outerRadius={70}
            paddingAngle={shown.length > 1 ? 3 : 0}
            cornerRadius={6}
            stroke="none"
            startAngle={90}
            endAngle={-270}
            isAnimationActive={!prefersReducedMotion()}
            animationDuration={700}
          >
            {shown.map((p) => (
              <Cell key={p.value} fill={COLOR[p.value]} />
            ))}
          </Pie>
        </PieChart>
        <span className={styles.donutTotal} aria-hidden="true">
          <strong>{total}</strong>
          <small>{t('chart.titles')}</small>
        </span>
      </div>
      <ul className={styles.legend}>
        {parts.map((p) => (
          <li key={p.value}>
            <Link
              to={`/library?type=${p.value}`}
              className={styles.legendRow}
              style={{ '--swatch': COLOR[p.value] } as CSSProperties}
              aria-label={t('chart.part', {
                label: p.label,
                count: p.count,
                percent: percent(p.count, total),
              })}
            >
              <span className={styles.swatch} aria-hidden="true" />
              <span className={styles.legendLabel}>{p.label}</span>
              <strong className={styles.legendValue}>{p.count}</strong>
              <span className={styles.legendShare}>{percent(p.count, total)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
