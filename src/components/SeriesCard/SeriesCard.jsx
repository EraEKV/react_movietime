import { Link } from 'react-router'
import { imageUrl } from '../../api/tmdb.js'
import { getYear } from '../../utils/format.js'
import RatingBadge from '../RatingBadge/RatingBadge.jsx'
import styles from './SeriesCard.module.css'

export default function SeriesCard({ series, genreNames = [] }) {
  const poster = imageUrl(series.poster_path)
  const year = getYear(series.first_air_date)

  return (
    <Link to={`/series/${series.id}`} className={styles.card}>
      <div className={styles.poster}>
        {poster ? (
          <img src={poster} alt={`${series.name} poster`} loading="lazy" />
        ) : (
          <span className={styles.noPoster}>{series.name}</span>
        )}
        <div className={styles.rating}>
          <RatingBadge vote={series.vote_average} size="sm" />
        </div>
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{series.name}</h3>
        <p className={styles.meta}>
          {[year, ...genreNames.slice(0, 2)].filter(Boolean).join(' · ') || 'Unknown'}
        </p>
      </div>
    </Link>
  )
}
