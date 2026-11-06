import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { Bar } from '../../utils/stats'
import styles from './Dashboard.module.css'

interface BarListProps {
  bars: Bar[]
  /** Where a bar leads: the library filtered by that bar's value. */
  hrefOf: (value: string) => string
}

/**
 * Ranked horizontal bars, one hue. Every bar is a link with its name and number printed
 * as text, so nothing is told by colour or length alone and no tooltip is needed to read
 * a value. Bar length is relative to the largest bar in the list.
 */
export default function BarList({ bars, hrefOf }: BarListProps) {
  const { t } = useTranslation('dashboard')
  const max = Math.max(1, ...bars.map((b) => b.count))
  return (
    <ul className={styles.bars}>
      {bars.map((bar) => (
        <li key={bar.value}>
          <Link
            to={hrefOf(bar.value)}
            className={styles.barRow}
            aria-label={t('chart.bar', { label: bar.label, count: bar.count })}
          >
            <span className={styles.barLabel}>{bar.label}</span>
            <span className={styles.track} aria-hidden="true">
              {bar.count > 0 && (
                <span className={styles.fill} style={{ width: `${(bar.count / max) * 100}%` }} />
              )}
            </span>
            <span className={styles.barValue} aria-hidden="true">
              {bar.count}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
