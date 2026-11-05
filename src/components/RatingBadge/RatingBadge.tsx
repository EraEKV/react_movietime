import { formatRating, ratingTone } from '../../utils/format'
import styles from './RatingBadge.module.css'

interface RatingBadgeProps {
  vote: number | null | undefined
  size?: 'sm' | 'md'
}

export default function RatingBadge({ vote, size = 'md' }: RatingBadgeProps) {
  return (
    <span
      className={`${styles.badge} ${styles[size]}`}
      data-tone={ratingTone(vote)}
      title={vote ? `TMDB rating ${formatRating(vote)} / 10` : 'Not rated yet'}
    >
      {formatRating(vote)}
    </span>
  )
}
