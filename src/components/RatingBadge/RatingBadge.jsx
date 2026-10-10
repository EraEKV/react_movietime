import { formatRating, ratingTone } from '../../utils/format.js'
import styles from './RatingBadge.module.css'

export default function RatingBadge({ vote, size = 'md' }) {
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
