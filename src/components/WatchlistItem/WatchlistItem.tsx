import { Link } from 'react-router'
import { imageUrl } from '../../api/tmdb'
import type { WatchlistEntry, WatchStatus } from '../../types/watchlist'
import { cx } from '../../utils/cx'
import { formatDate, getYear } from '../../utils/format'
import { WATCH_STATUSES } from '../../utils/watchlist'
import Button from '../Button/Button'
import ButtonLink from '../ButtonLink/ButtonLink'
import Icon from '../Icon/Icon'
import RatingBadge from '../RatingBadge/RatingBadge'
import SelectField from '../SelectField/SelectField'
import StatusMarker from '../StatusMarker/StatusMarker'
import styles from './WatchlistItem.module.css'

interface WatchlistItemProps {
  entry: WatchlistEntry
  onStatusChange: (id: string, status: WatchStatus) => void
  onRemove: (id: string) => void
}

export default function WatchlistItem({ entry, onStatusChange, onRemove }: WatchlistItemProps) {
  const poster = imageUrl(entry.posterPath, 'w185')
  const year = getYear(entry.firstAirDate)

  return (
    <article className={cx(styles.item, entry.status === 'dropped' && styles.dropped)}>
      {/* Decorative duplicate of the title link: hidden from keyboard and screen readers. */}
      <Link
        to={`/series/${entry.seriesId}`}
        className={styles.poster}
        tabIndex={-1}
        aria-hidden="true"
      >
        {poster ? <img src={poster} alt="" loading="lazy" /> : <Icon name="tv" size={24} />}
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
          <StatusMarker status={entry.status} />
          <span className={styles.score}>
            You <RatingBadge value={entry.score} />
          </span>
          <span className={styles.score}>
            TMDB <RatingBadge value={entry.tmdbRating} />
          </span>
        </div>

        {entry.notes && <p className={styles.notes}>{entry.notes}</p>}

        <div className={styles.actions}>
          <SelectField
            label={`Status of ${entry.name}`}
            hideLabel
            className={styles.status}
            value={entry.status}
            options={WATCH_STATUSES}
            onChange={(value) => onStatusChange(entry.id, value)}
          />
          <ButtonLink
            to={`/library/${entry.id}/edit`}
            variant="ghost"
            size="sm"
            icon="edit"
            aria-label={`Edit ${entry.name}`}
          >
            Edit
          </ButtonLink>
          <Button
            variant="ghost"
            size="sm"
            icon="trash"
            onClick={() => onRemove(entry.id)}
            aria-label={`Remove ${entry.name}`}
          >
            Remove
          </Button>
        </div>
      </div>
    </article>
  )
}
