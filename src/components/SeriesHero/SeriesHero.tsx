import type { ReactNode } from 'react'
import { imageUrl } from '../../api/tmdb'
import type { SeriesDetails } from '../../types/tmdb'
import { formatNumber, formatYearRange, pluralize } from '../../utils/format'
import Icon from '../Icon/Icon'
import RatingBadge from '../RatingBadge/RatingBadge'
import styles from './SeriesHero.module.css'

/** `actions` is a slot: the hero stays presentational, the page decides what goes there. */
interface SeriesHeroProps {
  series: SeriesDetails
  actions?: ReactNode
}

export default function SeriesHero({ series, actions }: SeriesHeroProps) {
  const backdrop = imageUrl(series.backdrop_path, 'w1280')
  const poster = imageUrl(series.poster_path, 'w342')

  const meta = [
    formatYearRange(series.first_air_date, series.last_air_date, series.in_production),
    series.number_of_seasons > 0 && pluralize(series.number_of_seasons, 'season'),
    series.number_of_episodes > 0 && pluralize(series.number_of_episodes, 'episode'),
    series.status,
  ].filter(Boolean)

  const creators = series.created_by.map((person) => person.name).join(', ')
  const networks = series.networks.map((network) => network.name).join(', ')

  return (
    <>
      <div className={styles.hero}>
        {backdrop && (
          <div className={styles.backdrop} style={{ backgroundImage: `url(${backdrop})` }} />
        )}

        <div className={styles.content}>
          <div className={styles.poster}>
            {poster ? (
              <img src={poster} alt={`${series.name} poster`} />
            ) : (
              <div className={styles.posterFallback}>
                <Icon name="tv" size={32} />
              </div>
            )}
          </div>

          <div className={styles.info}>
            {series.genres.length > 0 && (
              <ul className={styles.genres} aria-label="Genres">
                {series.genres.map((genre) => (
                  <li key={genre.id}>{genre.name}</li>
                ))}
              </ul>
            )}
            <div>
              <h1 className={styles.title}>{series.name}</h1>
              {series.original_name !== series.name && (
                <p className={styles.muted}>{series.original_name}</p>
              )}
            </div>
            {series.tagline && <p className={styles.tagline}>{series.tagline}</p>}

            <div className={styles.rating}>
              <RatingBadge value={series.vote_average} size="lg" votes={series.vote_count} />
              <span className={styles.muted}>
                {series.vote_count > 0
                  ? `${formatNumber(series.vote_count)} votes on TMDB`
                  : 'No votes yet'}
              </span>
            </div>
            <p className={styles.muted}>{meta.join(' · ')}</p>

            {actions && <div className={styles.actions}>{actions}</div>}
          </div>
        </div>
      </div>

      <div className={styles.about}>
        <p className={styles.overview}>{series.overview || 'No overview available yet.'}</p>
        {(creators || networks) && (
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
        )}
      </div>
    </>
  )
}
