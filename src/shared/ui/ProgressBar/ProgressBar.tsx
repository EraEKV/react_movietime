import type { ReactNode } from 'react'
import styles from './ProgressBar.module.css'

interface ProgressBarProps {
  /** 0…1 */
  value: number
  label?: string
  caption?: ReactNode
  showValue?: boolean
}

export default function ProgressBar({
  value,
  label = 'Progress',
  caption,
  showValue = false,
}: ProgressBarProps) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div className={styles.progress}>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className={styles.fill} style={{ width: `${percent}%` }} />
      </div>
      {(caption || showValue) && (
        <div className={styles.caption}>
          <span>{caption}</span>
          {showValue && <span>{percent}%</span>}
        </div>
      )}
    </div>
  )
}
