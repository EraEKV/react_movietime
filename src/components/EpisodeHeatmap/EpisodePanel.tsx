import { imageUrl } from '../../api/tmdb'
import { episodeCode, formatDate, formatNumber } from '../../utils/format'
import type { Episode } from '../../hooks/useEpisodeRatings'
import RatingBadge from '../RatingBadge/RatingBadge'
import styles from './EpisodeHeatmap.module.css'

interface EpisodePanelProps {
  episode: Episode
  onClose: () => void
}

export default function EpisodePanel({ episode, onClose }: EpisodePanelProps) {
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
          <RatingBadge value={episode.rating} />
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
