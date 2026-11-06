import { useTranslation } from 'react-i18next'
import { useId } from 'react'
import Icon from '../../shared/ui/Icon/Icon'
import styles from './ProgressRing.module.css'
import type { PlanColor } from '../../types/plan'

interface ProgressRingProps {
  /** 0…1 */
  value: number
  size?: number
  stroke?: number
  label?: string
  /** A plan's calendar colour (`--plan-N`) instead of the brand gradient. */
  color?: PlanColor
}

/** Circular progress: the brand gradient (or a plan colour) fills the ring, the percentage sits in the middle. */
export default function ProgressRing({
  value,
  size = 48,
  stroke = 5,
  label,
  color,
}: ProgressRingProps) {
  const { t } = useTranslation()
  // Several rings on one page need different gradient ids; useId gives each a unique one.
  const gradientId = useId()
  const v = Math.max(0, Math.min(1, value))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  return (
    <span
      className={styles.ring}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label ?? t('ui.progress')}
      aria-valuenow={Math.round(v * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id={gradientId}>
            <stop offset="0" stopColor="var(--brand-teal)" />
            <stop offset="1" stopColor="var(--brand-lime)" />
          </linearGradient>
        </defs>
        <circle className={styles.track} cx={center} cy={center} r={radius} strokeWidth={stroke} />
        {/* The dash is the whole circle; shifting it by the unfilled part draws the progress. */}
        <circle
          className={styles.fill}
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={stroke}
          stroke={color ? `var(--plan-${color})` : `url(#${gradientId})`}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - v)}
        />
      </svg>
      <span className={styles.value} style={{ fontSize: size < 44 ? 10 : 12 }} aria-hidden="true">
        {v >= 1 ? <Icon name="check" size={16} /> : `${Math.round(v * 100)}%`}
      </span>
    </span>
  )
}
