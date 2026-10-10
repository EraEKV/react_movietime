import { imageUrl } from '../../api/tmdb.js'
import { formatNumber, formatYearRange, pluralize } from '../../utils/format.js'
import RatingBadge from '../RatingBadge/RatingBadge.jsx'
import styles from './SeriesHero.module.css'

export default function SeriesHero({ series }) {
  const backdrop = imageUrl(series.backdrop_path, 'w1280')
  const poster = imageUrl(series.poster_path, 'w500')

  const meta = [
    formatYearRange(series.first_air_date, series.last_air_date, series.in_production),
    series.number_of_seasons > 0 && pluralize(series.number_of_seasons, 'season'),
    series.number_of_episodes > 0 && pluralize(series.number_of_episodes, 'episode'),
    series.status,
  ].filter(Boolean)

  const creators = series.created_by.map((person) => person.name).join(', ')
  const networks = series.networks.map((network) => network.name).join(', ')

  return (
    <div className={styles.hero}>
      {backdrop && (
        <div className={styles.backdrop} style={{ backgroundImage: `url(${backdrop})` }} />
      )}

      <div className={styles.content}>
        <div className={styles.poster}>
          {poster ? <img src={poster} alt={`${series.name} poster`} /> : <span>{series.name}</span>}
        </div>

        <div className={styles.info}>
          <h1 className={styles.title}>{series.name}</h1>
          {series.original_name !== series.name && (
            <p className={styles.original}>{series.original_name}</p>
          )}
          {series.tagline && <p className={styles.tagline}>{series.tagline}</p>}

          <p className={styles.meta}>{meta.join(' · ')}</p>

          <div className={styles.rating}>
            <RatingBadge vote={series.vote_average} />
            <span className={styles.votes}>
              {series.vote_count > 0
                ? `${formatNumber(series.vote_count)} votes on TMDB`
                : 'No votes yet'}
            </span>
          </div>

          {series.genres.length > 0 && (
            <ul className={styles.genres}>
              {series.genres.map((genre) => (
                <li key={genre.id}>{genre.name}</li>
              ))}
            </ul>
          )}

          <p className={styles.overview}>{series.overview || 'No overview available yet.'}</p>

          <dl className={styles.facts}>
            {creators && (
              <div>
                <dt>Created by</dt>
                <dd>{creators}</dd>
              </div>
            )}
            {networks && (
              <div>
                <dt>Network</dt>
                <dd>{networks}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  )
}
