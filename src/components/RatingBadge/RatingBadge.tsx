import { useTranslation } from 'react-i18next'
import { cx } from '../../shared/lib/cx'
import { formatRating } from '../../shared/lib/format'
import { ratingStep, ratingWord } from '../../shared/lib/rating'
import styles from './RatingBadge.module.css'

interface RatingBadgeProps {
  /** 0–10; null/0 means not rated. */
  value: number | null | undefined
  size?: 'sm' | 'lg'
  votes?: number
}

export default function RatingBadge({ value, size = 'sm', votes }: RatingBadgeProps) {
  const { t } = useTranslation()
  const step = ratingStep(value)
  const word = ratingWord(step)
  const label =
    step === 0 || !value ? word : t('rating.label', { value: formatRating(value), word })

  return (
    <span
      className={cx(styles.badge, styles[`step${step}`], size === 'lg' && styles.lg)}
      role="img"
      aria-label={label}
      title={votes ? t('rating.votes', { word, count: votes }) : word}
    >
      {step === 0 || !value ? '—' : formatRating(value)}
    </span>
  )
}
