import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { IconName } from '../Icon/icons'
import Icon from '../Icon/Icon'
import Skeleton from '../Skeleton/Skeleton'
import styles from './StatTile.module.css'

interface StatTileProps {
  label: string
  value: ReactNode
  unit?: string
  icon?: IconName
  detail?: ReactNode
  loading?: boolean
  /** Smaller numeral for narrow tiles (live preview). */
  size?: 'md' | 'sm'
  /** Deep link (e.g. the filtered library): the tile becomes a real link. */
  to?: string
  /** An action in place: the tile becomes a button. Ignored when `to` is set. */
  onClick?: () => void
}

/**
 * A big number with its label: dashboard, profile counters and the plan preview.
 * A tile that leads somewhere is a <Link> (open in new tab works), one that acts is a
 * <button>; a plain tile stays a <div>. While loading the value is a skeleton and the
 * tile is not clickable yet, so nobody opens a page for a number they haven't seen.
 */
export default function StatTile({
  label,
  value,
  unit,
  icon,
  detail,
  loading,
  size = 'md',
  to,
  onClick,
}: StatTileProps) {
  const content = (
    <>
      <span className={styles.top}>
        <span>{label}</span>
        {icon && <Icon name={icon} size={18} />}
      </span>
      {loading ? (
        <Skeleton width="60%" height={size === 'sm' ? 28 : 40} />
      ) : (
        <span className={styles.value}>
          {value}
          {unit && <small>{unit}</small>}
        </span>
      )}
      {detail && !loading && <span className={styles.detail}>{detail}</span>}
    </>
  )

  if (loading) {
    return (
      <div className={styles.tile} data-size={size} aria-busy="true">
        {content}
      </div>
    )
  }
  if (to) {
    return (
      <Link to={to} className={styles.tile} data-size={size} data-interactive="">
        {content}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button
        type="button"
        className={styles.tile}
        data-size={size}
        data-interactive=""
        onClick={onClick}
      >
        {content}
      </button>
    )
  }
  return (
    <div className={styles.tile} data-size={size}>
      {content}
    </div>
  )
}
