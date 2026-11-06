import { useTranslation } from 'react-i18next'
import { imageUrl } from '../../shared/api/tmdb'
import { episodeCode, formatDate, formatRuntime } from '../../shared/lib/format'
import type { Episode } from '../../hooks/useEpisodeRatings'
import IconButton from '../../shared/ui/IconButton/IconButton'
import RatingBadge from '../../shared/ui/RatingBadge/RatingBadge'
import styles from './EpisodeHeatmap.module.css'

interface EpisodePanelProps {
  episode: Episode
  onClose: () => void
}

export default function EpisodePanel({ episode, onClose }: EpisodePanelProps) {
  const { t } = useTranslation('catalog')
  const still = imageUrl(episode.still, 'w300')
  const meta = [
    formatDate(episode.airDate),
    formatRuntime(episode.runtime),
    episode.votes > 0 && t('heatmap.votes', { count: episode.votes }),
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
        <p className={styles.overview}>{episode.overview || t('heatmap.noOverview')}</p>
      </div>
      <IconButton icon="x" label={t('heatmap.close')} className={styles.close} onClick={onClose} />
    </div>
  )
}
