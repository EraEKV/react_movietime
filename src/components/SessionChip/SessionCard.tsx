import { useTranslation } from 'react-i18next'
import type { CSSProperties } from 'react'
import { imageUrl } from '../../shared/api/tmdb'
import type { PlanColor, SessionStatus } from '../../types/plan'
import { formatDay } from '../../utils/calendar'
import Icon from '../../shared/ui/Icon/Icon'
import styles from './SessionCard.module.css'

interface SessionCardProps {
  color: PlanColor
  title: string
  range: string
  date: string
  time?: string
  status: SessionStatus
  posterPath?: string | null
}

/** The full details of a session, shown in a hover card: nothing is cut off here. */
export default function SessionCard({
  color,
  title,
  range,
  date,
  time,
  status,
  posterPath,
}: SessionCardProps) {
  const { t } = useTranslation()
  const poster = imageUrl(posterPath, 'w92')
  const when = formatDay(date, { weekday: 'long', month: 'long', day: 'numeric' })
  return (
    <div className={styles.card} style={{ '--plan': `var(--plan-${color})` } as CSSProperties}>
      {poster && (
        <span className={styles.poster}>
          <img src={poster} alt="" />
        </span>
      )}
      <div className={styles.text}>
        <strong className={styles.title}>{title}</strong>
        {range && <span className={styles.range}>{range}</span>}
        <span className={styles.when}>{[when, time].filter(Boolean).join(' · ')}</span>
        <span className={styles.status}>
          {status !== 'pending' && <Icon name={status === 'done' ? 'check' : 'skip'} size={14} />}
          {t(`session.${status}`)}
        </span>
      </div>
    </div>
  )
}
