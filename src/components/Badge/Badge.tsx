import type { ReactNode } from 'react'
import { cx } from '../../utils/cx'
import type { IconName } from '../Icon/icons'
import Icon from '../Icon/Icon'
import styles from './Badge.module.css'

interface BadgeProps {
  children: ReactNode
  icon?: IconName
  /** Success is always paired with an icon (✓), never colour alone. */
  tone?: 'success'
}

export default function Badge({ children, icon, tone }: BadgeProps) {
  return (
    <span className={cx(styles.badge, tone === 'success' && styles.success)}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  )
}
