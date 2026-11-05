import type { ReactNode } from 'react'
import { Link } from 'react-router'
import Icon from '../Icon/Icon'
import RatingBadge from '../RatingBadge/RatingBadge'
import styles from './PosterCard.module.css'

interface PosterCardProps {
  title: string
  href: string
  posterUrl: string | null
  year?: string | null
  /** Second meta line part: genres, "S2E5 · 40%"… */
  meta?: string
  rating?: number | null
  /** Top-right marker, e.g. the library status. */
  badge?: ReactNode
  /** 0…1, drawn as a thin bar at the bottom of the poster. */
  progress?: number
  /** Hover actions (Add, Plan) — buttons layered above the link. */
  actions?: ReactNode
}

export default function PosterCard({
  title,
  href,
  posterUrl,
  year,
  meta,
  rating,
  badge,
  progress,
  actions,
}: PosterCardProps) {
  const metaLine = [year, meta].filter(Boolean).join(' · ')

  return (
    <div className={styles.card}>
      <div className={styles.art}>
        {posterUrl ? (
          <img src={posterUrl} alt="" loading="lazy" />
        ) : (
          <div className={styles.placeholder}>
            <Icon name="film" size={28} />
            <span>{title}</span>
          </div>
        )}
        <div className={styles.badges}>
          {rating !== undefined ? <RatingBadge value={rating} /> : <span />}
          {badge}
        </div>
        {progress !== undefined && (
          <div
            className={styles.progress}
            role="progressbar"
            aria-label="Watched"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${progress * 100}%` }} />
          </div>
        )}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      <h3 className={styles.title}>{title}</h3>
      {metaLine && <p className={styles.meta}>{metaLine}</p>}
      <Link to={href} className={styles.link} aria-label={year ? `${title}, ${year}` : title} />
    </div>
  )
}
