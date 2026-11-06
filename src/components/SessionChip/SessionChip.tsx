import { useTranslation } from 'react-i18next'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { imageUrl } from '../../shared/api/tmdb'
import type { PlanColor, SessionStatus } from '../../types/plan'
import { cx } from '../../shared/lib/cx'
import Icon from '../Icon/Icon'
import styles from './SessionChip.module.css'

interface SessionChipProps {
  color: PlanColor
  title: string
  /** "S2E5–E6" or a movie title. */
  range: string
  time?: string
  status?: SessionStatus
  posterPath?: string | null
  /** A dot instead of the poster thumb (tablet calendar, previews). */
  compact?: boolean
  /** Where the chip leads; without it the chip is a plain label. */
  to?: string
}

/**
 * One viewing session in calendars and agendas: plan colour tint, poster thumb, title,
 * episodes and time. Status is never colour-only: done is struck through with ✓, skipped
 * has a dashed border and the skip icon, and the accessible name says it in words.
 */
export default function SessionChip({
  color,
  title,
  range,
  time,
  status = 'pending',
  posterPath,
  compact = false,
  to,
}: SessionChipProps) {
  const { t } = useTranslation()
  const poster = imageUrl(posterPath, 'w92')
  const className = cx(styles.chip, styles[status], compact && styles.compact)
  const label = t(time ? 'session.labelAt' : 'session.label', {
    title,
    range,
    time,
    status: t(`session.${status}`),
  })
  const content = (
    <>
      {compact ? (
        <span className={styles.dot} aria-hidden="true" />
      ) : (
        <span className={styles.thumb} aria-hidden="true">
          {poster && <img src={poster} alt="" loading="lazy" />}
        </span>
      )}
      <span className={styles.body} aria-hidden="true">
        <span className={styles.title}>{title}</span>
        <span className={styles.meta}>{[range, time].filter(Boolean).join(' · ')}</span>
      </span>
      {status !== 'pending' && (
        <Icon name={status === 'done' ? 'check' : 'skip'} size={14} className={styles.icon} />
      )}
    </>
  )
  // The plan colour goes in as a custom property; the CSS mixes tint and border from it.
  const style = { '--plan': `var(--plan-${color})` } as CSSProperties

  return to ? (
    <Link to={to} className={className} style={style} aria-label={label}>
      {content}
    </Link>
  ) : (
    <span className={className} style={style} role="img" aria-label={label}>
      {content}
    </span>
  )
}
