import { cx } from '../../utils/cx'
import { formatNumber } from '../../utils/format'
import { RATING_WORDS, ratingStep } from '../../utils/rating'
import styles from './RatingBadge.module.css'

interface RatingBadgeProps {
  /** 0–10; null/0 means not rated. */
  value: number | null | undefined
  size?: 'sm' | 'lg'
  votes?: number
}

export default function RatingBadge({ value, size = 'sm', votes }: RatingBadgeProps) {
  const step = ratingStep(value)
  const word = RATING_WORDS[step]
  const label = step === 0 || !value ? word : `Rated ${value.toFixed(1)} of 10, ${word}`

  return (
    <span
      className={cx(styles.badge, styles[`step${step}`], size === 'lg' && styles.lg)}
      role="img"
      aria-label={label}
      title={votes ? `${word} · ${formatNumber(votes)} votes` : word}
    >
      {step === 0 || !value ? '—' : value.toFixed(1)}
    </span>
  )
}
