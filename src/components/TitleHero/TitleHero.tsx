import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { imageUrl } from '../../shared/api/tmdb'
import { useImageFailed } from '../../shared/hooks/useImageFailed'
import type { Genre } from '../../types/tmdb'
import Chip from '../../shared/ui/Chip/Chip'
import Icon from '../../shared/ui/Icon/Icon'
import type { IconName } from '../../shared/ui/Icon/icons'
import RatingBadge from '../../shared/ui/RatingBadge/RatingBadge'
import styles from './TitleHero.module.css'

export interface TitleFact {
  label: string
  value: string
}

/**
 * Backdrop hero + overview for any title. The detail pages map their TMDB response
 * to these props, so the hero doesn't know whether it shows a movie or a series.
 * `actions` is a slot: the hero stays presentational, the page decides what goes there.
 */
interface TitleHeroProps {
  title: string
  originalTitle?: string
  tagline?: string
  posterPath: string | null
  backdropPath: string | null
  /** Shown when there is no poster. */
  fallbackIcon: IconName
  genres: Genre[]
  /** Where a genre chip leads: the catalog filtered by that genre. */
  genreTo: (genreId: number) => string
  rating: number
  votes: number
  /** "1999 · 2h 16m · Released" — falsy parts are skipped. */
  meta: (string | null | false | undefined)[]
  overview: string
  facts?: TitleFact[]
  actions?: ReactNode
}

export default function TitleHero({
  title,
  originalTitle,
  tagline,
  posterPath,
  backdropPath,
  fallbackIcon,
  genres,
  genreTo,
  rating,
  votes,
  meta,
  overview,
  facts = [],
  actions,
}: TitleHeroProps) {
  const { t } = useTranslation()
  const backdrop = imageUrl(backdropPath, 'w1280')
  const poster = imageUrl(posterPath, 'w342')
  const posterState = useImageFailed(poster)
  const metaLine = meta.filter(Boolean).join(' · ')

  return (
    <>
      <div className={styles.hero}>
        {backdrop && (
          <div className={styles.backdrop} style={{ backgroundImage: `url(${backdrop})` }} />
        )}

        <div className={styles.content}>
          <div className={styles.poster}>
            {!posterState.failed ? (
              <img
                src={poster ?? ''}
                alt={t('title.poster', { title })}
                onError={posterState.onError}
              />
            ) : (
              <div className={styles.posterFallback}>
                <Icon name={fallbackIcon} size={32} />
              </div>
            )}
          </div>

          <div className={styles.info}>
            {genres.length > 0 && (
              <ul className={styles.genres} aria-label={t('title.genres')}>
                {genres.map((genre) => (
                  <li key={genre.id}>
                    <Chip to={genreTo(genre.id)}>{genre.name}</Chip>
                  </li>
                ))}
              </ul>
            )}
            <div>
              <h1 className={styles.title}>{title}</h1>
              {originalTitle && originalTitle !== title && (
                <p className={styles.muted}>{originalTitle}</p>
              )}
            </div>
            {tagline && <p className={styles.tagline}>{tagline}</p>}

            <div className={styles.rating}>
              <RatingBadge value={rating} size="lg" votes={votes} />
              <span className={styles.muted}>
                {votes > 0 ? t('title.votes', { count: votes }) : t('title.noVotes')}
              </span>
            </div>
            {metaLine && <p className={styles.muted}>{metaLine}</p>}

            {actions && <div className={styles.actions}>{actions}</div>}
          </div>
        </div>
      </div>

      <div className={styles.about}>
        <p className={styles.overview}>{overview || t('title.noOverview')}</p>
        {facts.length > 0 && (
          <dl className={styles.facts}>
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </>
  )
}
