import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import type { MediaType } from '../../types/media'
import type { Bar } from '../../utils/stats'
import styles from './Dashboard.module.css'

const COLOR: Record<MediaType, string> = { tv: 'var(--chart-1)', movie: 'var(--chart-2)' }

const percent = (count: number, total: number) =>
  total ? `${Math.round((count / total) * 100)}%` : '0%'

/**
 * Movies vs series: one thin bar split in two, with the figures beside it. The legend rows
 * carry name, count and share as text and link to the library filtered by type; the bar
 * itself is a picture of the same numbers (role="img" with the summary as its name).
 */
export default function SplitBar({ parts }: { parts: Bar<MediaType>[] }) {
  const total = parts.reduce((sum, p) => sum + p.count, 0)
  const summary = parts.map((p) => `${p.label} ${p.count} (${percent(p.count, total)})`).join(', ')
  return (
    <div className={styles.split}>
      <div className={styles.splitBar} role="img" aria-label={summary}>
        {parts
          .filter((p) => p.count > 0)
          .map((p) => (
            <span
              key={p.value}
              className={styles.segment}
              style={{ flexGrow: p.count, background: COLOR[p.value] }}
            />
          ))}
      </div>
      <ul className={styles.legend}>
        {parts.map((p) => (
          <li key={p.value}>
            <Link
              to={`/library?type=${p.value}`}
              className={styles.legendRow}
              style={{ '--swatch': COLOR[p.value] } as CSSProperties}
              aria-label={`${p.label}: ${p.count}, ${percent(p.count, total)}. Open in library`}
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
