import { Link } from 'react-router'
import { imageUrl } from '../../api/tmdb.js'
import { formatDate, getYear } from '../../utils/format.js'
import { WATCH_STATUSES } from '../../utils/watchlist.js'
import RatingBadge from '../RatingBadge/RatingBadge.jsx'
import styles from './WatchlistItem.module.css'

export default function WatchlistItem({ entry, onStatusChange, onRemove }) {
  const poster = imageUrl(entry.posterPath, 'w185')
  const year = getYear(entry.firstAirDate)

  return (
    <article className={styles.item}>
      <Link to={`/series/${entry.seriesId}`} className={styles.poster} tabIndex={-1}>
        {poster ? <img src={poster} alt="" loading="lazy" /> : <span>{entry.name}</span>}
      </Link>

      <div className={styles.body}>
        <div className={styles.top}>
          <h3 className={styles.title}>
            <Link to={`/series/${entry.seriesId}`}>{entry.name}</Link>
          </h3>
          <p className={styles.meta}>
            {[year, `added ${formatDate(entry.addedAt)}`].filter(Boolean).join(' · ')}
          </p>
        </div>

        <div className={styles.scores}>
          <span className={styles.scoreLabel}>You</span>
          <RatingBadge vote={entry.score} size="sm" />
          <span className={styles.scoreLabel}>TMDB</span>
          <RatingBadge vote={entry.tmdbRating} size="sm" />
        </div>

        {entry.notes && <p className={styles.notes}>{entry.notes}</p>}

        <div className={styles.actions}>
          <label className={styles.srOnly} htmlFor={`status-${entry.id}`}>
            Status of {entry.name}
          </label>
          <select
            id={`status-${entry.id}`}
            className={styles.status}
            data-status={entry.status}
            value={entry.status}
            onChange={(e) => onStatusChange(entry.id, e.target.value)}
          >
            {WATCH_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <Link to={`/watchlist/${entry.id}/edit`} className={styles.action}>
            Edit
          </Link>
          <button type="button" className={styles.action} onClick={() => onRemove(entry.id)}>
            Remove
          </button>
        </div>
      </div>
    </article>
  )
}
