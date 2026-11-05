import type { ReactNode } from 'react'
import type { IconName } from '../Icon/icons'
import Icon from '../Icon/Icon'
import styles from './EmptyState.module.css'

interface EmptyStateProps {
  icon?: IconName
  title: string
  /** What will appear here once there is data. */
  body?: ReactNode
  /** The one action that fills this place. */
  actions?: ReactNode
  headingLevel?: 'h2' | 'h3'
}

export default function EmptyState({
  icon = 'film',
  title,
  body,
  actions,
  headingLevel: Heading = 'h2',
}: EmptyStateProps) {
  return (
    <div className={styles.state} role="status">
      <div className={styles.icon}>
        <Icon name={icon} size={28} />
      </div>
      <Heading className={styles.title}>{title}</Heading>
      {body && <p className={styles.body}>{body}</p>}
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  )
}
