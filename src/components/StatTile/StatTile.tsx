import type { ReactNode } from 'react'
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
}

/** A big number with its label: plan preview now, dashboard and profile later. */
export default function StatTile({
  label,
  value,
  unit,
  icon,
  detail,
  loading,
  size = 'md',
}: StatTileProps) {
  return (
    <div className={styles.tile} data-size={size}>
      <div className={styles.top}>
        <span>{label}</span>
        {icon && <Icon name={icon} size={18} />}
      </div>
      {loading ? (
        <Skeleton width="60%" height={size === 'sm' ? 28 : 40} />
      ) : (
        <div className={styles.value}>
          {value}
          {unit && <small>{unit}</small>}
        </div>
      )}
      {detail && <div className={styles.detail}>{detail}</div>}
    </div>
  )
}
