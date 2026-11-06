import { useTranslation } from 'react-i18next'
import { imageUrl } from '../../shared/api/tmdb'
import { formatDate } from '../../shared/lib/format'
import RatingBadge from '../../shared/ui/RatingBadge/RatingBadge'
import type { SeasonSummary } from '../../types/tmdb'
import styles from './SeasonList.module.css'

export default function SeasonList({ seasons }: { seasons: SeasonSummary[] }) {
  const { t } = useTranslation()
  return (
    <ul className={styles.list}>
      {seasons.map((season) => {
        const poster = imageUrl(season.poster_path, 'w185')
        return (
          <li key={season.id} className={styles.season}>
            <div className={styles.poster}>
              {poster ? (
                <img src={poster} alt="" loading="lazy" />
              ) : (
                <span>S{season.season_number}</span>
              )}
            </div>
            <div className={styles.body}>
              <h3 className={styles.name}>{season.name}</h3>
              <p className={styles.meta}>
                {[t('count.episodes', { count: season.episode_count }), formatDate(season.air_date)]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <RatingBadge value={season.vote_average} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
