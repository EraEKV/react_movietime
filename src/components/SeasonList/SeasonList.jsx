import { imageUrl } from '../../api/tmdb.js'
import { formatDate, pluralize } from '../../utils/format.js'
import RatingBadge from '../RatingBadge/RatingBadge.jsx'
import styles from './SeasonList.module.css'

export default function SeasonList({ seasons }) {
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
                {[pluralize(season.episode_count, 'episode'), formatDate(season.air_date)]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <RatingBadge vote={season.vote_average} size="sm" />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
