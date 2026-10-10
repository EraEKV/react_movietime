import { imageUrl } from '../../api/tmdb.js'
import { episodeCode, formatDate, formatNumber } from '../../utils/format.js'
import RatingBadge from '../RatingBadge/RatingBadge.jsx'
import styles from './EpisodeHeatmap.module.css'

export default function EpisodePanel({ episode, onClose }) {
  const still = imageUrl(episode.still, 'w300')
  const meta = [
    formatDate(episode.airDate),
    episode.runtime && `${episode.runtime} min`,
    episode.votes > 0 && `${formatNumber(episode.votes)} votes`,
  ].filter(Boolean)

  return (
    <div className={styles.panel} aria-live="polite">
      {still && <img className={styles.still} src={still} alt="" />}
      <div className={styles.panelBody}>
        <p className={styles.code}>{episodeCode(episode.season, episode.number)}</p>
        <h3 className={styles.panelTitle}>{episode.name}</h3>
        <div className={styles.panelMeta}>
          <RatingBadge vote={episode.rating} size="sm" />
          <span>{meta.join(' · ')}</span>
        </div>
        <p className={styles.overview}>{episode.overview || 'No overview available.'}</p>
      </div>
      <button type="button" className={styles.close} onClick={onClose} aria-label="Close episode">
        ×
      </button>
    </div>
  )
}
